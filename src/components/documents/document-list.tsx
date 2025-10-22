"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Trash2, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Id } from "../../../convex/_generated/dataModel";

interface Document {
  _id: Id<"documents">;
  title: string;
  fileType: string;
  fileSize: number;
  uploadedAt: number;
  status: "processing" | "ready" | "error";
  storageId: Id<"_storage">;
}

interface DocumentListProps {
  documents: Document[];
  viewMode: "grid" | "list";
}

export function DocumentList({ documents, viewMode }: DocumentListProps) {
  const removeDocument = useMutation(api.documents.remove);

  const handleDownload = async (doc: Document) => {
    try {
      // Open download in new tab - Convex will handle the URL generation
      const url = `${process.env.NEXT_PUBLIC_CONVEX_URL}/api/storage/${doc.storageId}`;
      window.open(url, "_blank");
    } catch {
      toast.error("Fehler beim Herunterladen");
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Möchten Sie "${doc.title}" wirklich löschen?`)) return;

    try {
      await removeDocument({
        id: doc._id,
        userId: "admin", // TODO: Get from auth
      });
      toast.success("Dokument gelöscht");
    } catch {
      toast.error("Fehler beim Löschen");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ready":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "processing":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "ready":
        return "Bereit";
      case "processing":
        return "Verarbeitung";
      case "error":
        return "Fehler";
      default:
        return status;
    }
  };

  if (viewMode === "grid") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {documents.map((doc) => (
          <Card key={doc._id} className="flex flex-col">
            <CardContent className="flex-1 pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{doc.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {doc.fileType.toUpperCase()} • {(doc.fileSize / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                {getStatusIcon(doc.status)}
                <span className="text-sm text-muted-foreground">
                  {getStatusText(doc.status)}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatDistanceToNow(doc.uploadedAt, { addSuffix: true, locale: de })}
              </p>
            </CardContent>
            <CardFooter className="flex gap-2 pt-0">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleDownload(doc)}
                disabled={doc.status !== "ready"}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(doc)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <Card key={doc._id}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="rounded-lg bg-primary/10 p-2">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{doc.title}</h3>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{doc.fileType.toUpperCase()}</span>
                  <span>•</span>
                  <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(doc.status)}
                    <span>{getStatusText(doc.status)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(doc)}
                disabled={doc.status !== "ready"}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(doc)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
