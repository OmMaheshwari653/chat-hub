import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get all conversations for current user with last message preview
export const list = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return [];

    // Get all participant records for this user
    const participantRecords = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const conversations = await Promise.all(
      participantRecords.map(async (record) => {
        const conversation = await ctx.db.get(record.conversationId);
        if (!conversation) return null;

        // Get last message
        let lastMessage = null;
        if (conversation.lastMessageId) {
          const msg = await ctx.db.get(conversation.lastMessageId);
          if (msg) {
            const sender = await ctx.db.get(msg.senderId);
            lastMessage = {
              content: msg.isDeleted ? "Message deleted" : msg.content,
              senderId: msg.senderId,
              senderName: sender?.firstName || sender?.username || "Unknown",
              createdAt: msg.createdAt,
            };
          }
        }

        // Get unread count
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_conversation_time", (q) =>
            q.eq("conversationId", record.conversationId),
          )
          .collect();

        const unreadCount = messages.filter(
          (m) => m.createdAt > record.lastReadTime && m.senderId !== user._id,
        ).length;

        // Get other participants
        const participants = await Promise.all(
          conversation.participantIds.map((id) => ctx.db.get(id)),
        );

        const otherParticipants = participants.filter(
          (p) => p && p._id !== user._id,
        );

        return {
          _id: conversation._id,
          name: conversation.name,
          isGroup: conversation.isGroup,
          participants: otherParticipants,
          lastMessage,
          lastMessageTime: conversation.lastMessageTime,
          unreadCount,
        };
      }),
    );

    return conversations
      .filter((c) => c !== null)
      .sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
  },
});

// Get or create a direct conversation with another user
export const getOrCreateDirect = mutation({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, { otherUserId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new Error("User not found");

    // Check if conversation already exists
    const participantRecords = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .collect();

    for (const record of participantRecords) {
      const conversation = await ctx.db.get(record.conversationId);
      if (
        conversation &&
        !conversation.isGroup &&
        conversation.participantIds.includes(otherUserId)
      ) {
        return conversation._id;
      }
    }

    // Create new conversation
    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      isGroup: false,
      participantIds: [currentUser._id, otherUserId],
      createdBy: currentUser._id,
      createdAt: now,
    });

    // Add participants
    await ctx.db.insert("conversationParticipants", {
      conversationId,
      userId: currentUser._id,
      lastReadTime: now,
      joinedAt: now,
    });

    await ctx.db.insert("conversationParticipants", {
      conversationId,
      userId: otherUserId,
      lastReadTime: 0,
      joinedAt: now,
    });

    return conversationId;
  },
});

// Create a group conversation
export const createGroup = mutation({
  args: {
    name: v.string(),
    memberIds: v.array(v.id("users")),
  },
  handler: async (ctx, { name, memberIds }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new Error("User not found");

    const now = Date.now();
    const allMembers = [currentUser._id, ...memberIds];

    const conversationId = await ctx.db.insert("conversations", {
      name,
      isGroup: true,
      participantIds: allMembers,
      createdBy: currentUser._id,
      createdAt: now,
    });

    // Add all participants
    for (const userId of allMembers) {
      await ctx.db.insert("conversationParticipants", {
        conversationId,
        userId,
        lastReadTime: userId === currentUser._id ? now : 0,
        joinedAt: now,
      });
    }

    return conversationId;
  },
});

// Get conversation details
export const get = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) return null;

    const conversation = await ctx.db.get(conversationId);
    if (!conversation) return null;

    // Check if user is participant
    if (!conversation.participantIds.includes(currentUser._id)) {
      return null;
    }

    // Get participant details
    const participants = await Promise.all(
      conversation.participantIds.map((id) => ctx.db.get(id)),
    );

    const otherParticipants = participants.filter(
      (p) => p && p._id !== currentUser._id,
    );

    return {
      ...conversation,
      participants: otherParticipants,
      currentUserId: currentUser._id,
    };
  },
});

// Mark conversation as read
export const markRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) return;

    const participant = await ctx.db
      .query("conversationParticipants")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", conversationId).eq("userId", currentUser._id),
      )
      .unique();

    if (participant) {
      await ctx.db.patch(participant._id, { lastReadTime: Date.now() });
    }
  },
});
