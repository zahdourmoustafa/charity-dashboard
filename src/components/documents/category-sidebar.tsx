"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Scale,
  ShieldCheck,
  Droplet,
  Users,
  FileText,
  FileSignature,
  ClipboardCheck,
  HeartPulse,
  LucideIcon,
} from "lucide-react";

interface Category {
  _id: Id<"categories">;
  name: string;
  icon?: string;
}

interface CategorySidebarProps {
  categories: Category[];
  selectedCategory: Id<"categories"> | null;
  onSelectCategory: (categoryId: Id<"categories"> | null) => void;
}

const iconMap: Record<string, LucideIcon> = {
  scale: Scale,
  "shield-check": ShieldCheck,
  droplet: Droplet,
  users: Users,
  "file-text": FileText,
  "file-signature": FileSignature,
  "clipboard-check": ClipboardCheck,
  "heart-pulse": HeartPulse,
};

export function CategorySidebar({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategorySidebarProps) {
  return (
    <Card className="p-4">
      <h2 className="mb-4 font-semibold">Categories</h2>
      <div className="space-y-1">
        <Button
          variant={selectedCategory === null ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => onSelectCategory(null)}
        >
          <FileText className="mr-2 h-4 w-4" />
          All Documents
        </Button>
        {categories.map((category) => {
          const Icon = category.icon ? iconMap[category.icon] : FileText;
          return (
            <Button
              key={category._id}
              variant={selectedCategory === category._id ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => onSelectCategory(category._id)}
            >
              <Icon className="mr-2 h-4 w-4" />
              <span className="truncate">{category.name}</span>
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
