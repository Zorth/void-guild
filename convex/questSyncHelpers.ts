import { MutationCtx } from './_generated/server';
import { Id } from './_generated/dataModel';
import { internal } from './_generated/api';

/**
 * Synchronizes active (unlocked) sessions when quests are created, updated, completed, hidden, or deleted.
 * 
 * - Unsets questId on any unlocked sessions if the quest was completed or deleted.
 * - Schedules Discord forum thread re-sync for:
 *   1. Unlocked sessions whose selected quest was affected (cleared or updated).
 *   2. Unlocked sessions that have no selected quest (so their available quest list reflects the latest state).
 */
export async function syncActiveSessionsForQuestChange(
  ctx: MutationCtx,
  worldId?: Id<'worlds'>,
  options?: {
    affectedQuestId?: Id<'quests'>;
    isRemovedOrCompleted?: boolean;
  }
) {
  const unlockedSessions = await ctx.db
    .query('sessions')
    .withIndex('by_locked', (q) => q.eq('locked', false))
    .collect();

  for (const session of unlockedSessions) {
    // If the quest belongs to a specific world, only check sessions for that world.
    // If it's a global quest (worldId is undefined), it affects all sessions.
    if (worldId && session.world !== worldId) {
      continue;
    }

    let shouldSync = false;

    // If this quest was removed (deleted or completed) and this unlocked session had it selected:
    if (options?.affectedQuestId && session.questId === options.affectedQuestId) {
      if (options.isRemovedOrCompleted) {
        await ctx.db.patch(session._id, { questId: undefined });
      }
      shouldSync = true;
    } else if (!session.questId && !session.isIntro) {
      // Session has no selected quest, so its Discord thread displays the world's available quest list.
      // Any quest add/update/delete/complete changes this list!
      shouldSync = true;
    }

    if (shouldSync && session.discordThreadId) {
      await ctx.scheduler.runAfter(0, internal.discord.syncSessionToDiscord, {
        sessionId: session._id,
      });
    }
  }
}
