"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Bot, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Source {
  title: string;
  entryId: string;
  chunkText: string;
  pageNumber?: number;
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  onSourceClick?: (source: Source) => void;
}

export function ChatMessage({ role, content, sources, onSourceClick }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
          <Bot className="h-4 w-4 text-primary-foreground" />
        </div>
      )}

      <div className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start", "max-w-[80%]")}>
        <Card className={cn(
          "px-4 py-3",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </Card>

        {sources && sources.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Quellen:</p>
            <div className="flex flex-wrap gap-2">
              {sources.map((source, index) => (
                <Button
                  key={`${source.entryId}-${index}`}
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs h-auto py-1.5 px-3"
                  onClick={() => onSourceClick?.(source)}
                >
                  <span className="font-semibold mr-1">[{index + 1}]</span>
                  <FileText className="mr-1.5 h-3 w-3" />
                  {source.title}
                  {source.pageNumber && `, S. ${source.pageNumber}`}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
