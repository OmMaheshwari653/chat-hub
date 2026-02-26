import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get messages for a conversation
export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) return [];

    // Verify user is participant
    const conversation = await ctx.db.get(conversationId);
    if (
      !conversation ||
      !conversation.participantIds.includes(currentUser._id)
    ) {
      return [];
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_time", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect();

    // Get senders and reactions for each message
    const messagesWithDetails = await Promise.all(
      messages.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);

        // Get reactions for this message
        const reactions = await ctx.db
          .query("reactions")
          .withIndex("by_message", (q) => q.eq("messageId", msg._id))
          .collect();

        // Group reactions by emoji - (Convex doesn't allow emoji as keys)
        const reactionMap = new Map<
          string,
          { count: number; users: string[]; hasReacted: boolean }
        >();
        for (const r of reactions) {
          if (!reactionMap.has(r.emoji)) {
            reactionMap.set(r.emoji, {
              count: 0,
              users: [],
              hasReacted: false,
            });
          }
          const entry = reactionMap.get(r.emoji)!;
          entry.count++;
          const user = await ctx.db.get(r.userId);
          if (user) {
            entry.users.push(user.firstName || user.username);
          }
          if (r.userId === currentUser._id) {
            entry.hasReacted = true;
          }
        }

        // Convert to array format
        const reactionsList = Array.from(reactionMap.entries()).map(
          ([emoji, data]) => ({
            emoji,
            count: data.count,
            users: data.users,
            hasReacted: data.hasReacted,
          }),
        );

        return {
          _id: msg._id,
          content: msg.content,
          isDeleted: msg.isDeleted,
          createdAt: msg.createdAt,
          senderId: msg.senderId,
          senderName: sender?.firstName || sender?.username || "Unknown",
          senderImage: sender?.imageUrl,
          isOwn: msg.senderId === currentUser._id,
          reactions: reactionsList,
        };
      }),
    );

    return messagesWithDetails;
  },
});

// Send a message
export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, { conversationId, content }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new Error("User not found");

    // Verify user is participant
    const conversation = await ctx.db.get(conversationId);
    if (
      !conversation ||
      !conversation.participantIds.includes(currentUser._id)
    ) {
      throw new Error("Not a participant");
    }

    const now = Date.now();

    // Create message
    const messageId = await ctx.db.insert("messages", {
      conversationId,
      senderId: currentUser._id,
      content: content.trim(),
      isDeleted: false,
      createdAt: now,
    });

    // Update conversation
    await ctx.db.patch(conversationId, {
      lastMessageId: messageId,
      lastMessageTime: now,
    });

    // Clear typing indicator
    const typingIndicator = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", conversationId).eq("userId", currentUser._id),
      )
      .unique();

    if (typingIndicator) {
      await ctx.db.delete(typingIndicator._id);
    }

    return messageId;
  },
});

// Delete a message (soft delete)
export const remove = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new Error("User not found");

    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Message not found");

    // Only sender can delete their own messages
    if (message.senderId !== currentUser._id) {
      throw new Error("Cannot delete others' messages");
    }

    await ctx.db.patch(messageId, { isDeleted: true });
  },
});

// Toggle reaction on a message
export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, { messageId, emoji }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new Error("User not found");

    // Check if user already has ANY reaction on this message
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_message_user", (q) =>
        q.eq("messageId", messageId).eq("userId", currentUser._id),
      )
      .unique();

    if (existing) {
      if (existing.emoji === emoji) {
        // Same emoji dobara dabaya → toggle OFF (remove)
        await ctx.db.delete(existing._id);
      } else {
        // Different emoji → purana hatao, naya lagao (replace)
        await ctx.db.delete(existing._id);
        await ctx.db.insert("reactions", {
          messageId,
          userId: currentUser._id,
          emoji,
          createdAt: Date.now(),
        });
      }
    } else {
      // Koi reaction nahi tha → naya add karo
      await ctx.db.insert("reactions", {
        messageId,
        userId: currentUser._id,
        emoji,
        createdAt: Date.now(),
      });
    }
  },
});

// Set typing indicator
export const setTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
    isTyping: v.boolean(),
  },
  handler: async (ctx, { conversationId, isTyping }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) return;

    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", conversationId).eq("userId", currentUser._id),
      )
      .unique();

    if (isTyping) {
      const expiresAt = Date.now() + 3000; // 3 seconds
      if (existing) {
        await ctx.db.patch(existing._id, { expiresAt });
      } else {
        await ctx.db.insert("typingIndicators", {
          conversationId,
          userId: currentUser._id,
          expiresAt,
        });
      }
    } else if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// Get typing users for a conversation
export const getTyping = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) return [];

    const now = Date.now();
    const indicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .filter((q) =>
        q.and(
          q.gt(q.field("expiresAt"), now),
          q.neq(q.field("userId"), currentUser._id),
        ),
      )
      .collect();

    const typingUsers = await Promise.all(
      indicators.map(async (i) => {
        const user = await ctx.db.get(i.userId);
        return user?.firstName || user?.username || "Someone";
      }),
    );

    return typingUsers;
  },
});
