"use client";

import { ReactNode, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

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
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
