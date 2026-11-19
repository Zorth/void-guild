import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { buildIcs } from "./icsHelpers";

const http = httpRouter();

// You can also handle interactions directly in Convex if preferred,
// but since we already have a Next.js API route setup, we can use that.
// If you want Convex to handle it, we would add a route here.

/**
 * Shared, subscribable ICS feed of all public sessions. Calendar apps (Google, Outlook,
 * Apple) poll this on their own schedule, so the response is cacheable for 15 minutes.
 */
http.route({
  path: "/calendar.ics",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const now = Date.now();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://guild.tarragon.be";
    const sessions = await ctx.runQuery(internal.calendar.listFeedSessions, { now, baseUrl });
    const body = buildIcs(sessions, now, "Guild of The Void Sessions");
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="guild-sessions.ics"',
        "Cache-Control": "public, max-age=900",
      },
    });
  }),
});

export default http;
