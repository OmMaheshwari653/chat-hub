/**
 * Skeleton loader components for the chat app.
 * These show placeholder UI while real data is loading,
 * so users see a smooth experience instead of blank screens.
 */

import { cn } from "@/lib/utils";

// Basic building block — a single pulsing rectangle
function SkeletonBox({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200 dark:bg-gray-700",
        className,
      )}
    />
  );
}

/* ─── Sidebar Skeletons ─── */

// One fake conversation row in the sidebar
function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg p-3">
      {/* Avatar circle */}
      <SkeletonBox className="h-10 w-10 shrink-0 rounded-full" />

      <div className="min-w-0 flex-1 space-y-2">
        {/* Name + time row */}
        <div className="flex items-center justify-between">
          <SkeletonBox className="h-3.5 w-28" />
          <SkeletonBox className="h-3 w-10" />
        </div>
        {/* Last message preview */}
        <SkeletonBox className="h-3 w-40" />
      </div>
    </div>
  );
}

// Full sidebar skeleton list — renders multiple fake rows
export function SidebarSkeleton() {
  return (
    <div className="space-y-1 p-2">
      <div className="mb-2 flex items-center justify-between px-2">
        <SkeletonBox className="h-3 w-12" />
        <SkeletonBox className="h-3 w-16" />
      </div>
      {/* Show 6 skeleton rows to fill the sidebar */}
      {Array.from({ length: 6 }).map((_, i) => (
        <ConversationSkeleton key={i} />
      ))}
    </div>
  );
}

/* ─── Chat View Skeletons ─── */

// Fake chat header (avatar + name)
export function ChatHeaderSkeleton() {
  return (
    <header className="flex h-16 items-center gap-3 border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
      <SkeletonBox className="h-10 w-10 shrink-0 rounded-full" />
      <div className="space-y-2">
        <SkeletonBox className="h-4 w-32" />
        <SkeletonBox className="h-3 w-16" />
      </div>
    </header>
  );
}

// A single fake message bubble (alternates left/right)
function MessageSkeleton({ isOwn }: { isOwn: boolean }) {
  return (
    <div className={cn("flex gap-2", isOwn ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar (only on received side) */}
      {!isOwn && <SkeletonBox className="h-8 w-8 shrink-0 rounded-full" />}

      <div className={cn("max-w-xs space-y-2", isOwn && "text-right")}>
        {/* Sender name for received messages */}
        {!isOwn && <SkeletonBox className="h-3 w-16" />}
        {/* Message bubble */}
        <SkeletonBox
          className={cn(
            "h-10 rounded-2xl",
            isOwn ? "ml-auto w-44 rounded-tr-sm" : "w-56 rounded-tl-sm",
          )}
        />
        {/* Timestamp */}
        <SkeletonBox className={cn("h-2.5 w-12", isOwn && "ml-auto")} />
      </div>
    </div>
  );
}

// Full chat area skeleton — header + messages + input
export function ChatViewSkeleton() {
  // Alternate between sent and received to look realistic
  const pattern = [false, false, true, false, true, true, false];

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
      <ChatHeaderSkeleton />

      {/* Message area */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {pattern.map((isOwn, i) => (
            <MessageSkeleton key={i} isOwn={isOwn} />
          ))}
        </div>
      </div>

      {/* Input area skeleton */}
      <div className="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <SkeletonBox className="h-11 flex-1 rounded-full" />
          <SkeletonBox className="h-11 w-11 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export { SkeletonBox };
