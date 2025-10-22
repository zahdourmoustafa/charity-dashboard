# Phase 1 Implementation Guide (Continued)
## RAG System & AI Chatbot

---

### Week 3: RAG System Implementation

#### Task 3.1: Configure RAG Component

**File:** `convex/rag.ts`

```typescript
import { components } from "./_generated/api";
import { RAG } from "@convex-dev/rag";
import { openai } from "@ai-sdk/openai";

// Define filter types for type safety
type FilterTypes = {
  category: string;
  fileType: string;
  uploadedAt: number;
};

// Initialize RAG component
export const rag = new RAG<FilterTypes>(components.rag, {
  filterNames: ["category", "fileType", "uploadedAt"],
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536,
});
```

**Configuration Explained:**
- `filterNames`: Metadata fields for filtering search results
- `textEmbeddingModel`: OpenAI embeddings (1536 dimensions)
- `FilterTypes`: TypeScript type safety for filters

#### Task 3.2: Text Extraction Library

**File:** `convex/lib/textExtraction.ts`

```typescript
import pdf from "pdf-parse";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

export interface ExtractedText {
  text: string;
  pageCount?: number;
  metadata?: Record<string, any>;
}

/**
 * Extract text from PDF
 */
export async function extractPdfText(
  buffer: ArrayBuffer
): Promise<ExtractedText> {
  const data = await pdf(Buffer.from(buffer));
  
  return {
    text: data.text,
    pageCount: data.numpages,
    metadata: {
      info: data.info,
      version: data.version,
    },
  };
}

/**
 * Extract text from DOCX
 */
export async function extractDocxText(
  buffer: ArrayBuffer
): Promise<ExtractedText> {
  const result = await mammoth.extractRawText({ buffer });
  
  return {
    text: result.value,
    metadata: {
      messages: result.messages,
    },
  };
}

/**
 * Extract text from XLSX
 */
export async function extractXlsxText(
  buffer: ArrayBuffer
): Promise<ExtractedText> {
  const workbook = XLSX.read(buffer, { type: "array" });
  let text = "";

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const sheetText = XLSX.utils.sheet_to_txt(sheet);
    text += `\n\n=== ${sheetName} ===\n\n${sheetText}`;
  });

  return {
    text: text.trim(),
    metadata: {
      sheetCount: workbook.SheetNames.length,
      sheets: workbook.SheetNames,
    },
  };
}

/**
 * Main extraction function - routes to appropriate extractor
 */
export async function extractText(
  buffer: ArrayBuffer,
  fileType: "pdf" | "docx" | "xlsx" | "image"
): Promise<ExtractedText> {
  switch (fileType) {
    case "pdf":
      return extractPdfText(buffer);
    case "docx":
      return extractDocxText(buffer);
    case "xlsx":
      return extractXlsxText(buffer);
    case "image":
      // TODO: Implement OCR (Phase 2)
      throw new Error("Image OCR not yet implemented");
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}
```

#### Task 3.3: Text Chunking Strategy

**File:** `convex/lib/chunking.ts`

```typescript
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
```

**Chunking Strategy:**
- Preserve paragraph boundaries (better context)
- ~2000 characters per chunk (~500 tokens)
- 200 character overlap (prevents context loss)
- Estimate page numbers for citations

#### Task 3.4: Document Processing Action

**File:** `convex/documents.ts` (add to existing file)

