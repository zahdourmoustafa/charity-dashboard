import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create new category
export const create = mutation({
  args: {
    name: v.string(),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the highest order number
    const categories = await ctx.db.query("categories").collect();
    const maxOrder = Math.max(...categories.map((c) => c.order), 0);

    const categoryId = await ctx.db.insert("categories", {
      name: args.name,
      description: "",
      icon: args.icon || "folder",
      order: maxOrder + 1,
      createdAt: Date.now(),
    });

    return categoryId;
  },
});

// Update category
export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.string(),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      name: args.name,
      ...(args.icon && { icon: args.icon }),
    });
  },
});

// Delete category
export const remove = mutation({
  args: {
    id: v.id("categories"),
  },
  handler: async (ctx, args) => {
    // Check if category has documents
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_category", (q) => q.eq("category", args.id))
      .collect();

    if (documents.length > 0) {
      throw new Error("Cannot delete category with documents");
    }

    await ctx.db.delete(args.id);
  },
});

// Get all categories
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("categories").order("asc").collect();
  },
});

// Get single category
export const get = query({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get category with document count
export const listWithCounts = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").order("asc").collect();
    
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const documents = await ctx.db
          .query("documents")
          .withIndex("by_category", (q) => q.eq("category", category._id))
          .collect();
        
        return {
          ...category,
          documentCount: documents.length,
        };
      })
    );

    return categoriesWithCounts;
  },
});

// Seed default categories (optional - for demo)
export const seedCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("categories").collect();
    if (existing.length > 0) {
      return { success: false, message: "Categories already exist" };
    }

    const categories = [
      { name: "Laws and Legal Foundations", description: "", icon: "scale", order: 1 },
      { name: "Quality Assurance", description: "", icon: "shield-check", order: 2 },
      { name: "Hygiene and Medical Devices", description: "", icon: "droplet", order: 3 },
      { name: "Personnel", description: "", icon: "users", order: 4 },
      { name: "Forms", description: "", icon: "file-text", order: 5 },
      { name: "Contracts", description: "", icon: "file-signature", order: 6 },
      { name: "Practice Inspection", description: "", icon: "clipboard-check", order: 7 },
      { name: "Emergency Service", description: "", icon: "heart-pulse", order: 8 },
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
