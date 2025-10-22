"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
}

export function PdfViewerModal({ isOpen, onClose, fileUrl, fileName }: PdfViewerModalProps) {
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] p-0 m-0">
        <div className="h-full flex flex-col">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold truncate">{fileName}</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
              <Viewer fileUrl={fileUrl} plugins={[defaultLayoutPluginInstance]} />
            </Worker>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
