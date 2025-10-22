# Phase 2: Production-Ready RAG System

**Goal:** Make RAG system work perfectly with real PDF/DOCX/XLSX text extraction

**Timeline:** 1-2 weeks  
**Focus:** ONLY text extraction and RAG optimization - NO extra features

---

## 🎯 Single Objective

**Make the AI read and understand ALL documents perfectly.**

Current State:
- ❌ Text extraction returns placeholder
- ❌ AI gets dummy content
- ❌ Answers are not accurate

Target State:
- ✅ Real text extracted from PDFs
- ✅ Real text extracted from DOCX
- ✅ Real text extracted from XLSX
- ✅ AI reads actual content
- ✅ Accurate answers with real citations
- ✅ Page numbers in citations

---

## 📋 Implementation Plan

### Step 1: Choose Text Extraction Service (Day 1)

**Options Analysis:**

#### Option A: Unstructured.io (RECOMMENDED) ✅
**Pros:**
- Handles PDF, DOCX, XLSX, images
- Built-in OCR for scanned documents
- Preserves document structure
- Returns page numbers
- Simple API
- Free tier: 1,000 pages/month

**Cons:**
- External API dependency
- Costs after free tier

**Pricing:**
- Free: 1,000 pages/month
- Pro: $0.01 per page after free tier

**Implementation:**
```typescript
// Simple API call
const response = await fetch('https://api.unstructured.io/general/v0/general', {
  method: 'POST',
  headers: {
    'unstructured-api-key': process.env.UNSTRUCTURED_API_KEY,
  },
  body: formData,
});
```

---

#### Option B: pdf-parse + mammoth + xlsx (Self-hosted)
**Pros:**
- No external API
- No costs
- Full control

**Cons:**
- No OCR (can't read scanned PDFs)
- More complex implementation
- Need to handle each format separately
- No page number extraction

**Not Recommended** - Missing OCR is a dealbreaker for dental practices

---

#### Option C: Azure Document Intelligence
**Pros:**
- Enterprise-grade
- Excellent OCR
- Page numbers included

**Cons:**
- More expensive
- Complex setup
- Overkill for this use case

---

**DECISION: Use Unstructured.io** ✅

---

### Step 2: Update Text Extraction (Days 2-3)

**File:** `convex/lib/textExtraction.ts`

**Current Implementation:**
```typescript
export async function extractText(buffer: ArrayBuffer, fileType: string) {
  return {
    text: "[PDF content will be extracted in Phase 2]",
    pageCount: 1,
    metadata: {},
  };
}
```

**New Implementation:**

```typescript
import { fetch } from "convex/server";

export async function extractText(
  buffer: ArrayBuffer,
  fileType: string
): Promise<{
  text: string;
  pageCount: number;
  metadata: Record<string, any>;
}> {
  const apiKey = process.env.UNSTRUCTURED_API_KEY;
  
  if (!apiKey) {
    throw new Error("UNSTRUCTURED_API_KEY not configured");
  }

  // Convert ArrayBuffer to Blob
  const blob = new Blob([buffer]);
  const formData = new FormData();
  formData.append("files", blob, `document.${fileType}`);
  formData.append("strategy", "hi_res"); // High resolution for better accuracy
  formData.append("coordinates", "true"); // Get page numbers

  // Call Unstructured API
  const response = await fetch(
    "https://api.unstructured.io/general/v0/general",
    {
      method: "POST",
      headers: {
        "unstructured-api-key": apiKey,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Unstructured API error: ${response.statusText}`);
  }

  const elements = await response.json();

  // Extract text and page numbers
  let fullText = "";
  const pageTexts = new Map<number, string[]>();
  let maxPage = 0;

  for (const element of elements) {
    const text = element.text || "";
    const pageNumber = element.metadata?.page_number || 1;

    if (!pageTexts.has(pageNumber)) {
      pageTexts.set(pageNumber, []);
    }
    pageTexts.get(pageNumber)!.push(text);

    fullText += text + "\n";
    maxPage = Math.max(maxPage, pageNumber);
  }

  return {
    text: fullText.trim(),
    pageCount: maxPage,
    metadata: {
      pageTexts: Object.fromEntries(pageTexts), // Store text by page
      extractedAt: Date.now(),
    },
  };
}
```

**Key Features:**
- ✅ Real text extraction
- ✅ Page number tracking
- ✅ Handles PDF, DOCX, XLSX, images
- ✅ OCR for scanned documents
- ✅ Error handling

---

### Step 3: Update Chunking with Page Numbers (Day 3)

**File:** `convex/lib/chunking.ts`

**Current:** Chunks text without page tracking  
**New:** Track which page each chunk comes from

```typescript
export interface TextChunk {
  text: string;
  pageNumber?: number;
  chunkIndex: number;
}

