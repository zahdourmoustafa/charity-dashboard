/**
 * Hybrid Search: Combines vector search + keyword search + metadata filtering
 */

import { ActionCtx } from "../_generated/server";
import { api } from "../_generated/api";
import { rag } from "../rag";
import { calculateSimilarity } from "./queryClassifier";

export interface HybridSearchResult {
  documentMatches: Array<{
    title: string;
    fileType: string;
    score: number;
    matchType: "exact" | "fuzzy" | "keyword";
  }>;
  contentMatches: Array<{
    title: string;
    entryId: string;
    chunkText: string;
    pageNumber?: number;
    score: number;
  }>;
}

/**
 * Perform hybrid search combining multiple strategies
 */
export async function hybridSearch(
  ctx: ActionCtx,
  query: string,
  intent: "location" | "content" | "action"
): Promise<HybridSearchResult> {
  
  // 1. Keyword search on titles (fast, exact matches)
  const titleResults = await ctx.runQuery(api.documents.searchTitles, {
    query,
  });
  
  // 2. Get all documents for fuzzy matching
  const allDocs = await ctx.runQuery(api.documents.getAllTitles, {});
  
  // 3. Vector search on content (semantic understanding)
  const vectorResults = await rag.search(ctx, {
    namespace: "practice",
    query,
    limit: 10,
    vectorScoreThreshold: 0.4, // Lower threshold for more results
  });
  
  // 4. Combine and score document matches
  const documentMatches = combineDocumentMatches(
    query,
    titleResults,
    allDocs,
    intent
  );
  
  // 5. Process content matches
  const contentMatches = processContentMatches(vectorResults);
  
  return {
    documentMatches,
    contentMatches,
  };
}

/**
 * Combine and score document matches from different sources
 */
function combineDocumentMatches(
  query: string,
  titleResults: Array<{ title: string; fileType: string }>,
  allDocs: Array<{ _id: any; title: string; fileType: string }>,
  intent: "location" | "content" | "action"
): Array<{
  title: string;
  fileType: string;
  score: number;
  matchType: "exact" | "fuzzy" | "keyword";
}> {
  const matches = new Map<string, {
    title: string;
    fileType: string;
    score: number;
    matchType: "exact" | "fuzzy" | "keyword";
  }>();
  
  const queryLower = query.toLowerCase();
  
  // Process keyword search results (highest priority)
  titleResults.forEach(doc => {
    const titleLower = doc.title.toLowerCase();
    let score = 0.9; // High score for keyword matches
    let matchType: "exact" | "fuzzy" | "keyword" = "keyword";
    
    // Boost for exact match
    if (titleLower === queryLower || queryLower.includes(titleLower)) {
      score = 1.0;
      matchType = "exact";
    }
    
    matches.set(doc.title, {
      title: doc.title,
      fileType: doc.fileType,
      score,
      matchType,
    });
  });
  
  // Add fuzzy matches for location queries
  if (intent === "location" && matches.size < 3) {
    allDocs.forEach(doc => {
      if (!matches.has(doc.title)) {
        const similarity = calculateSimilarity(query, doc.title);
        
        // Only include if similarity is high enough
        if (similarity > 0.5) {
          matches.set(doc.title, {
            title: doc.title,
            fileType: doc.fileType,
            score: similarity * 0.8, // Slightly lower than keyword matches
            matchType: "fuzzy",
          });
        }
      }
    });
  }
  
  // Sort by score and return top results
  return Array.from(matches.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

/**
 * Process vector search content matches
 */
function processContentMatches(
  vectorResults: any
): Array<{
  title: string;
  entryId: string;
  chunkText: string;
  pageNumber?: number;
  score: number;
}> {
  const matches: Array<{
    title: string;
    entryId: string;
    chunkText: string;
    pageNumber?: number;
    score: number;
  }> = [];
  
  for (const result of vectorResults.results) {
    const entry = vectorResults.entries.find((e: any) => e.entryId === result.entryId);
    if (!entry) continue;
    
    const chunkText = result.content?.map((c: any) => c.text || "").join("\n") || "";
    const pageNumber = result.content?.[0]?.metadata?.pageNumber as number | undefined;
    
    matches.push({
      title: entry.title || "Unbekanntes Dokument",
      entryId: result.entryId,
      chunkText,
      pageNumber,
      score: result.score,
    });
  }
  
  // Sort by score
  return matches.sort((a, b) => b.score - a.score).slice(0, 5);
}
