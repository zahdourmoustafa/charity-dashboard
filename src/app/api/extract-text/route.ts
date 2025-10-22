/**
 * Vercel API Route for Text Extraction
 * 
 * Extracts text from PDF, DOCX, XLSX files
 * Called by Convex processDocument action
 */

import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ExtractionResult {
  text: string;
  pageCount: number;
  metadata: {
    pageTexts?: Record<number, string>;
    extractedAt: number;
    wordCount: number;
    [key: string]: unknown;
  };
}

async function extractPDF(buffer: Buffer): Promise<ExtractionResult> {
  console.log("[PDF] Starting extraction, buffer size:", buffer.length);
  
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  
  console.log("[PDF] Extraction complete, pages:", totalPages);

  // Build page-by-page text map
  const pageTexts: Record<number, string> = {};
  text.forEach((pageText, index) => {
    pageTexts[index + 1] = pageText;
  });

  const fullText = text.join("\n");

  return {
    text: fullText,
    pageCount: totalPages,
    metadata: {
      pageTexts,
      extractedAt: Date.now(),
      wordCount: fullText.split(/\s+/).filter(w => w.length > 0).length,
    },
  };
}

async function extractDOCX(buffer: Buffer): Promise<ExtractionResult> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  const estimatedPages = Math.max(1, Math.ceil(wordCount / 500));

  return {
    text,
    pageCount: estimatedPages,
    metadata: {
      extractedAt: Date.now(),
      wordCount,
      messages: result.messages,
    },
  };
}

async function extractXLSX(buffer: Buffer): Promise<ExtractionResult> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  
  let fullText = "";
  const sheetTexts: Record<string, string> = {};

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const sheetText = XLSX.utils.sheet_to_txt(sheet);
    
    sheetTexts[sheetName] = sheetText;
    fullText += `\n--- ${sheetName} ---\n${sheetText}\n`;
  }

  const wordCount = fullText.split(/\s+/).filter(w => w.length > 0).length;
  const estimatedPages = Math.max(1, Math.ceil(wordCount / 500));

  return {
    text: fullText.trim(),
    pageCount: estimatedPages,
    metadata: {
      extractedAt: Date.now(),
      wordCount,
      sheetCount: workbook.SheetNames.length,
      sheetNames: workbook.SheetNames,
      sheetTexts,
    },
  };
}

export async function POST(request: NextRequest) {
  console.log("[API] Extract text request received");
  
  try {
    // Get file data from request
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileType = formData.get("fileType") as string;

    console.log("[API] File type:", fileType, "File size:", file?.size);

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!fileType || !["pdf", "docx", "xlsx"].includes(fileType)) {
      return NextResponse.json(
        { error: "Invalid file type" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("[API] Buffer created, size:", buffer.length);

    // Extract text based on file type
    let result: ExtractionResult;

    switch (fileType) {
      case "pdf":
        console.log("[API] Calling extractPDF");
        result = await extractPDF(buffer);
        break;
      case "docx":
        result = await extractDOCX(buffer);
        break;
      case "xlsx":
        result = await extractXLSX(buffer);
        break;
      default:
        return NextResponse.json(
          { error: "Unsupported file type" },
          { status: 400 }
        );
    }

    console.log("[API] Extraction successful, returning result");
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] Text extraction error:", error);
    return NextResponse.json(
      { 
        error: "Text extraction failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
