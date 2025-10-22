import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { rag } from "./rag";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

const SYSTEM_PROMPT = `Du bist ein Assistent für Qualitätsmanagement in einer Zahnarztpraxis (LZK Baden-Württemberg).

WICHTIGE REGELN:
1. Beantworte Fragen NUR anhand der bereitgestellten Dokumente
2. Wenn die Information nicht in den Dokumenten steht, sage: "Diese Information finde ich nicht in den verfügbaren Dokumenten."
3. Gib IMMER die Quelle an (Dokumentname)
4. Halte Antworten präzise und praxisnah (3-7 Sätze)
5. Verwende einfache, klare Sprache
6. Bei Unsicherheit: Empfehle, das Originaldokument zu prüfen

KONTEXT:
{context}

Beantworte die folgende Frage basierend auf dem Kontext:`;

export const chat = action({
  args: {
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // Step 1: Search documents using RAG
    const searchResults = await rag.search(ctx, {
      namespace: "practice",
      query: args.message,
      limit: 5,
      vectorScoreThreshold: 0.5,
    });

    // Step 2: Build context from search results
    let context = "";
    const sources: Array<{ title: string; entryId: string }> = [];

    if (searchResults.results.length === 0) {
      context = "Keine relevanten Dokumente gefunden.";
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
      context = contextParts.join("\n\n");
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
