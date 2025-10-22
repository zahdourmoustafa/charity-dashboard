"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Id } from "../../../convex/_generated/dataModel";

interface DocumentUploadProps {
  open: boolean;
  onClose: () => void;
  categories: Array<{ _id: Id<"categories">; nameGerman: string }>;
  defaultCategory?: Id<"categories">;
}

export function DocumentUpload({
  open,
  onClose,
  categories,
  defaultCategory,
}: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Id<"categories"> | "">(defaultCategory || "");
  const [uploading, setUploading] = useState(false);

  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const getFileType = (file: File): "pdf" | "docx" | "xlsx" | "image" => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "pdf";
    if (ext === "docx" || ext === "doc") return "docx";
    if (ext === "xlsx" || ext === "xls") return "xlsx";
    return "image";
  };

  const handleUpload = async () => {
    if (!file || !title || !category) {
      toast.error("Bitte füllen Sie alle Felder aus");
      return;
    }

    setUploading(true);

    try {
      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await result.json();

      // Step 3: Save document metadata
      await createDocument({
        title,
        category: category as Id<"categories">,
        storageId,
        fileType: getFileType(file),
        fileSize: file.size,
        uploadedBy: "admin", // TODO: Get from auth
      });

      toast.success("Dokument erfolgreich hochgeladen");
      onClose();
      setFile(null);
      setTitle("");
      setCategory("");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Fehler beim Hochladen");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Dokument hochladen</DialogTitle>
          <DialogDescription>
            Laden Sie ein neues Dokument in Ihre Praxis hoch
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="file">Datei</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </div>
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{file.name}</span>
                <span>({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Hygieneplan 2024"
              disabled={uploading}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Kategorie</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Id<"categories">)} disabled={uploading}>
              <SelectTrigger>
                <SelectValue placeholder="Kategorie wählen" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat._id} value={cat._id}>
                    {cat.nameGerman}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={uploading}>
            Abbrechen
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !file || !title || !category}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Hochladen...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Hochladen
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