```typescript
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { rag } from "./rag";
import { extractText } from "./lib/textExtraction";
import { chunkText, estimatePageNumbers } from "./lib/chunking";

// Process document: extract text, chunk, embed
export const processDocument = action({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    // Get document metadata
    const document = await ctx.runQuery(internal.documents.get, {
      id: args.documentId,
    });

    if (!document) {
      throw new Error("Document not found");
    }

    try {
      // Step 1: Download file from storage
      const file = await ctx.storage.get(document.storageId);
      if (!file) {
        throw new Error("File not found in storage");
      }

      const buffer = await file.arrayBuffer();

      // Step 2: Extract text
      const { text, pageCount, metadata } = await extractText(
        buffer,
        document.fileType
      );

      if (!text || text.trim().length === 0) {
        throw new Error("No text extracted from document");
      }

      // Step 3: Chunk text
      let chunks = chunkText(text);

      // Step 4: Estimate page numbers (for PDFs)
      if (document.fileType === "pdf" && pageCount) {
        chunks = estimatePageNumbers(chunks, pageCount, text.length);
      }

      // Step 5: Add to RAG with metadata
      const { entryId } = await rag.add(ctx, {
        namespace: "practice", // Single practice for now
        key: document._id,     // Use document ID as key (for updates)
        chunks: chunks.map((chunk) => chunk.text),
        title: document.title,
        filterValues: [
          { name: "category", value: document.category },
          { name: "fileType", value: document.fileType },
          { name: "uploadedAt", value: document.uploadedAt },
        ],
        metadata: {
          storageId: document.storageId,
          documentId: document._id,
          pageCount,
          ...metadata,
        },
      });

      // Step 6: Update document status
      await ctx.runMutation(internal.documents.updateStatus, {
        documentId: args.documentId,
        status: "ready",
        ragEntryId: entryId,
        metadata: {
          pageCount,
          chunkCount: chunks.length,
        },
      });

      return {
        success: true,
        entryId,
        chunkCount: chunks.length,
      };
    } catch (error) {
      // Update document with error status
      await ctx.runMutation(internal.documents.updateStatus, {
        documentId: args.documentId,
        status: "error",
        metadata: {
          errorMessage: error.message,
        },
      });

      throw error;
    }
  },
});

// Internal mutation to update document status
export const updateStatus = internalMutation({
  args: {
    documentId: v.id("documents"),
    status: v.union(
      v.literal("processing"),
      v.literal("ready"),
      v.literal("error")
    ),
    ragEntryId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      status: args.status,
      ragEntryId: args.ragEntryId,
      metadata: args.metadata || {},
    });
  },
});
```

**Processing Pipeline:**
1. Download file from Convex storage
2. Extract text (PDF/DOCX/XLSX)
3. Chunk text intelligently
4. Generate embeddings (automatic via RAG)
5. Store in vector database
6. Update document status

---

### Week 4: AI Chatbot Implementation

#### Task 4.1: Chat Action with RAG Search

**File:** `convex/chat.ts`

```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";
import { rag } from "./rag";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

// German system prompt
const SYSTEM_PROMPT = `Du bist ein Assistent für Qualitätsmanagement in einer Zahnarztpraxis (LZK Baden-Württemberg).

WICHTIGE REGELN:
1. Beantworte Fragen NUR anhand der bereitgestellten Dokumente
2. Wenn die Information nicht in den Dokumenten steht, sage: "Diese Information finde ich nicht in den verfügbaren Dokumenten."
3. Gib IMMER die Quelle an (Dokumentname und Seitenzahl)
4. Halte Antworten präzise und praxisnah (3-7 Sätze)
5. Verwende einfache, klare Sprache
6. Bei Unsicherheit: Empfehle, das Originaldokument zu prüfen

KONTEXT:
{context}

