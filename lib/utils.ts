import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format message timestamp
export function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const isThisYear = date.getFullYear() === now.getFullYear();

  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) {
    return time;
  }

  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(isThisYear ? {} : { year: "numeric" }),
  });

  return `${dateStr}, ${time}`;
}

// Get display name for user
export function getDisplayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string;
  email?: string;
}): string {
  if (user.firstName) {
    return user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.firstName;
  }
  if (user.username) return user.username;
  if (user.email) return user.email.split("@")[0];
  return "User";
}

// Get display username (for @username)
export function getDisplayUsername(user: {
  username?: string;
  email?: string;
}): string {
  if (user.username) return user.username;
  if (user.email) return user.email.split("@")[0];
  return "user";
}
