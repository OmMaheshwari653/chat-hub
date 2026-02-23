"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { UserAvatar } from "./UserAvatar";
import { cn, formatMessageTime, getDisplayName } from "@/lib/utils";

const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];

interface ChatViewProps {
  conversationId: Id<"conversations">;
}

export function ChatView({ conversationId }: ChatViewProps) {
  const conversation = useQuery(api.conversations.get, { conversationId });
  const messages = useQuery(api.messages.list, { conversationId });
  const typingUsers = useQuery(api.messages.getTyping, { conversationId });
  const sendMessage = useMutation(api.messages.send);
  const deleteMessage = useMutation(api.messages.remove);
  const toggleReaction = useMutation(api.messages.toggleReaction);
  const setTyping = useMutation(api.messages.setTyping);
  const markRead = useMutation(api.conversations.markRead);

  const [input, setInput] = useState("");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingMsg, setPendingMsg] = useState<string | null>(null);
  const [reactionMenuId, setReactionMenuId] = useState<Id<"messages"> | null>(
    null,
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);
  const userScrolledUp = useRef(false);

  // Mark as read when messages change
  useEffect(() => {
    markRead({ conversationId });
  }, [conversationId, markRead, messages]);

  // Track scroll position
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    userScrolledUp.current = !atBottom;
    setShowScrollBtn(!atBottom && (messages?.length ?? 0) > 0);
  }, [messages]);

  // Scroll to bottom
  const scrollToBottom = useCallback((force = false) => {
    if (force || !userScrolledUp.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle typing + send typing indicator
  const handleInputChange = (value: string) => {
    setInput(value);
    setError(null);

    if (value.trim()) {
      setTyping({ conversationId, isTyping: true });
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        setTyping({ conversationId, isTyping: false });
      }, 2000);
    } else {
      setTyping({ conversationId, isTyping: false });
    }
  };

  // Send message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;

    setInput("");
    setPendingMsg(content);
    setError(null);

    try {
      await sendMessage({ conversationId, content });
      setPendingMsg(null);
    } catch {
      setError("Failed to send. Click to retry.");
      setPendingMsg(null);
      setInput(content);
    }
  };

  // Loading state
  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const otherUser = conversation.participants[0];
  const chatName = conversation.isGroup
    ? conversation.name
    : otherUser
      ? getDisplayName(otherUser)
      : "Chat";

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="flex h-16 items-center gap-3 border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
        <Link
          href="/chat"
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <BackIcon />
        </Link>

        {conversation.isGroup ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-500 text-sm font-medium text-white">
            {(conversation.name || "G").slice(0, 2).toUpperCase()}
          </div>
        ) : (
          <UserAvatar
            imageUrl={otherUser?.imageUrl}
            name={chatName || "Chat"}
            size="md"
            showStatus
            isOnline={otherUser?.isOnline}
          />
        )}

        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {chatName}
          </h2>
          <p className="text-xs text-gray-500">
            {conversation.isGroup
              ? `${conversation.participants.length + 1} members`
              : otherUser?.isOnline
                ? "Online"
                : "Offline"}
          </p>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4"
      >
        <div className="mx-auto max-w-3xl space-y-4">
          {!messages || messages.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              {conversation.isGroup ? (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-500 text-2xl font-medium text-white">
                  {(conversation.name || "G").slice(0, 2).toUpperCase()}
                </div>
              ) : (
                <UserAvatar
                  imageUrl={otherUser?.imageUrl}
                  name={chatName || "Chat"}
                  size="xl"
                />
              )}
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                {chatName}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {conversation.isGroup
                  ? "Send the first message to start the conversation"
                  : `Start your conversation with ${chatName}`}
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg._id}
                message={msg}
                onDelete={() => deleteMessage({ messageId: msg._id })}
                onReact={(emoji) =>
                  toggleReaction({ messageId: msg._id, emoji })
                }
                showReactionMenu={reactionMenuId === msg._id}
                onToggleReactionMenu={() =>
                  setReactionMenuId(reactionMenuId === msg._id ? null : msg._id)
                }
              />
            ))
          )}

          {/* Optimistic pending message */}
          {pendingMsg && (
            <div className="flex justify-end">
              <div className="max-w-xs rounded-2xl rounded-tr-sm bg-blue-500 px-4 py-2 opacity-70">
                <p className="text-sm text-white">{pendingMsg}</p>
                <p className="mt-1 text-xs text-blue-200">Sending...</p>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Typing indicator */}
      {typingUsers && typingUsers.length > 0 && (
        <div className="border-t border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto max-w-3xl">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium">{typingUsers.join(", ")}</span>
              {typingUsers.length === 1 ? " is" : " are"} typing
              <TypingDots />
            </p>
          </div>
        </div>
      )}

      {/* Scroll-to-bottom button */}
      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-24 right-6 flex items-center gap-2 rounded-full bg-gray-800 px-4 py-2 text-sm text-white shadow-lg hover:bg-gray-700"
        >
          <DownIcon /> New messages
        </button>
      )}

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        {error && (
          <div className="mx-auto mb-2 max-w-3xl">
            <button
              onClick={handleSend}
              className="w-full rounded-lg bg-red-50 p-2 text-sm text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
            >
              {error}
            </button>
          </div>
        )}
        <form
          onSubmit={handleSend}
          className="mx-auto flex max-w-3xl items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full border-0 bg-gray-100 px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <SendIcon />
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Message Bubble ── */

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

