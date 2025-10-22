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
    nameGerman: string;
  } | null;
}

export function CategoryDialog({ open, onClose, category }: CategoryDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const createCategory = useMutation(api.categories.create);
  const updateCategory = useMutation(api.categories.update);

  useEffect(() => {
    if (category) {
      setName(category.nameGerman);
    } else {
      setName("");
    }
  }, [category, open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Bitte geben Sie einen Namen ein");
      return;
    }

    setLoading(true);

    try {
      if (category) {
        await updateCategory({
          id: category._id,
          nameGerman: name.trim(),
        });
        toast.success("Kategorie aktualisiert");
      } else {
        await createCategory({
          name: name.trim(),
          nameGerman: name.trim(),
        });
        toast.success("Kategorie erstellt");
      }
      onClose();
      setName("");
    } catch (error) {
      toast.error("Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {category ? "Kategorie umbenennen" : "Neue Kategorie"}
          </DialogTitle>
          <DialogDescription>
            {category
              ? "Ändern Sie den Namen der Kategorie"
              : "Erstellen Sie eine neue Kategorie für Ihre Dokumente"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Kategoriename</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Hygiene, Personal, Formulare"
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
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Speichern...
              </>
            ) : (
              "Speichern"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
