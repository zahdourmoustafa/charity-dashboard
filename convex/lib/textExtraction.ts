/**
 * Text Extraction Module
 * 
 * Calls Vercel API route for text extraction
 * This avoids Convex sandbox restrictions
 * 
 * @module textExtraction
 */

export interface ExtractedText {
  text: string;
  pageCount: number;
  metadata: {
    pageTexts?: Record<number, string>;
    extractedAt: number;
    wordCount?: number;
    [key: string]: any;
  };
}

/**
 * Extract text by calling Vercel API
 */
export async function extractText(
  buffer: ArrayBuffer,
  fileType: "pdf" | "docx" | "xlsx" | "image"
): Promise<ExtractedText> {
  if (!buffer || buffer.byteLength === 0) {
    throw new Error("Empty or invalid file buffer");
  }

  if (fileType === "image") {
    throw new Error("Image text extraction not supported (requires OCR)");
  }

  // Get Vercel API URL from environment
  const apiUrl = process.env.VERCEL_API_URL || "https://german-dentist.vercel.app";
  const extractUrl = `${apiUrl}/api/extract-text`;

  try {
    // Create FormData with file
    const formData = new FormData();
    const blob = new Blob([buffer]);
    formData.append("file", blob, `document.${fileType}`);
    formData.append("fileType", fileType);

    // Call Vercel API
    const response = await fetch(extractUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || error.error || "Extraction failed");
    }

    const result: ExtractedText = await response.json();
    return result;
  } catch (error) {
    throw new Error(
      `Text extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
