"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UserAvatar } from "./UserAvatar";
import {
  cn,
  formatMessageTime,
  getDisplayName,
  getDisplayUsername,
} from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";
import { SidebarSkeleton } from "./Skeletons";
import { ErrorBanner, OfflineBanner } from "./ErrorStates";

interface SidebarProps {
  onSelectConversation?: (id: Id<"conversations">) => void;
}

export function Sidebar({ onSelectConversation }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const currentUser = useQuery(api.users.currentUser);
  const conversations = useQuery(api.conversations.list);
  const allUsers = useQuery(api.users.list);
  const startDirectChat = useMutation(api.conversations.getOrCreateDirect);
  const createGroupChat = useMutation(api.conversations.createGroup);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Id<"users">[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);

  // Track whether conversations actually failed to load
  const isConversationsLoading = conversations === undefined;
  const isUsersLoading = allUsers === undefined;

  // Filter users by search query (client-side)
  const searchResults =
    searchFocused && allUsers
      ? searchQuery.trim()
        ? allUsers.filter((u) => {
            const q = searchQuery.toLowerCase().trim();
            const searchable =
              `${u.firstName ?? ""} ${u.lastName ?? ""} ${u.username ?? ""} ${u.email ?? ""}`.toLowerCase();
            return searchable.includes(q);
          })
        : allUsers
      : null;

  const displayName = currentUser
    ? getDisplayName(currentUser)
    : user?.firstName || "User";

  const navigateToChat = (conversationId: Id<"conversations">) => {
    if (onSelectConversation) {
      onSelectConversation(conversationId);
    } else {
      window.location.href = `/chat/${conversationId}`;
    }
  };

  const handleStartChat = async (userId: Id<"users">) => {
    try {
      setChatError(null);
      const conversationId = await startDirectChat({ otherUserId: userId });
      setShowNewChat(false);
      setSearchQuery("");
      navigateToChat(conversationId);
    } catch {
      setChatError("Couldn't start the chat. Please try again.");
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length < 1) return;
    try {
      setChatError(null);
      const conversationId = await createGroupChat({
        name: groupName.trim(),
        memberIds: selectedMembers,
      });
      setShowNewGroup(false);
      setGroupName("");
      setSelectedMembers([]);
      navigateToChat(conversationId);
    } catch {
      setChatError("Failed to create group. Please try again.");
    }
  };

  const toggleMember = (userId: Id<"users">) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  return (
    <>
      <aside className="flex h-full w-full flex-col border-r border-gray-200 bg-white md:w-80 dark:border-gray-700 dark:bg-gray-800">
        {/* Offline / error banners */}
        <OfflineBanner />
        {chatError && (
          <ErrorBanner
            message={chatError}
            onDismiss={() => setChatError(null)}
          />
        )}

        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <UserAvatar
              imageUrl={currentUser?.imageUrl || user?.imageUrl}
              name={displayName}
              size="md"
              showStatus
              isOnline
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                {displayName}
              </p>
              <p className="truncate text-xs text-gray-500">
                @
                {currentUser
                  ? getDisplayUsername(currentUser)
                  : user?.username || "user"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowNewChat(true)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="New chat"
            >
              <PlusIcon />
            </button>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>

        {/* Search */}
        <div className="relative p-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => {
                // Small delay so click on user item registers before closing
                setTimeout(() => setSearchFocused(false), 200);
              }}
              placeholder="Search users..."
              className="w-full rounded-lg border-0 bg-gray-100 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 focus:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Search dropdown overlay */}
          {searchResults !== null && (
            <div className="absolute left-0 right-0 top-full z-50 mx-3 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
              <p className="sticky top-0 z-10 border-b border-gray-200 bg-white px-3 py-2 text-xs font-medium uppercase text-gray-500 dark:border-gray-600 dark:bg-gray-800">
                {searchQuery.trim() ? "Search Results" : "All Users"}
              </p>
              {searchResults.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-gray-500">
                  No users found for &quot;{searchQuery.trim()}&quot;
                </p>
              ) : (
                <div className="space-y-0.5 p-1">
                  {searchResults.map((u) => (
                    <UserListItem
                      key={u._id}
                      user={u}
                      onClick={() => {
                        handleStartChat(u._id);
                        setSearchFocused(false);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content: conversation list */}
        <div className="flex-1 overflow-y-auto">
          {isConversationsLoading ? (
            /* Show skeleton placeholders while conversations load */
            <SidebarSkeleton />
          ) : (
            <div className="p-2">
              <div className="mb-2 flex items-center justify-between px-2">
                <p className="text-xs font-medium uppercase text-gray-500">
                  Chats
                </p>
                <button
                  onClick={() => setShowNewGroup(true)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  New Group
                </button>
              </div>

              {!conversations || conversations.length === 0 ? (
                <EmptyState
                  icon={
                    <svg
                      className="h-6 w-6 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  }
                  message="No conversations yet"
                  subtitle="Search for a user or create a group to get started."
                  action={
                    <button
                      onClick={() => setShowNewChat(true)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                      <PlusIcon /> New Chat
                    </button>
                  }
                />
              ) : (
                <div className="space-y-1">
                  {conversations.map((conv) => {
                    const isActive = pathname === `/chat/${conv._id}`;
                    const otherUser = conv.participants[0];
                    const name = conv.isGroup
                      ? conv.name
                      : otherUser
                        ? getDisplayName(otherUser)
                        : "Unknown";

                    return (
                      <Link
                        key={conv._id}
                        href={`/chat/${conv._id}`}
                        className={cn(
                          "flex items-center gap-3 rounded-lg p-3",
                          isActive
                            ? "bg-blue-50 dark:bg-blue-900/20"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700",
                        )}
                      >
                        {conv.isGroup ? (
                          <GroupAvatar name={conv.name || "Group"} />
                        ) : (
                          <UserAvatar
                            imageUrl={otherUser?.imageUrl}
                            name={name || "Chat"}
                            size="md"
                            showStatus
                            isOnline={otherUser?.isOnline}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                              {name}
                            </p>
                            {conv.lastMessage && (
                              <span className="text-xs text-gray-400">
                                {formatMessageTime(conv.lastMessage.createdAt)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="truncate text-xs text-gray-500">
                              {conv.lastMessage
                                ? conv.isGroup
                                  ? `${conv.lastMessage.senderName}: ${conv.lastMessage.content}`
                                  : conv.lastMessage.content
                                : conv.isGroup
                                  ? `${conv.participants.length + 1} members`
                                  : "Start a conversation"}
                            </p>
                            {conv.unreadCount > 0 && (
                              <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-medium text-white">
                                {conv.unreadCount > 99
                                  ? "99+"
                                  : conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* New Chat Modal */}
      {showNewChat && (
        <Modal onClose={() => setShowNewChat(false)} title="New Chat">
          <div className="space-y-2">
            {isUsersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <span className="ml-2 text-sm text-gray-500">
                  Loading users...
                </span>
              </div>
            ) : !allUsers || allUsers.length === 0 ? (
              <EmptyState
                icon={
                  <svg
                    className="h-6 w-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                }
                message="No other users yet"
                subtitle="Invite friends to join and start chatting!"
              />
            ) : (
              allUsers.map((u) => (
                <UserListItem
                  key={u._id}
                  user={u}
                  onClick={() => handleStartChat(u._id)}
                />
              ))
            )}
          </div>
        </Modal>
      )}

      {/* New Group Modal */}
      {showNewGroup && (
        <Modal onClose={() => setShowNewGroup(false)} title="Create Group">
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name..."
            className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
            Select members ({selectedMembers.length} selected)
          </p>
          <div className="max-h-60 space-y-1 overflow-y-auto">
            {isUsersLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <span className="ml-2 text-sm text-gray-500">
                  Loading users...
                </span>
              </div>
            ) : (
              allUsers?.map((u) => (
                <button
                  key={u._id}
                  onClick={() => toggleMember(u._id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg p-3",
                    selectedMembers.includes(u._id)
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700",
                  )}
                >
                  <UserAvatar
                    imageUrl={u.imageUrl}
                    name={getDisplayName(u)}
                    size="md"
                  />
                  <span className="flex-1 text-left text-sm text-gray-900 dark:text-white">
                    {getDisplayName(u)}
                  </span>
                  {selectedMembers.includes(u._id) && (
                    <CheckIcon className="h-5 w-5 text-blue-600" />
                  )}
                </button>
              ))
            )}
          </div>
          <button
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || selectedMembers.length < 1}
            className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Create Group
          </button>
        </Modal>
      )}
    </>
  );
}

/* ── Reusable sub-components ── */

function UserListItem({
  user,
  onClick,
}: {
  user: {
    _id: Id<"users">;
    imageUrl?: string;
    firstName?: string;
    lastName?: string;
    username: string;
    email: string;
    isOnline: boolean;
  };
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      <UserAvatar
        imageUrl={user.imageUrl}
        name={getDisplayName(user)}
        size="md"
        showStatus
        isOnline={user.isOnline}
      />
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
          {getDisplayName(user)}
        </p>
        <p className="truncate text-xs text-gray-500">
          @{getDisplayUsername(user)}
        </p>
      </div>
    </button>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  message,
  subtitle,
  action,
}: {
  icon?: React.ReactNode;
  message: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center py-10 text-center px-4">
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {message}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {subtitle}
        </p>
      )}
      {action}
    </div>
  );
}

function GroupAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-500 text-sm font-medium text-white">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

/* ── Icons ── */

function PlusIcon() {
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
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      className="h-5 w-5 text-gray-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