export function chunkText(
  text: string,
  pageTexts?: Record<number, string[]>,
  chunkSize: number = 2000,
  overlap: number = 200
): TextChunk[] {
  const chunks: TextChunk[] = [];
  
  if (pageTexts) {
    // Chunk by page (better for citations)
    let chunkIndex = 0;
    for (const [pageNum, texts] of Object.entries(pageTexts)) {
      const pageText = texts.join("\n");
      const pageChunks = splitIntoChunks(pageText, chunkSize, overlap);
      
      for (const chunk of pageChunks) {
        chunks.push({
          text: chunk,
          pageNumber: parseInt(pageNum),
          chunkIndex: chunkIndex++,
        });
      }
    }
  } else {
    // Fallback: chunk entire text
    const textChunks = splitIntoChunks(text, chunkSize, overlap);
    chunks.push(...textChunks.map((text, i) => ({
      text,
      chunkIndex: i,
    })));
  }

  return chunks;
}

function splitIntoChunks(
  text: string,
  chunkSize: number,
  overlap: number
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }

  return chunks;
}
```

---

### Step 4: Update RAG Indexing with Page Numbers (Day 4)

**File:** `convex/documents.ts`

**Update `processDocument` action:**

```typescript
// Step 3: Chunk text with page tracking
const chunks = chunkText(
  text,
  metadata.pageTexts,
  2000,
  200
);

// Step 4: Embed and index in RAG
const ragEntryId = await rag.insert(ctx, {
  namespace: "practice",
  title: document.title,
  content: chunks.map((chunk) => ({
    text: chunk.text,
    metadata: {
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
    },
  })),
  filterValues: [
    { name: "category", value: document.category },
    { name: "fileType", value: document.fileType },
    { name: "uploadedAt", value: document.uploadedAt },
  ],
  metadata: {
    storageId: document.storageId,
    documentId: document._id,
    ...(pageCount ? { pageCount } : {}),
  },
});
```

**Key Changes:**
- ✅ Pass `pageTexts` to chunking
- ✅ Store page number in chunk metadata
- ✅ RAG can return page numbers with results

---

### Step 5: Update Chat to Show Page Numbers (Day 5)

**File:** `convex/chat.ts`

**Update source extraction:**

```typescript
// Build context from search results
for (const result of searchResults.results) {
  const entry = searchResults.entries.find((e) => e.entryId === result.entryId);
  if (entry) {
    const pageNumber = result.content[0]?.metadata?.pageNumber;
    
    sources.push({
      title: entry.title || "Unbekanntes Dokument",
      entryId: result.entryId,
      pageNumber: pageNumber, // Add page number
    });
  }
}
```

**Update system prompt:**

```typescript
const SYSTEM_PROMPT = `Du bist ein Assistent für Qualitätsmanagement in einer Zahnarztpraxis.

WICHTIGE REGELN:
1. Beantworte Fragen NUR anhand der bereitgestellten Dokumente
2. Wenn die Information nicht in den Dokumenten steht, sage: "Diese Information finde ich nicht in den verfügbaren Dokumenten."
3. Gib IMMER die Quelle an mit Dokumentname UND Seitenzahl (z.B. "Hygieneplan, Seite 3")
4. Halte Antworten präzise und praxisnah (3-7 Sätze)
5. Verwende einfache, klare Sprache
6. Bei Unsicherheit: Empfehle, das Originaldokument zu prüfen

KONTEXT:
{context}

Beantworte die folgende Frage basierend auf dem Kontext:`;
```

---

### Step 6: Update Frontend to Show Page Numbers (Day 5)

**File:** `src/components/chat/chat-message.tsx`

**Update source display:**

```typescript
interface Source {
  title: string;
  entryId: string;
  pageNumber?: number;
}

