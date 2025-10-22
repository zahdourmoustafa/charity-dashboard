/**
 * Vercel API Route for Text Extraction
 * 
 * Extracts text from PDF, DOCX, XLSX files
 * Called by Convex processDocument action
 */

import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

export const runtime = "nodejs"; // Use Node.js runtime (not edge) for pdf-parse
export const dynamic = "force-dynamic"; // Disable static optimization

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
  // Dynamic import to avoid build-time issues
  const pdfParse = (await import("pdf-parse")).default;
  
  const data = await pdfParse(buffer);

  // Build page-by-page text map (estimated)
  const pageTexts: Record<number, string> = {};
  const textPerPage = Math.ceil(data.text.length / data.numpages);
  
  for (let i = 0; i < data.numpages; i++) {
    const start = i * textPerPage;
    const end = Math.min((i + 1) * textPerPage, data.text.length);
    pageTexts[i + 1] = data.text.slice(start, end);
  }

  return {
    text: data.text,
    pageCount: data.numpages,
    metadata: {
      pageTexts,
      extractedAt: Date.now(),
      wordCount: data.text.split(/\s+/).filter(w => w.length > 0).length,
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
  try {
    // Get file data from request
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileType = formData.get("fileType") as string;

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

    // Extract text based on file type
    let result: ExtractionResult;

    switch (fileType) {
      case "pdf":
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

    return NextResponse.json(result);
  } catch (error) {
    console.error("Text extraction error:", error);
    return NextResponse.json(
      { 
        error: "Text extraction failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
