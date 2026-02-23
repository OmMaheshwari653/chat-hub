"use client";

import { useParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { Sidebar } from "@/components/Sidebar";
import { ChatView } from "@/components/ChatView";

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.chatId as Id<"conversations">;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - Hidden on mobile when viewing a conversation */}
      <div className="hidden md:block md:w-80">
        <Sidebar />
      </div>

      {/* Chat View - Full screen on mobile */}
      <main className="relative flex-1">
        <ChatView conversationId={conversationId} />
      </main>
    </div>
  );
}
