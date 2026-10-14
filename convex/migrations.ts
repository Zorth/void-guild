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

export const repairCompletedSessionQuests = mutation({
  args: {},
  handler: async (ctx) => {
    // Find all quests that were completed with a completedSessionId
    const completedQuests = await ctx.db
      .query("quests")
      .filter((q) => q.eq(q.field("isCompleted"), true))
      .collect();

    let repaired = 0;
    for (const quest of completedQuests) {
      if (quest.completedSessionId) {
        const session = await ctx.db.get(quest.completedSessionId);
        if (session && !session.questId) {
          await ctx.db.patch(session._id, { questId: quest._id });
          repaired++;
        }
      }
    }
    return { repaired, totalCompletedQuests: completedQuests.length };
  },
});
