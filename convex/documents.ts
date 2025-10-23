import { mutation, query, internalMutation, action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";
import { rag } from "./rag";
import { extractText } from "./lib/textExtraction";
import { chunkText } from "./lib/chunking";

// Search document titles (for AI fallback)
export const searchTitles = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("documents")
      .withSearchIndex("search_title", (q) => q.search("title", args.query))
      .filter((q) => q.eq(q.field("status"), "ready"))
      .take(5);
    
    return results.map((doc) => ({
      title: doc.title,
      fileType: doc.fileType,
    }));
  },
});

// Get document by RAG entry ID
export const getByEntryId = query({
  args: {
    entryId: v.string(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("ragEntryId"), args.entryId))
      .first();
    
    return doc ? {
      _id: doc._id,
      title: doc.title,
      fileType: doc.fileType,
      storageId: doc.storageId,
    } : null;
  },
});

// Get all document titles for fuzzy search
export const getAllTitles = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("status"), "ready"))
      .collect();
    
    return docs.map((doc) => ({
      _id: doc._id,
      title: doc.title,
      fileType: doc.fileType,
    }));
  },
});

// Get document by exact title match
export const getByTitle = query({
  args: {
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("title"), args.title))
      .filter((q) => q.eq(q.field("status"), "ready"))
      .first();
    
    return doc ? {
      _id: doc._id,
      title: doc.title,
      fileType: doc.fileType,
      storageId: doc.storageId,
    } : null;
  },
});

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
    let documents;

    if (args.category) {
      documents = await ctx.db
        .query("documents")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    } else {
      documents = await ctx.db.query("documents").collect();
    }

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

// Process document: extract text, chunk, embed
export const processDocument = action({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    // Get document metadata directly from database
    const document = await ctx.runQuery(api.documents.get, {
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

      // Step 2: Extract text with page tracking
      const { text, pageCount, metadata: extractionMetadata } = await extractText(
        buffer,
        document.fileType
      );

      if (!text || text.trim().length === 0) {
        throw new Error("No text extracted from document");
      }

      // Step 3: Chunk text with page number tracking
      const chunks = chunkText(
        text,
        extractionMetadata.pageTexts, // Pass page texts for better tracking
        2000, // chunk size
        200   // overlap
      );

      if (chunks.length === 0) {
        throw new Error("No chunks created from text");
      }

      // Step 4: Add to RAG with page metadata
      const { entryId } = await rag.add(ctx, {
        namespace: "practice",
        key: document._id,
        chunks: chunks.map((chunk) => ({
          text: chunk.text,
          metadata: {
            ...(chunk.pageNumber !== undefined && { pageNumber: chunk.pageNumber }),
            chunkIndex: chunk.chunkIndex,
          },
        })),
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
          ...(extractionMetadata.wordCount !== undefined && { 
            wordCount: extractionMetadata.wordCount 
          }),
        },
      });

      // Step 5: Update document status
      await ctx.runMutation(internal.documents.updateStatus, {
        documentId: args.documentId,
        status: "ready",
        ragEntryId: entryId,
        metadata: {
          pageCount,
          chunkCount: chunks.length,
          wordCount: extractionMetadata.wordCount,
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
          errorMessage: (error as Error).message,
        },
      });

      throw error;
    }
  },
});
