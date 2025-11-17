import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create or update lead
export const upsert = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    jobTitle: v.string(),
    department: v.string(),
    startDate: v.string(),
    manager: v.string(),
    equipment: v.string(),
    status: v.optional(v.string()),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if lead exists by email
    const existing = await ctx.db
      .query("leads")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      // Update existing lead
      await ctx.db.patch(existing._id, {
        name: args.name,
        jobTitle: args.jobTitle,
        department: args.department,
        startDate: args.startDate,
        manager: args.manager,
        equipment: args.equipment,
        status: args.status,
        timestamp: args.timestamp,
      });
      return existing._id;
    } else {
      // Create new lead
      return await ctx.db.insert("leads", {
        ...args,
        createdAt: Date.now(),
      });
    }
  },
});

// List all leads
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("leads").order("desc").collect();
  },
});

// Get lead by ID
export const get = query({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Delete lead
export const remove = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
