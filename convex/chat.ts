import { action } from "./_generated/server";
import { v } from "convex/values";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { classifyQuery } from "./lib/queryClassifier";
import { hybridSearch } from "./lib/hybridSearch";

const SYSTEM_PROMPT = `You are an AI Consultant Helper for nonprofit organizations.

IMPORTANT RULES:
1. Answer questions ONLY based on the provided documents
2. For LOCATION questions (Where can I find...?):
   - If "Available Documents" are listed, respond: "The document '[Name]' is available in the document list."
   - Provide the exact document name
3. For CONTENT questions (How, What, When...?):
   - Answer based on "Document Contents"
   - Cite ALL sources used at the end
4. For "Similar Documents": Ask "Did you mean: [List]?"
5. If nothing found: "I cannot find this information. Please contact your organization's leadership."
6. Keep answers concise (3-7 sentences)
7. Use simple, clear language
8. Use bullet points (•) for instructions

RESPONSE FORMAT:
[Clear answer in English]

[Steps if applicable]

Sources:
[1] Document name, Page X
[2] Document name, Page Y
[3] Document name, Page Z

IMPORTANT: List ALL documents you used for the answer. Number them [1], [2], [3], etc.

CONTEXT:
{context}

Answer the following question based on the context:`;

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
        context += "--- Available Documents ---\n";
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
        context += "--- Available Documents ---\n";
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
        context = "No relevant documents found.";
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
          context += "--- Available Documents ---\n";
          uniqueTitles.forEach((title) => {
            context += `• ${title}\n`;
          });
          context += "\n";
        }
        
        // Add content
        context += "--- Document Contents ---\n";
        searchResults.contentMatches.forEach((match) => {
          context += `\n[${match.title}${match.pageNumber ? `, Page ${match.pageNumber}` : ''}]\n`;
          context += `${match.chunkText}\n`;
          
          // Add to sources
          sources.push(match);
        });
      } else if (searchResults.documentMatches.length > 0) {
        // Found documents but no content
        context += "--- Available Documents ---\n";
        searchResults.documentMatches.forEach((doc) => {
          context += `• ${doc.title}\n`;
        });
        context += "\nNote: Documents found, but no specific content for the question.\n";
      } else {
        context = "No relevant documents found.";
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
        response: "Sorry, there was an error processing your request. Please try again later.",
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
