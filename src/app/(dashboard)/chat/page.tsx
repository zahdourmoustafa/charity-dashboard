"use client";

import { useState, useRef, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";
import { MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ title: string; entryId: string }>;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatAction = useAction(api.chat.chat);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (message: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Call chat action
      const response = await chatAction({ message });

      // Add assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.response,
        sources: response.sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Fehler beim Senden der Nachricht");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    if (confirm("Möchten Sie den Chat-Verlauf wirklich löschen?")) {
      setMessages([]);
      toast.success("Chat-Verlauf gelöscht");
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-3xl font-bold">AI-Assistent</h1>
          <p className="text-muted-foreground">
            Stellen Sie Fragen zu Ihren Dokumenten
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClear}>
            <Trash2 className="mr-2 h-4 w-4" />
            Verlauf löschen
          </Button>
        )}
      </div>

      {/* Messages Area */}
      <Card className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">
                  Willkommen beim AI-Assistenten
                </h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-md">
                  Stellen Sie Fragen zu Ihren hochgeladenen Dokumenten. Der
                  Assistent durchsucht Ihre Dokumente und gibt Ihnen präzise
                  Antworten mit Quellenangaben.
                </p>
                <div className="mt-6 space-y-2 text-left">
                  <p className="text-sm font-medium">Beispielfragen:</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Was steht im Hygieneplan über Sterilisation?</li>
                    <li>• Welche Formulare brauche ich für neue Mitarbeiter?</li>
                    <li>• Wie oft muss die Praxisbegehung stattfinden?</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    sources={message.sources}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t p-4">
            <ChatInput onSend={handleSend} disabled={isLoading} />
          </div>
        </div>
      </Card>
    </div>
  );
}
