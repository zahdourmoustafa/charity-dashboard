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
