"use client";

import { ReactNode, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SidebarSkeleton } from "@/components/Skeletons";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const upsertUser = useMutation(api.users.upsert);
  const setOnline = useMutation(api.users.setOnline);

  useEffect(() => {
    if (isLoaded && user) {
      const email = user.emailAddresses[0]?.emailAddress || "";
      const username =
        user.username ||
        (email ? email.split("@")[0] : "") ||
        user.firstName ||
        user.id;
      upsertUser({
        clerkId: user.id,
        email,
        username,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        imageUrl: user.imageUrl || undefined,
      });
    }
  }, [isLoaded, user, upsertUser]);

  // Lock screen orientation to portrait on mobile/tablet
  useEffect(() => {
    const lockOrientation = async () => {
      try {
        const orientation = screen?.orientation as ScreenOrientation & {
          lock?: (orientation: string) => Promise<void>;
        };
        if (orientation?.lock) {
          await orientation.lock("portrait");
        }
      } catch {
        // Orientation lock not supported or not allowed (desktop browsers)
      }
    };
    lockOrientation();
  }, []);

  // Handle online status
  useEffect(() => {
    if (!isLoaded || !user) return;

    setOnline({ isOnline: true });

    const handleVisibility = () => {
      setOnline({ isOnline: !document.hidden });
    };

    const handleBeforeUnload = () => {
      setOnline({ isOnline: false });
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isLoaded, user, setOnline]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        {/* Skeleton sidebar while auth loads */}
        <div className="hidden w-80 border-r border-gray-200 bg-white md:block dark:border-gray-700 dark:bg-gray-800">
          <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-4 dark:border-gray-700">
            <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="space-y-2">
              <div className="h-3.5 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
          <SidebarSkeleton />
        </div>

        {/* Center spinner for main area */}
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="mt-3 text-sm text-gray-500">Loading your chats...</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
