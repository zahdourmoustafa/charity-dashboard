import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { rag } from "./rag";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

const SYSTEM_PROMPT = `Du bist ein Qualitätsmanagement-Assistent für Zahnarztpraxen (LZK Baden-Württemberg).

WICHTIGE REGELN:
1. Beantworte Fragen NUR anhand der bereitgestellten Dokumente
2. Wenn unter "Verfügbare Dokumente" ein passendes Dokument aufgelistet ist, sage: "Das Dokument '[Name]' ist in der Dokumentenliste verfügbar."
3. Wenn Dokumentinhalte vorhanden sind, beantworte die Frage basierend auf dem Inhalt
4. Wenn keine relevanten Dokumente gefunden wurden, sage: "Diese Information finde ich nicht in den verfügbaren Dokumenten. Bitte wende dich an die Praxisleitung."
5. Gib IMMER die Quelle an: [Dokumentname, Seite X]
6. Halte Antworten präzise (3-7 Sätze)
7. Verwende einfache, klare Sprache für Praxispersonal
8. Verwende Aufzählungen (•) für Schritt-für-Schritt-Anleitungen

ANTWORTFORMAT:
[Klare Antwort auf Deutsch]

[Schritte falls zutreffend]

📄 Quelle: [Dokumentname, Seite X]

KONTEXT:
{context}

Beantworte die folgende Frage basierend auf dem Kontext:`;

export const chat = action({
  args: {
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // Step 1: Search document titles
    const titleResults = await ctx.runQuery(api.documents.searchTitles, {
      query: args.message,
    });

    // Step 2: Search documents using RAG
    const searchResults = await rag.search(ctx, {
      namespace: "practice",
      query: args.message,
      limit: 5,
      vectorScoreThreshold: 0.5,
    });

    // Step 3: Build context from search results
    let context = "";
    const sources: Array<{ title: string; entryId: string }> = [];

    // Add available documents from title search
    if (titleResults.length > 0) {
      context += "--- Verfügbare Dokumente ---\n";
      titleResults.forEach((doc) => {
        context += `• ${doc.title} (${doc.fileType.toUpperCase()})\n`;
      });
      context += "\n";
    }

    // Add document content from RAG search
    if (searchResults.results.length === 0) {
      if (titleResults.length === 0) {
        context += "Keine relevanten Dokumente gefunden.";
      }
    } else {
      // Group results by entry (document)
      const entriesMap = new Map<string, { title: string; chunks: string[] }>();
      
      for (const result of searchResults.results) {
        if (!entriesMap.has(result.entryId)) {
          const entry = searchResults.entries.find((e) => e.entryId === result.entryId);
          if (entry) {
            entriesMap.set(result.entryId, {
              title: entry.title || "Unbekanntes Dokument",
              chunks: [],
            });
            sources.push({
              title: entry.title || "Unbekanntes Dokument",
              entryId: result.entryId,
            });
          } else {
            // Skip results without matching entry
            continue;
          }
        }
        
        const entryData = entriesMap.get(result.entryId);
        if (entryData && result.content) {
          entryData.chunks.push(result.content.map((c) => c.text || "").join("\n"));
        }
      }

      // Build context string
      const contextParts: string[] = [];
      entriesMap.forEach((data) => {
        contextParts.push(`\n--- ${data.title} ---\n${data.chunks.join("\n\n")}`);
      });
      
      if (titleResults.length > 0) {
        context += "--- Dokumentinhalte ---\n";
      }
      context += contextParts.join("\n\n");
    }

    // Step 3: Generate AI response
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

      // Step 4: Get the full text response
      const fullResponse = await result.text;

      return {
        response: fullResponse,
        sources: sources.slice(0, 3), // Return top 3 sources
      };
    } catch (error) {
      console.error("OpenAI API error:", error);
      return {
        response: "Entschuldigung, es gab einen Fehler bei der Verarbeitung Ihrer Anfrage. Bitte versuchen Sie es später erneut.",
        sources: [],
      };
    }
  },
});
