import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const migrateToSystems = mutation({
  args: {},
  handler: async (ctx) => {
    const characters = await ctx.db.query("characters").collect();
    for (const character of characters) {
      if (character.system === undefined) {
        await ctx.db.patch(character._id, { system: "PF" });
      }
    }

    const sessions = await ctx.db.query("sessions").collect();
    for (const session of sessions) {
      if (session.system === undefined) {
        await ctx.db.patch(session._id, { system: "PF" });
      }
    }
  },
});