// In render:
{sources.map((source) => (
  <Button
    key={source.entryId}
    variant="outline"
    size="sm"
    className="justify-start text-xs h-auto py-1"
    onClick={() => {
      console.log('Open document:', source.entryId, 'page:', source.pageNumber);
    }}
  >
    <FileText className="mr-2 h-3 w-3" />
    {source.title}
    {source.pageNumber && ` (Seite ${source.pageNumber})`}
  </Button>
))}
```

---

### Step 7: Environment Setup (Day 1)

**Add to Convex Dashboard:**

```bash
# In Convex Dashboard → Settings → Environment Variables
UNSTRUCTURED_API_KEY=your_api_key_here
```

**Get API Key:**
1. Go to https://unstructured.io
2. Sign up for free account
3. Get API key from dashboard
4. Free tier: 1,000 pages/month

---

### Step 8: Testing (Days 6-7)

**Test Documents:**

1. **Simple PDF** (text-based)
   - Upload
   - Verify text extracted
   - Ask AI question
   - Check answer accuracy
   - Verify page number in citation

2. **Scanned PDF** (image-based)
   - Upload
   - Verify OCR works
   - Ask AI question
   - Check answer accuracy

3. **DOCX Document**
   - Upload
   - Verify text extracted
   - Ask AI question

4. **XLSX Spreadsheet**
   - Upload
   - Verify data extracted
   - Ask AI question

5. **Multi-page PDF** (10+ pages)
   - Upload
   - Ask questions about different pages
   - Verify correct page numbers in citations

**Test Scenarios:**

```
Scenario 1: Specific Information
Q: "Was steht im Hygieneplan über Sterilisation?"
Expected: Accurate answer with "Hygieneplan, Seite X"

Scenario 2: Not Found
Q: "Was steht über Zahnimplantate?"
Expected: "Diese Information finde ich nicht in den verfügbaren Dokumenten."

Scenario 3: Multiple Sources
Q: "Welche Hygienemaßnahmen sind vorgeschrieben?"
Expected: Answer citing multiple documents with page numbers

Scenario 4: Follow-up
Q: "Wie oft muss das gemacht werden?"
Expected: Contextual answer based on previous question
```

---

## 📊 Success Criteria

### Must Have (Phase 2 Complete):
- ✅ Real text extracted from PDFs
- ✅ Real text extracted from DOCX
- ✅ Real text extracted from XLSX
- ✅ OCR works for scanned documents
- ✅ Page numbers tracked and displayed
- ✅ AI gives accurate answers
- ✅ Citations include page numbers
- ✅ Multi-page documents work correctly
- ✅ Error handling for extraction failures

### Performance Targets:
- Text extraction: < 30 seconds per document
- RAG search: < 1 second
- AI response: < 5 seconds
- Accuracy: > 90% correct answers

---

## 🚀 Deployment Checklist

**Before Going Live:**

1. ✅ Unstructured API key configured
2. ✅ Test with 10+ real documents
3. ✅ Verify page numbers are correct
4. ✅ Test OCR with scanned PDFs
5. ✅ Error handling tested
6. ✅ Performance acceptable
7. ✅ AI answers are accurate
8. ✅ Citations are correct

---

## 📝 Implementation Order

**Week 1:**
- Day 1: Setup Unstructured.io account + API key
- Day 2: Implement text extraction
- Day 3: Update chunking with page numbers
- Day 4: Update RAG indexing
- Day 5: Update chat + frontend

**Week 2:**
- Day 6-7: Testing with real documents
- Day 8-9: Bug fixes and optimization
- Day 10: Final testing and deployment

---

## 🎯 After Phase 2

**You will have:**
- ✅ Fully functional RAG system
- ✅ AI reads real document content
- ✅ Accurate answers with page citations
- ✅ OCR for scanned documents
- ✅ Production-ready system

**Ready for:**
- Real-world usage
- Dental practice deployment
- Phase 3 (Authentication) if needed

---

## 💰 Cost Estimate

**Unstructured.io:**
- Free tier: 1,000 pages/month
- For 100 documents (avg 10 pages each) = 1,000 pages
- **Cost: $0/month** (within free tier)

**If exceeding free tier:**
- $0.01 per page
- 2,000 pages/month = $10/month
- 5,000 pages/month = $40/month

**OpenAI (unchanged):**
- Embeddings: ~$0.0001 per 1K tokens
- Chat: ~$0.0005 per 1K tokens
- Estimated: $5-10/month

**Total: $0-50/month** depending on usage

---

## 🔧 Troubleshooting

**Issue: Text extraction fails**
- Check API key is correct
- Check file is not corrupted
- Check file size < 50MB
- Check Unstructured.io status

**Issue: OCR not working**
- Verify "hi_res" strategy is set
- Check image quality
- Try different scan settings

**Issue: Page numbers wrong**
- Verify Unstructured returns page metadata
- Check chunking logic
- Test with simple PDF first

**Issue: AI answers inaccurate**
- Check extracted text quality
- Verify chunking preserves context
- Adjust chunk size/overlap
- Check RAG search threshold

---

## 📚 Resources

**Unstructured.io:**
- Docs: https://unstructured-io.github.io/unstructured/
- API Reference: https://api.unstructured.io/general/docs
- Examples: https://github.com/Unstructured-IO/unstructured

**Convex RAG:**
- Docs: https://docs.convex.dev/rag
- Examples: https://github.com/get-convex/rag-example

---

**Focus: Make RAG work perfectly. Nothing else.** 🎯
