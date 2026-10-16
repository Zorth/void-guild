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

export const cleanupCompletedQuestMapPins = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Delete pins referencing completed quests
    const completedQuests = await ctx.db
      .query("quests")
      .filter((q) => q.eq(q.field("isCompleted"), true))
      .collect();

    let deletedPins = 0;
    for (const quest of completedQuests) {
      const pins = await ctx.db
        .query("mapPins")
        .withIndex("by_questId", (q) => q.eq("questId", quest._id))
        .collect();
      for (const pin of pins) {
        await ctx.db.delete(pin._id);
        deletedPins++;
      }
    }

    // 2. Also check if any pins reference non-existent quests
    const allPins = await ctx.db.query("mapPins").collect();
    for (const pin of allPins) {
      if (pin.questId) {
        const quest = await ctx.db.get(pin.questId);
        if (!quest || quest.isCompleted) {
          await ctx.db.delete(pin._id);
          deletedPins++;
        }
      }
    }

    return { deletedPins, totalCompletedQuests: completedQuests.length };
  },
});
