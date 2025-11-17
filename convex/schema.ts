import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Categories for organizing documents
  categories: defineTable({
    name: v.string(),              // Display name
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
      chunkCount: v.optional(v.number()),
      wordCount: v.optional(v.number()),
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
