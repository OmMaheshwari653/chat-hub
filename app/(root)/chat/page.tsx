"use client";

import { Sidebar } from "@/components/Sidebar";

export default function ChatPage() {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - Full width on mobile, fixed width on desktop */}
      <div className="w-full md:w-80">
        <Sidebar />
      </div>

      {/* Empty state - Hidden on mobile, shown on desktop */}
      <main className="hidden flex-1 flex-col md:flex">
        <div className="flex h-full items-center justify-center p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <svg
                className="h-10 w-10 text-blue-600 dark:text-blue-400"
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
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Your Messages
            </h2>
            <p className="mt-2 max-w-sm text-gray-500 dark:text-gray-400">
              Select a conversation from the sidebar or search for users to
              start chatting
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
