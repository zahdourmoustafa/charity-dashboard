import { action } from "./_generated/server";
import { v } from "convex/values";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { classifyQuery } from "./lib/queryClassifier";
import { hybridSearch } from "./lib/hybridSearch";

const SYSTEM_PROMPT = `Du bist ein Qualitätsmanagement-Assistent für Zahnarztpraxen (LZK Baden-Württemberg).

WICHTIGE REGELN:
1. Beantworte Fragen NUR anhand der bereitgestellten Dokumente
2. Bei LOCATION-Fragen (Wo finde ich...?):
   - Wenn "Verfügbare Dokumente" aufgelistet sind, antworte: "Das Dokument '[Name]' ist in der Dokumentenliste verfügbar."
   - Gib den genauen Dokumentnamen an
3. Bei CONTENT-Fragen (Wie, Was, Wann...?):
   - Beantworte basierend auf "Dokumentinhalte"
   - Zitiere ALLE verwendeten Quellen am Ende
4. Bei "Ähnliche Dokumente": Frage "Meinten Sie: [Liste]?"
5. Wenn nichts gefunden: "Diese Information finde ich nicht. Bitte wende dich an die Praxisleitung."
6. Halte Antworten präzise (3-7 Sätze)
7. Verwende einfache, klare Sprache
8. Verwende Aufzählungen (•) für Anleitungen

ANTWORTFORMAT:
[Klare Antwort auf Deutsch]

[Schritte falls zutreffend]

Quellen:
[1] Dokumentname, Seite X
[2] Dokumentname, Seite Y
[3] Dokumentname, Seite Z

WICHTIG: Liste ALLE Dokumente auf, die du für die Antwort verwendet hast. Nummeriere sie [1], [2], [3], etc.

KONTEXT:
{context}

Beantworte die folgende Frage basierend auf dem Kontext:`;

export const chat = action({
  args: {
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // Step 1: Classify query intent
    const classified = classifyQuery(args.message);
    console.log("Query Classification:", classified);
    
    // Step 2: Perform hybrid search
    const searchResults = await hybridSearch(
      ctx,
      classified.rewrittenQuery,
      classified.intent
    );
    console.log("Search Results:", {
      documentMatches: searchResults.documentMatches.length,
      contentMatches: searchResults.contentMatches.length,
    });
    
    // Step 3: Build context based on intent
    let context = "";
    const sources: Array<{ 
      title: string; 
      entryId: string;
      chunkText: string;
      pageNumber?: number;
    }> = [];
    
    // For location queries, prioritize document matches
    if (classified.intent === "location" || classified.intent === "action") {
      if (searchResults.documentMatches.length > 0) {
        context += "--- Verfügbare Dokumente ---\n";
        searchResults.documentMatches.forEach((doc) => {
          context += `• ${doc.title} (${doc.fileType.toUpperCase()}) [${doc.matchType} match, score: ${doc.score.toFixed(2)}]\n`;
        });
        context += "\n";
        
        // Add document matches as sources (only if they have content)
        searchResults.documentMatches.forEach((doc) => {
          const contentMatch = searchResults.contentMatches.find(c => c.title === doc.title);
          if (contentMatch) {
            sources.push(contentMatch);
          }
          // Don't create placeholder sources - they can't be opened
        });
      } else if (searchResults.contentMatches.length > 0) {
        // Fallback to content if no document matches
        context += "--- Verfügbare Dokumente ---\n";
        const uniqueTitles = new Set<string>();
        searchResults.contentMatches.forEach((match) => {
          if (!uniqueTitles.has(match.title)) {
            uniqueTitles.add(match.title);
            context += `• ${match.title}\n`;
          }
        });
        context += "\n";
        sources.push(...searchResults.contentMatches);
      } else {
        context = "Keine relevanten Dokumente gefunden.";
      }
    }
    
    // For content queries, include document content
    if (classified.intent === "content") {
      if (searchResults.contentMatches.length > 0) {
        // Add document titles first
        const uniqueTitles = new Set<string>();
        searchResults.contentMatches.forEach((match) => {
          uniqueTitles.add(match.title);
        });
        
        if (uniqueTitles.size > 0) {
          context += "--- Verfügbare Dokumente ---\n";
          uniqueTitles.forEach((title) => {
            context += `• ${title}\n`;
          });
          context += "\n";
        }
        
        // Add content
        context += "--- Dokumentinhalte ---\n";
        searchResults.contentMatches.forEach((match, idx) => {
          context += `\n[${match.title}${match.pageNumber ? `, Seite ${match.pageNumber}` : ''}]\n`;
          context += `${match.chunkText}\n`;
          
          // Add to sources
          sources.push(match);
        });
      } else if (searchResults.documentMatches.length > 0) {
        // Found documents but no content
        context += "--- Verfügbare Dokumente ---\n";
        searchResults.documentMatches.forEach((doc) => {
          context += `• ${doc.title}\n`;
        });
        context += "\nHinweis: Dokumente gefunden, aber keine spezifischen Inhalte zur Frage.\n";
      } else {
        context = "Keine relevanten Dokumente gefunden.";
      }
    }
    
    // Step 4: Generate AI response
    const prompt = SYSTEM_PROMPT.replace("{context}", context);
    
    try {
      const result = await streamText({
        model: openai("gpt-4o-mini"),
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: args.message },
        ],
        temperature: 0.3,
      });
      
      const fullResponse = await result.text;
      
      // Step 1: Filter out invalid sources FIRST (sources without entryId can't be opened)
      const validSources = sources.filter(source => source.entryId !== "");
      
      // Step 2: Deduplicate by title + page number
      const uniqueSources = new Map<string, typeof validSources[0]>();
      validSources.forEach(source => {
        const key = `${source.title}-${source.pageNumber || 'no-page'}`;
        if (!uniqueSources.has(key)) {
          uniqueSources.set(key, source);
        }
      });
      
      // Step 3: Return up to 5 unique, valid sources
      const finalSources = Array.from(uniqueSources.values()).slice(0, 5);
      
      return {
        response: fullResponse,
        sources: finalSources,
        metadata: {
          intent: classified.intent,
          documentMatches: searchResults.documentMatches.length,
          contentMatches: searchResults.contentMatches.length,
        },
      };
    } catch (error) {
      console.error("OpenAI API error:", error);
      return {
        response: "Entschuldigung, es gab einen Fehler bei der Verarbeitung Ihrer Anfrage. Bitte versuchen Sie es später erneut.",
        sources: [],
        metadata: {
          intent: classified.intent,
          documentMatches: 0,
          contentMatches: 0,
        },
      };
    }
  },
});
