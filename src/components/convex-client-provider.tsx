"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

// Only create Convex client if we have the URL (prevents build-time errors)
const convex = process.env.NEXT_PUBLIC_CONVEX_URL 
  ? new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL)
  : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  // If no Convex URL, just return children without provider
  if (!convex) {
    return <>{children}</>;
  }
  
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
