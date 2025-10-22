import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
      <Card className="p-12 text-center">
        <MessageSquare className="mx-auto h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-2xl font-bold">AI-Assistent</h2>
        <p className="mt-2 text-muted-foreground">
          Wird in Schritt 7 implementiert
        </p>
      </Card>
    </div>
  );
}
