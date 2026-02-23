import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const payload = await request.json();
      const { type, data } = payload;

      if (type === "user.created" || type === "user.updated") {
        const email = data.email_addresses?.[0]?.email_address || "";
        const username =
          data.username ||
          (email ? email.split("@")[0] : "") ||
          data.first_name ||
          data.id;
        await ctx.runMutation(api.users.upsert, {
          clerkId: data.id,
          email,
          username,
          firstName: data.first_name || undefined,
          lastName: data.last_name || undefined,
          imageUrl: data.image_url || undefined,
        });
      }

      if (type === "user.deleted") {
        await ctx.runMutation(api.users.remove, { clerkId: data.id });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ error: "Failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
