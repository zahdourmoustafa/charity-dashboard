"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Folder, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

interface CategoryCardProps {
  category: {
    _id: Id<"categories">;
    name: string;
    icon?: string;
    documentCount: number;
  };
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CategoryCard({
  category,
  onClick,
  onEdit,
  onDelete,
}: CategoryCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1" onClick={onClick}>
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-lg bg-primary/10 p-3">
                <Folder className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{category.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {category.documentCount} {category.documentCount === 1 ? "Document" : "Documents"}
                </p>
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-red-600"
                disabled={category.documentCount > 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