Beantworte die folgende Frage basierend auf dem Kontext:`;

export const chat = action({
  args: {
    message: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Step 1: Search RAG for relevant chunks
    const searchOptions: any = {
      namespace: "practice",
      query: args.message,
      limit: 10,
      vectorScoreThreshold: 0.5,
      chunkContext: { before: 2, after: 1 }, // Include surrounding chunks
    };

    // Optional: Filter by category
    if (args.category) {
      searchOptions.filters = [
        { name: "category", value: args.category },
      ];
    }

    const { results, text, entries } = await rag.search(ctx, searchOptions);

    // Step 2: Check if we found relevant content
    if (results.length === 0) {
      return {
        text: "Entschuldigung, ich konnte keine relevanten Informationen in den verfügbaren Dokumenten finden. Bitte versuchen Sie, Ihre Frage anders zu formulieren oder wenden Sie sich an Ihren Praxismanager.",
        sources: [],
      };
    }

    // Step 3: Build context from search results
    const contexts = entries.map((entry) => {
      const entryChunks = results
        .filter((r) => r.entryId === entry.entryId)
        .sort((a, b) => a.startOrder - b.startOrder);

      let contextText = `# ${entry.title}:\n\n`;
      let previousEnd = 0;

      for (const chunk of entryChunks) {
        if (chunk.startOrder !== previousEnd) {
          contextText += "\n...\n";
        }
        contextText += chunk.content.map((c) => c.text).join("\n");
        previousEnd = chunk.startOrder + chunk.content.length;
      }

      return contextText;
    });

    const fullContext = contexts.join("\n\n---\n\n");

    // Step 4: Build prompt
    const prompt = SYSTEM_PROMPT.replace("{context}", fullContext);

    // Step 5: Stream response from OpenAI
    const result = await streamText({
      model: openai("gpt-4o-mini"),
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: args.message },
      ],
      temperature: 0.3, // Lower temperature for more factual responses
      maxTokens: 500,
    });

    // Step 6: Prepare source citations
    const sources = entries.map((entry) => ({
      entryId: entry.entryId,
      title: entry.title || "Unbenanntes Dokument",
      documentId: entry.metadata?.documentId,
      storageId: entry.metadata?.storageId,
      pageCount: entry.metadata?.pageCount,
      // Estimate page range from chunks
      pageRange: estimatePageRange(
        results.filter((r) => r.entryId === entry.entryId)
      ),
    }));

    return {
      stream: result.toDataStreamResponse(),
      sources,
    };
  },
});

// Helper: Estimate page range from chunks
function estimatePageRange(chunks: any[]): string {
  if (chunks.length === 0) return "";
  
  const pages = chunks
    .map((c) => c.metadata?.pageNumber)
    .filter((p) => p !== undefined);

  if (pages.length === 0) return "";

  const minPage = Math.min(...pages);
  const maxPage = Math.max(...pages);

  if (minPage === maxPage) {
    return `Seite ${minPage}`;
  }

  return `Seiten ${minPage}-${maxPage}`;
}
```

**Key Features:**
- German system prompt (strict rules)
- RAG search with configurable filters
- Context building from multiple documents
- Streaming responses (Vercel AI SDK)
- Source citations with page numbers
- Fallback message if no results found

#### Task 4.2: Frontend Chat Interface

**File:** `src/app/(dashboard)/chat/page.tsx`

```typescript
"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, FileText } from "lucide-react";

