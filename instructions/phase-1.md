# Phase 1: Core RAG System & Document Management
## Implementation Guide

**Status:** 🚧 In Progress (Backend Complete ✅)  
**Priority:** HIGHEST  
**Timeline:** 4 weeks  
**Goal:** Build production-ready RAG system with document management and AI chatbot

## ✅ Completed Steps:
- ✅ Step 1: Convex RAG Component Installation
- ✅ Step 2: Database Schema Definition
- ✅ Step 3: Seed Initial Categories
- ✅ Step 4: Document Management Functions
- ✅ Step 5: RAG Configuration & Text Extraction

## 🚧 In Progress:
- 🚧 Step 6: Frontend Document Management UI
- ⏳ Step 7: AI Chatbot Implementation

---

## Table of Contents
1. [Overview](#overview)
2. [Technical Architecture](#technical-architecture)
3. [Setup & Installation](#setup--installation)
4. [Implementation Steps](#implementation-steps)
5. [Testing Strategy](#testing-strategy)
6. [Success Criteria](#success-criteria)

---

## Overview

### What We're Building
Phase 1 focuses on the core value proposition: **AI-powered document Q&A for German dental practices**. We're building:

1. **Document Management System**
   - Upload PDFs, DOCX, XLSX, images
   - Organize by categories (Hygiene, Personal, Formulare, etc.)
   - View, download, delete documents

2. **RAG (Retrieval Augmented Generation) System**
   - Extract text from documents
   - Chunk content intelligently
   - Generate embeddings (OpenAI)
   - Store in vector database (Convex RAG)

3. **AI Chatbot Interface**
   - Ask questions in German
   - Get answers with source citations
   - Click to open/download PDFs
   - Streaming responses (Vercel AI SDK)

### Why This Order?
- **Documents first**: Need content before RAG works
- **RAG second**: Need indexed content before chatbot works
- **Chatbot last**: Brings everything together
- **Auth later**: Core functionality doesn't depend on it

### Key Principles
- ✅ **No hallucinations**: AI only uses uploaded documents
- ✅ **Always cite sources**: Every answer includes document + page numbers
- ✅ **German UI**: All user-facing text in German
- ✅ **English code**: All code, comments, variables in English
- ✅ **Production-ready**: Real-time, scalable, GDPR-compliant

---

## Technical Architecture

### Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                     │
│  - App Router (Server Components by default)            │
│  - TypeScript + Tailwind CSS                            │
│  - Shadcn UI (pre-installed)                            │
│  - Vercel AI SDK (useChat hook)                         │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ Convex Client SDK
                      │
┌─────────────────────▼───────────────────────────────────┐
│                  Convex Backend                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Database (Reactive, Real-time)                  │   │
│  │  - documents, categories, audit_logs             │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  File Storage (Native)                           │   │
│  │  - PDFs, DOCX, XLSX, images                      │   │
│  │  - Signed URLs for secure access                 │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  RAG Component (@convex-dev/rag)                 │   │
│  │  - Vector embeddings (OpenAI)                    │   │
│  │  - Semantic search                               │   │
│  │  - Chunk management                              │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Actions (Serverless Functions)                  │   │
│  │  - Document ingestion                            │   │
│  │  - Text extraction (pdf-parse, mammoth, xlsx)    │   │
│  │  - AI chat (OpenAI GPT-4o-mini)                  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ External APIs
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
   │ OpenAI  │  │ Vercel  │  │  Convex │
   │   API   │  │   AI    │  │  Cloud  │
   └─────────┘  └─────────┘  └─────────┘
```

### Data Flow

**Document Upload Flow:**
```
User uploads PDF
  ↓
Next.js frontend
  ↓
Convex mutation (generateUploadUrl)
  ↓
Upload to Convex Storage (get storageId)
  ↓
Convex action (processDocument)
  ↓
Extract text (pdf-parse)
  ↓
Chunk content (~500 tokens)
  ↓
Generate embeddings (OpenAI)
  ↓
Store in RAG (rag.add)
  ↓
Save metadata to database
  ↓
Document ready for search
```

**AI Chat Flow:**
```
User asks question (German)
  ↓
Next.js frontend (useChat hook)
  ↓
Convex action (chat)
  ↓
RAG search (rag.search)
  ↓
Retrieve top 5-10 chunks
  ↓
Build prompt with context
  ↓
OpenAI GPT-4o-mini (streaming)
  ↓
Stream response to frontend
  ↓
Display answer + citations
  ↓
User clicks citation → opens PDF
```

---

## Setup & Installation

### Prerequisites
- ✅ Node.js 18+ installed
- ✅ Next.js project initialized
- ✅ Shadcn UI components installed
- ✅ Git repository set up

### Step 1: Install Convex

```bash
# Install Convex CLI and client
npm install convex

# Initialize Convex in your project
npx convex dev
```

This will:
- Create `convex/` directory
- Generate `convex.config.ts`
- Set up `.env.local` with `CONVEX_URL`
- Start Convex dev server

### Step 2: Install Convex RAG Component

```bash
# Install RAG component
npm install @convex-dev/rag
```

Update `convex/convex.config.ts`:
```typescript
import { defineApp } from "convex/server";
import rag from "@convex-dev/rag/convex.config";

const app = defineApp();
app.use(rag);

export default app;
```

### Step 3: Install AI SDK

```bash
# Install Vercel AI SDK
npm install ai @ai-sdk/openai @ai-sdk/react

# Install document processing libraries
npm install pdf-parse mammoth xlsx
```

### Step 4: Environment Variables

Create/update `.env.local`:
```bash
# Convex (auto-generated)
CONVEX_URL=https://your-deployment.convex.cloud

# OpenAI API
OPENAI_API_KEY=sk-...

# Next.js (for client-side)
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

### Step 5: Project Structure

```
germany-dentist/
├── convex/
│   ├── _generated/          # Auto-generated types
│   ├── schema.ts            # Database schema
│   ├── rag.ts              # RAG configuration
│   ├── documents.ts        # Document CRUD
│   ├── categories.ts       # Category management
│   ├── chat.ts             # AI chat actions
│   ├── http.ts             # HTTP routes (file upload)
│   └── lib/
│       ├── textExtraction.ts  # PDF/DOCX/XLSX parsing
│       └── chunking.ts        # Text chunking logic
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── documents/
│   │   │   │   └── page.tsx
│   │   │   ├── chat/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/              # Shadcn components
│   │   ├── documents/
│   │   │   ├── document-card.tsx
│   │   │   ├── document-upload.tsx
│   │   │   └── category-sidebar.tsx
│   │   └── chat/
│   │       ├── chat-interface.tsx
│   │       ├── message-list.tsx
│   │       └── source-citation.tsx
│   └── lib/
│       └── utils.ts
├── instructions/
│   ├── prd.md
│   ├── phase-1.md
│   └── clienplan.md
└── package.json
```

---

## Implementation Steps

### Week 1: Convex Setup + Database Schema

#### Task 1.1: Define Database Schema

**File:** `convex/schema.ts`

**Schema Design:**
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Categories for organizing documents
  categories: defineTable({
    name: v.string(),              // Internal name (English)
    nameGerman: v.string(),        // Display name (German)
    description: v.string(),       // Category description
    icon: v.optional(v.string()), // Icon name (lucide-react)
    order: v.number(),             // Display order
    parentId: v.optional(v.id("categories")), // For subcategories
    createdAt: v.number(),
  })
    .index("by_order", ["order"])
    .index("by_parent", ["parentId"]),

  // Documents (PDFs, DOCX, XLSX, images)
  documents: defineTable({
    title: v.string(),
    category: v.id("categories"),
    subcategory: v.optional(v.id("categories")),
    storageId: v.id("_storage"),   // Convex file storage ID
    fileType: v.union(
      v.literal("pdf"),
      v.literal("docx"),
      v.literal("xlsx"),
      v.literal("image")
    ),
    fileSize: v.number(),          // Bytes
    uploadedBy: v.string(),        // User ID (Phase 3)
    uploadedAt: v.number(),
    ragEntryId: v.optional(v.string()), // RAG entry ID
    status: v.union(
      v.literal("processing"),
      v.literal("ready"),
      v.literal("error")
    ),
    metadata: v.object({
      pageCount: v.optional(v.number()),
      version: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      errorMessage: v.optional(v.string()),
    }),
  })
    .index("by_category", ["category"])
    .index("by_status", ["status"])
    .index("by_uploaded_at", ["uploadedAt"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["category", "fileType"],
    }),

  // Audit logs for compliance
  audit_logs: defineTable({
    userId: v.string(),
    action: v.union(
      v.literal("document_uploaded"),
      v.literal("document_viewed"),
      v.literal("document_deleted"),
      v.literal("chat_query")
    ),
    resourceId: v.optional(v.string()),
    resourceType: v.optional(v.union(
      v.literal("document"),
      v.literal("category"),
      v.literal("chat")
    )),
    metadata: v.any(),
    timestamp: v.number(),
    ipAddress: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_action", ["action"]),
});
```

**Key Design Decisions:**
- `storageId`: References Convex file storage (built-in)
- `ragEntryId`: Links to RAG component entry
- `status`: Tracks document processing state
- `searchIndex`: Enables full-text search on titles
- `audit_logs`: GDPR compliance (track all actions)

#### Task 1.2: Seed Initial Categories

**File:** `convex/categories.ts`

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Seed default categories (run once)
export const seedCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const categories = [
      {
        name: "laws",
        nameGerman: "Gesetze und Rechtliche Grundlagen",
        description: "Legal foundations and regulations",
        icon: "scale",
        order: 1,
      },
      {
        name: "quality_assurance",
        nameGerman: "Qualitätssicherung",
        description: "Quality management documents",
        icon: "shield-check",
        order: 2,
      },
      {
        name: "hygiene",
        nameGerman: "Hygiene und Medizinprodukte",
        description: "Hygiene plans and medical device protocols",
        icon: "droplet",
        order: 3,
      },
      {
        name: "personnel",
        nameGerman: "Personal",
        description: "HR documents and employee forms",
        icon: "users",
        order: 4,
      },
      {
        name: "forms",
        nameGerman: "Formulare",
        description: "Forms and templates",
        icon: "file-text",
        order: 5,
      },
      {
        name: "contracts",
        nameGerman: "Verträge",
        description: "Contracts and agreements",
        icon: "file-signature",
        order: 6,
      },
      {
        name: "inspection",
        nameGerman: "Praxisbegehung",
        description: "Practice inspection preparation",
        icon: "clipboard-check",
        order: 7,
      },
      {
        name: "bus_service",
        nameGerman: "BuS-Dienst",
        description: "Occupational health service",
        icon: "heart-pulse",
        order: 8,
      },
    ];

    for (const category of categories) {
      await ctx.db.insert("categories", {
        ...category,
        createdAt: Date.now(),
      });
    }

    return { success: true, count: categories.length };
  },
});

// Get all categories
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_order")
      .collect();
  },
});
```

**Usage:**
```bash
# Run in Convex dashboard or via CLI
npx convex run categories:seedCategories
```

---

### Week 2: Document Upload & Storage

#### Task 2.1: File Upload Mutation

**File:** `convex/documents.ts`

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate upload URL for client
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Save document metadata after upload
export const create = mutation({
  args: {
    title: v.string(),
    category: v.id("categories"),
    subcategory: v.optional(v.id("categories")),
    storageId: v.id("_storage"),
    fileType: v.union(
      v.literal("pdf"),
      v.literal("docx"),
      v.literal("xlsx"),
      v.literal("image")
    ),
    fileSize: v.number(),
    uploadedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const documentId = await ctx.db.insert("documents", {
      ...args,
      uploadedAt: Date.now(),
      status: "processing",
      metadata: {},
    });

    // Log audit trail
    await ctx.db.insert("audit_logs", {
      userId: args.uploadedBy,
      action: "document_uploaded",
      resourceId: documentId,
      resourceType: "document",
      metadata: { title: args.title, fileType: args.fileType },
      timestamp: Date.now(),
    });

    return documentId;
  },
});

// Get all documents
export const list = query({
  args: {
    category: v.optional(v.id("categories")),
    fileType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("documents");

    if (args.category) {
      query = query.withIndex("by_category", (q) =>
        q.eq("category", args.category)
      );
    }

    const documents = await query.collect();

    // Filter by fileType if provided
    if (args.fileType) {
      return documents.filter((doc) => doc.fileType === args.fileType);
    }

    return documents;
  },
});

// Get single document
export const get = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get download URL
export const getDownloadUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Delete document
export const remove = mutation({
  args: {
    id: v.id("documents"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.id);
    if (!document) throw new Error("Document not found");

    // Delete from storage
    await ctx.storage.delete(document.storageId);

    // Delete from database
    await ctx.db.delete(args.id);

    // Log audit trail
    await ctx.db.insert("audit_logs", {
      userId: args.userId,
      action: "document_deleted",
      resourceId: args.id,
      resourceType: "document",
      metadata: { title: document.title },
      timestamp: Date.now(),
    });

    return { success: true };
  },
});
```

**Key Features:**
- `generateUploadUrl`: Secure, pre-signed URL for direct upload
- `create`: Saves metadata after successful upload
- `getDownloadUrl`: Generates signed URL for downloading
- `remove`: Deletes from both storage and database
- Audit logging for all operations

---

*Continued in next section...*
