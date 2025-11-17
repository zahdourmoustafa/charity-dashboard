"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Id } from "../../../convex/_generated/dataModel";

interface CategoryDialogProps {
  open: boolean;
  onClose: () => void;
  category?: {
    _id: Id<"categories">;
    name: string;
  } | null;
}

export function CategoryDialog({ open, onClose, category }: CategoryDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const createCategory = useMutation(api.categories.create);
  const updateCategory = useMutation(api.categories.update);

  useEffect(() => {
    if (category) {
      setName(category.name);
    } else {
      setName("");
    }
  }, [category, open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    setLoading(true);

    try {
      if (category) {
        await updateCategory({
          id: category._id,
          name: name.trim(),
        });
        toast.success("Category updated");
      } else {
        await createCategory({
          name: name.trim(),
        });
        toast.success("Category created");
      }
      onClose();
      setName("");
    } catch {
      toast.error("Error saving");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {category ? "Rename Category" : "New Category"}
          </DialogTitle>
          <DialogDescription>
            {category
              ? "Change the category name"
              : "Create a new category for your documents"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hygiene, Personnel, Forms"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                }
              }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