export default function ChatPage() {
  const [input, setInput] = useState("");
  
  const { messages, sendMessage, status, stop } = useChat({
    api: "/api/chat", // Next.js API route
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status === "ready") {
      sendMessage({ text: input });
      setInput("");
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold">AI-Assistent</h1>
        <p className="text-sm text-muted-foreground">
          Stellen Sie Fragen zu Ihren Dokumenten
        </p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">
                Stellen Sie eine Frage, um zu beginnen...
              </p>
            </Card>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <Card
                className={`max-w-[80%] p-4 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {message.parts.map((part, i) => {
                  if (part.type === "text") {
                    return (
                      <p key={i} className="whitespace-pre-wrap">
                        {part.text}
                      </p>
                    );
                  }
                  return null;
                })}

                {/* Source Citations */}
                {message.role === "assistant" && message.metadata?.sources && (
                  <div className="mt-4 space-y-2 border-t pt-4">
                    <p className="text-sm font-semibold">📄 Quellen:</p>
                    {message.metadata.sources.map((source: any, i: number) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                          // Open PDF (implement in next task)
                          window.open(`/documents/${source.documentId}`, "_blank");
                        }}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        {source.title} {source.pageRange && `(${source.pageRange})`}
                      </Button>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          ))}

          {status === "streaming" && (
            <div className="flex justify-start">
              <Card className="max-w-[80%] bg-muted p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Stellen Sie eine Frage..."
            disabled={status !== "ready"}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={status !== "ready" || !input.trim()}
          >
            {status === "streaming" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
          {status === "streaming" && (
            <Button type="button" variant="outline" onClick={stop}>
              Stop
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
```

#### Task 4.3: Next.js API Route for Chat

**File:** `src/app/api/chat/route.ts`

```typescript
import { api } from "@/convex/_generated/api";
import { fetchAction } from "convex/nextjs";

export async function POST(request: Request) {
  const { message, category } = await request.json();

  // Call Convex action
  const result = await fetchAction(api.chat.chat, {
    message,
    category,
  });

  // Return streaming response
  return result.stream;
}
```

---

## Testing Strategy

### Unit Tests

**Test Document Processing:**
```typescript
// Test text extraction
test("extractPdfText returns text and page count", async () => {
  const buffer = await readFile("test.pdf");
  const result = await extractPdfText(buffer);
  
  expect(result.text).toBeDefined();
  expect(result.pageCount).toBeGreaterThan(0);
});

// Test chunking
test("chunkText preserves paragraphs", () => {
  const text = "Paragraph 1.\n\nParagraph 2.\n\nParagraph 3.";
  const chunks = chunkText(text, { chunkSize: 50 });
  
  expect(chunks.length).toBeGreaterThan(0);
  expect(chunks[0].text).toContain("Paragraph");
});
```

### Integration Tests

**Test Upload → Process → Search Flow:**
```typescript
test("document upload and RAG ingestion", async () => {
  // 1. Upload document
  const uploadUrl = await convex.mutation(api.documents.generateUploadUrl);
  const response = await fetch(uploadUrl, {
    method: "POST",
    body: pdfFile,
  });
  const { storageId } = await response.json();

  // 2. Create document
  const documentId = await convex.mutation(api.documents.create, {
    title: "Test Document",
    category: categoryId,
    storageId,
    fileType: "pdf",
    fileSize: pdfFile.size,
    uploadedBy: "test-user",
  });

  // 3. Process document
  await convex.action(api.documents.processDocument, { documentId });

  // 4. Wait for processing
  await waitFor(() => {
    const doc = await convex.query(api.documents.get, { id: documentId });
    return doc.status === "ready";
  });

  // 5. Search RAG
  const result = await convex.action(api.chat.chat, {
    message: "Test query",
  });

  expect(result.sources.length).toBeGreaterThan(0);
});
```

### Manual Testing Checklist

- [ ] Upload PDF → Status changes to "processing" → "ready"
- [ ] Upload DOCX → Text extracted correctly
- [ ] Upload XLSX → Spreadsheet data readable
- [ ] Search documents by category
- [ ] Ask chatbot question → Get answer with sources
- [ ] Click source citation → Opens PDF
- [ ] Ask question with no answer → Get fallback message
- [ ] Test German language responses
- [ ] Test streaming (see words appear one by one)
- [ ] Test stop button during streaming

---

## Success Criteria

### Phase 1 Complete When:

✅ **Document Management**
- Admin can upload PDF, DOCX, XLSX files
- Documents organized by categories
- Documents searchable by title
- Documents downloadable
- Upload progress indicator works

✅ **RAG System**
- Text extracted from all file types
- Documents chunked intelligently
- Embeddings generated automatically
- Search returns relevant results
- Processing status tracked

✅ **AI Chatbot**
- User can ask questions in German
- AI responds in German
- Responses include source citations
- Citations link to correct documents
- No hallucinations (only uses uploaded docs)
- Streaming works smoothly
- Fallback message when no results

✅ **Quality**
- All UI text in German
- All code in English
- No console errors
- Mobile responsive
- Fast performance (< 5s responses)

---

## Next Steps

After Phase 1 completion:
1. User testing with dentist
2. Gather feedback
3. Fix bugs and improve UX
4. Plan Phase 2 (enhanced features)
5. Plan Phase 3 (authentication)

---

**Document Status:** ✅ Ready for Implementation  
**Last Updated:** October 22, 2025
