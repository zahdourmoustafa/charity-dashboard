/**
 * Query Classification for RAG System
 * Determines user intent and extracts entities
 */

export type QueryIntent = "location" | "content" | "action";

export interface ClassifiedQuery {
  intent: QueryIntent;
  originalQuery: string;
  extractedDocumentNames: string[];
  rewrittenQuery: string;
}

/**
 * Classify user query intent
 */
export function classifyQuery(query: string): ClassifiedQuery {
  const lowerQuery = query.toLowerCase().trim();
  
  // Location intent patterns
  const locationPatterns = [
    /wo\s+(finde|ist|liegt|befindet)/,
    /gib\s+mir/,
    /zeig\s+(mir\s+)?/,
    /ich\s+brauche/,
    /ich\s+suche/,
    /hast\s+du/,
    /gibt\s+es/,
  ];
  
  // Action intent patterns
  const actionPatterns = [
    /download/,
    /herunterladen/,
    /öffne/,
    /zeige\s+mir\s+das\s+dokument/,
  ];
  
  // Determine intent
  let intent: QueryIntent = "content"; // Default
  
  if (locationPatterns.some(pattern => pattern.test(lowerQuery))) {
    intent = "location";
  } else if (actionPatterns.some(pattern => pattern.test(lowerQuery))) {
    intent = "action";
  }
  
  // Extract potential document names
  const extractedDocumentNames = extractDocumentNames(query);
  
  // Rewrite query for better retrieval
  const rewrittenQuery = rewriteQuery(query, intent);
  
  return {
    intent,
    originalQuery: query,
    extractedDocumentNames,
    rewrittenQuery,
  };
}

/**
 * Extract potential document names from query
 */
function extractDocumentNames(query: string): string[] {
  const names: string[] = [];
  const lowerQuery = query.toLowerCase();
  
  // Common document name patterns
  const patterns = [
    /(?:den|das|die)\s+([a-zäöüß]+(?:plan|formular|antrag|protokoll|anweisung|liste))/gi,
    /([a-zäöüß]+(?:plan|formular|antrag|protokoll|anweisung|liste))/gi,
  ];
  
  patterns.forEach(pattern => {
    const matches = query.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        names.push(match[1].trim());
      }
    }
  });
  
  return [...new Set(names)]; // Remove duplicates
}

/**
 * Rewrite query for better retrieval
 */
function rewriteQuery(query: string, intent: QueryIntent): string {
  let rewritten = query;
  
  if (intent === "location") {
    // Remove location words, keep document name
    rewritten = query
      .replace(/wo\s+(finde|ist|liegt|befindet)\s+(ich\s+)?(den|das|die)?/gi, '')
      .replace(/gib\s+mir\s+(den|das|die)?/gi, '')
      .replace(/zeig\s+(mir\s+)?(den|das|die)?/gi, '')
      .replace(/ich\s+(brauche|suche)\s+(den|das|die)?/gi, '')
      .trim();
  }
  
  return rewritten || query;
}

/**
 * Calculate similarity score between two strings (simple Levenshtein-based)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Exact match
  if (s1 === s2) return 1.0;
  
  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Simple character overlap
  const chars1 = new Set(s1.split(''));
  const chars2 = new Set(s2.split(''));
  const intersection = new Set([...chars1].filter(x => chars2.has(x)));
  const union = new Set([...chars1, ...chars2]);
  
  return intersection.size / union.size;
}