interface MessageData {
  _id: Id<"messages">;
  content: string;
  isDeleted: boolean;
  createdAt: number;
  senderName: string;
  senderImage?: string;
  isOwn: boolean;
  reactions: Reaction[];
}

function MessageBubble({
  message,
  onDelete,
  onReact,
  showReactionMenu,
  onToggleReactionMenu,
}: {
  message: MessageData;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  showReactionMenu: boolean;
  onToggleReactionMenu: () => void;
}) {
  return (
    <div
      className={cn(
        "flex gap-2",
        message.isOwn ? "flex-row-reverse" : "flex-row",
      )}
    >
      {!message.isOwn && (
        <UserAvatar
          imageUrl={message.senderImage}
          name={message.senderName}
          size="sm"
        />
      )}

      <div
        className={cn(
          "group relative max-w-xs lg:max-w-md",
          message.isOwn && "text-right",
        )}
      >
        {/* Sender name (only for received messages) */}
        {!message.isOwn && (
          <p className="mb-1 text-xs font-medium text-gray-500">
            {message.senderName}
          </p>
        )}

        {/* Bubble */}
        <div
          className={cn(
            "relative inline-block rounded-2xl px-4 py-2",
            message.isOwn
              ? "rounded-tr-sm bg-blue-600 text-white"
              : "rounded-tl-sm bg-white text-gray-900 shadow dark:bg-gray-800 dark:text-white",
          )}
        >
          {message.isDeleted ? (
            <p className="text-sm italic opacity-70">
              This message was deleted
            </p>
          ) : (
            <p className="text-sm">{message.content}</p>
          )}

          {/* Hover actions */}
          {!message.isDeleted && (
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100",
                message.isOwn ? "-left-20" : "-right-20",
              )}
            >
              <div className="flex items-center gap-1">
                <button
                  onClick={onToggleReactionMenu}
                  className="rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  <EmojiIcon />
                </button>
                {message.isOwn && (
                  <button
                    onClick={onDelete}
                    className="rounded-full bg-gray-100 p-1.5 text-red-500 hover:bg-red-50 dark:bg-gray-700"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reactions */}
        {message.reactions.length > 0 && (
          <div
            className={cn(
              "mt-1 flex flex-wrap gap-1",
              message.isOwn ? "justify-end" : "justify-start",
            )}
          >
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReact(r.emoji)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                  r.hasReacted
                    ? "bg-blue-100 dark:bg-blue-900/30"
                    : "bg-gray-100 dark:bg-gray-700",
                )}
                title={r.users.join(", ")}
              >
                {r.emoji} {r.count}
              </button>
            ))}
          </div>
        )}

        {/* Reaction picker */}
        {showReactionMenu && (
          <div
            className={cn(
              "absolute bottom-full mb-2 flex gap-1 rounded-full bg-white p-1 shadow-lg dark:bg-gray-800",
              message.isOwn ? "right-0" : "left-0",
            )}
          >
            {EMOJI_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(emoji);
                  onToggleReactionMenu();
                }}
                className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p
          className={cn(
            "mt-1 text-xs text-gray-400",
            message.isOwn && "text-right",
          )}
        >
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

/* ── Typing dots ── */

function TypingDots() {
  return (
    <span className="ml-1 inline-flex">
      <span className="animate-bounce animation-delay-0">.</span>
      <span className="animate-bounce animation-delay-150">.</span>
      <span className="animate-bounce animation-delay-300">.</span>
    </span>
  );
}

/* ── Icons ── */

function BackIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 19l-7-7 7-7"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      className="h-5 w-5 rotate-90"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      />
    </svg>
  );
}

function DownIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 14l-7 7m0 0l-7-7m7 7V3"
      />
    </svg>
  );
}

function EmojiIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}
