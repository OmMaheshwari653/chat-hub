"use client";

import Link from "next/link";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UserAvatar } from "@/components/UserAvatar";
import { getDisplayName, getDisplayUsername } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useUser();
  const currentUser = useQuery(api.users.currentUser);

  const displayName = currentUser
    ? getDisplayName(currentUser)
    : user?.firstName || "User";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-4 px-4">
          <Link
            href="/chat"
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
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
          </Link>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Settings
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="space-y-6">
          {/* Profile Section */}
          <section className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800">
            <div className="border-b border-gray-100 p-6 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Profile
              </h2>
            </div>
            <div className="p-6">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
                <UserAvatar
                  imageUrl={currentUser?.imageUrl || user?.imageUrl}
                  name={displayName}
                  size="xl"
                />
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {displayName}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    @
                    {currentUser
                      ? getDisplayUsername(currentUser)
                      : user?.username || "user"}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {user?.emailAddresses[0]?.emailAddress}
                  </p>
                  {currentUser?.isOnline && (
                    <span className="mt-2 inline-flex items-center gap-1 text-sm text-green-600">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      Online
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Account Section */}
          <section className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800">
            <div className="border-b border-gray-100 p-6 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Account
              </h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              <div className="flex items-center justify-between p-6">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Email
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {user?.emailAddresses[0]?.emailAddress}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between p-6">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Username
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    @
                    {currentUser
                      ? getDisplayUsername(currentUser)
                      : user?.username || "user"}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between p-6">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Member since
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {currentUser?.createdAt
                      ? new Date(currentUser.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "long",
                            year: "numeric",
                          },
                        )
                      : "Recently joined"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Session Section */}
          <section className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800">
            <div className="border-b border-gray-100 p-6 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Session
              </h2>
            </div>
            <div className="p-6">
              <SignOutButton>
                <button className="w-full rounded-lg border border-gray-300 py-3 font-medium text-gray-700 hover:bg-gray-50 sm:w-auto sm:px-6 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                  Sign out
                </button>
              </SignOutButton>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
