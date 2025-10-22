export interface Chunk {
  text: string;
  startIndex: number;
  endIndex: number;
  pageNumber?: number;
}

export interface ChunkingOptions {
  chunkSize: number;      // Target size in characters
  chunkOverlap: number;   // Overlap between chunks
  preserveParagraphs: boolean;
}

const DEFAULT_OPTIONS: ChunkingOptions = {
  chunkSize: 2000,        // ~500 tokens
  chunkOverlap: 200,      // ~50 tokens
  preserveParagraphs: true,
};

/**
 * Split text into overlapping chunks
 */
export function chunkText(
  text: string,
  options: Partial<ChunkingOptions> = {}
): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const chunks: Chunk[] = [];

  // Split into paragraphs first (preserve structure)
  const paragraphs = text.split(/\n\n+/);
  
  let currentChunk = "";
  let currentStartIndex = 0;

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) continue;

    // If adding this paragraph exceeds chunk size, save current chunk
    if (
      currentChunk.length > 0 &&
      currentChunk.length + trimmedParagraph.length > opts.chunkSize
    ) {
      chunks.push({
        text: currentChunk.trim(),
        startIndex: currentStartIndex,
        endIndex: currentStartIndex + currentChunk.length,
      });

      // Start new chunk with overlap
      const overlapText = currentChunk.slice(-opts.chunkOverlap);
      currentChunk = overlapText + "\n\n" + trimmedParagraph;
      currentStartIndex += currentChunk.length - overlapText.length;
    } else {
      // Add paragraph to current chunk
      currentChunk += (currentChunk ? "\n\n" : "") + trimmedParagraph;
    }
  }

  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      startIndex: currentStartIndex,
      endIndex: currentStartIndex + currentChunk.length,
    });
  }

  return chunks;
}

/**
 * Estimate page numbers for chunks (for PDFs)
 */
export function estimatePageNumbers(
  chunks: Chunk[],
  totalPages: number,
  totalLength: number
): Chunk[] {
  return chunks.map((chunk) => {
    const progress = chunk.startIndex / totalLength;
    const estimatedPage = Math.ceil(progress * totalPages);
    
    return {
      ...chunk,
      pageNumber: Math.max(1, Math.min(estimatedPage, totalPages)),
    };
  });
}
