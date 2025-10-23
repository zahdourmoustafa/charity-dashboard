"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { searchPlugin } from "@react-pdf-viewer/search";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import { getFilePlugin } from "@react-pdf-viewer/get-file";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Loader2 } from "lucide-react";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/search/lib/styles/index.css";
import "@react-pdf-viewer/zoom/lib/styles/index.css";

interface SourcePreviewSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  source: {
    title: string;
    entryId: string;
    chunkText: string;
    pageNumber?: number;
  } | null;
}

export function SourcePreviewSidebar({ isOpen, onClose, source }: SourcePreviewSidebarProps) {
  console.log("SourcePreviewSidebar - source:", source);
  
  // Try to get document by entryId first
  const documentByEntry = useQuery(
    api.documents.getByEntryId,
    source && source.entryId ? { entryId: source.entryId } : "skip"
  );
  
  // Fallback to title search if entryId query returns null or if no entryId
  const documentByTitle = useQuery(
    api.documents.getByTitle,
    source && (!source.entryId || documentByEntry === null) ? { title: source.title } : "skip"
  );
  
  const document = documentByEntry || documentByTitle;
  
  console.log("SourcePreviewSidebar - documentByEntry:", documentByEntry);
  console.log("SourcePreviewSidebar - documentByTitle:", documentByTitle);
  console.log("SourcePreviewSidebar - document:", document);
  
  const downloadUrl = useQuery(
    api.documents.getDownloadUrl,
    document ? { storageId: document.storageId } : "skip"
  );
  
  console.log("SourcePreviewSidebar - downloadUrl:", downloadUrl);

  const searchPluginInstance = searchPlugin({
    keyword: source?.chunkText.slice(0, 100) || "",
  });

  const zoomPluginInstance = zoomPlugin();
  const { ZoomIn, ZoomOut, Zoom } = zoomPluginInstance;

  const getFilePluginInstance = getFilePlugin();
  const { Download } = getFilePluginInstance;

  if (!source) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[600px] sm:max-w-[600px] p-0">
        <div className="h-full flex flex-col">
          <SheetHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-left">
                {source.title}
                {source.pageNumber && ` - Seite ${source.pageNumber}`}
              </SheetTitle>
              <div className="flex gap-2 items-center">
                <ZoomOut />
                <Zoom />
                <ZoomIn />
                <div className="border-l pl-2 ml-2 mr-8">
                  <Download />
                </div>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-hidden">
            {downloadUrl && document?.fileType === "pdf" ? (
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <Viewer
                  fileUrl={downloadUrl}
                  plugins={[searchPluginInstance, zoomPluginInstance, getFilePluginInstance]}
                  initialPage={source.pageNumber ? source.pageNumber - 1 : 0}
                />
              </Worker>
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>

          <div className="border-t p-4 bg-muted/50 max-h-[200px] overflow-y-auto">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              📝 Relevanter Abschnitt:
            </p>
            <Card className="p-3">
              <p className="text-sm whitespace-pre-wrap">{source.chunkText}</p>
            </Card>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
