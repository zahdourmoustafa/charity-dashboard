/**
 * Text Chunking Module
 * 
 * Splits large text into smaller chunks for RAG indexing.
 * Tracks page numbers for accurate citations.
 * 
 * @module chunking
 */

export interface TextChunk {
  text: string;
  pageNumber?: number;
  chunkIndex: number;
}

/**
 * Chunk text with page number tracking
 * 
 * @param text - Full document text
 * @param pageTexts - Optional map of page numbers to text
 * @param chunkSize - Maximum characters per chunk (default: 2000)
 * @param overlap - Characters to overlap between chunks (default: 200)
 * @returns Array of text chunks with metadata
 */
export function chunkText(
  text: string,
  pageTexts?: Record<number, string>,
  chunkSize: number = 2000,
  overlap: number = 200
): TextChunk[] {
  const chunks: TextChunk[] = [];
  
  if (pageTexts && Object.keys(pageTexts).length > 0) {
    // Strategy 1: Chunk by page (better for citations)
    let chunkIndex = 0;
    
    for (const [pageNumStr, pageText] of Object.entries(pageTexts)) {
      const pageNum = parseInt(pageNumStr);
      
      if (!pageText || pageText.trim().length === 0) {
        continue; // Skip empty pages
      }
      
      // If page text is small enough, keep as single chunk
      if (pageText.length <= chunkSize) {
        chunks.push({
          text: pageText.trim(),
          pageNumber: pageNum,
          chunkIndex: chunkIndex++,
        });
      } else {
        // Split large pages into multiple chunks
        const pageChunks = splitIntoChunks(pageText, chunkSize, overlap);
        
        for (const chunkText of pageChunks) {
          chunks.push({
            text: chunkText,
            pageNumber: pageNum,
            chunkIndex: chunkIndex++,
          });
        }
      }
    }
  } else {
    // Strategy 2: Chunk entire text (fallback)
    const textChunks = splitIntoChunks(text, chunkSize, overlap);
    
    chunks.push(
      ...textChunks.map((chunkText, i) => ({
        text: chunkText,
        chunkIndex: i,
      }))
    );
  }

  return chunks;
}

/**
 * Split text into overlapping chunks
 * Tries to break at sentence boundaries when possible
 * 
 * @param text - Text to split
 * @param chunkSize - Maximum characters per chunk
 * @param overlap - Characters to overlap between chunks
 * @returns Array of text chunks
 */
function splitIntoChunks(
  text: string,
  chunkSize: number,
  overlap: number
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);
    
    // Try to break at sentence boundary (. ! ?)
    if (end < text.length) {
      const sentenceEnd = text.lastIndexOf(". ", end);
      const exclamationEnd = text.lastIndexOf("! ", end);
      const questionEnd = text.lastIndexOf("? ", end);
      
      const breakPoint = Math.max(sentenceEnd, exclamationEnd, questionEnd);
      
      // Only use sentence boundary if it's not too far back
      if (breakPoint > start + chunkSize * 0.7) {
        end = breakPoint + 1; // Include the punctuation
      }
    }
    
    const chunk = text.slice(start, end).trim();
    
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    // Move start position with overlap
    start = end - overlap;
    
    // Ensure we make progress (avoid infinite loop)
    if (start <= (chunks.length > 0 ? text.indexOf(chunks[chunks.length - 1]) : 0)) {
      start = end;
    }
  }

  return chunks;
}

/**
 * Estimate page number from chunk index
 * Used when page tracking is not available
 * 
 * @param chunkIndex - Index of the chunk
 * @param totalChunks - Total number of chunks
 * @param totalPages - Total pages in document
 * @returns Estimated page number
 */
export function estimatePageNumber(
  chunkIndex: number,
  totalChunks: number,
  totalPages: number
): number {
  if (totalChunks === 0 || totalPages === 0) return 1;
  
  const chunksPerPage = totalChunks / totalPages;
  const estimatedPage = Math.floor(chunkIndex / chunksPerPage) + 1;
  
  return Math.min(estimatedPage, totalPages);
}
