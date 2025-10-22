"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Bot, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Source {
  title: string;
  entryId: string;
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export function ChatMessage({ role, content, sources }: ChatMessageProps) {
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
            {sources.map((source) => (
              <Button
                key={source.entryId}
                variant="outline"
                size="sm"
                className="justify-start text-xs h-auto py-1"
                onClick={() => {
                  // TODO: Navigate to document viewer
                  console.log('Open document:', source.entryId);
                }}
              >
                <FileText className="mr-2 h-3 w-3" />
                {source.title}
              </Button>
            ))}
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
