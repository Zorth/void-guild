import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Fetches a character's full profile including session stats for Discord.
 */
export const getCharacterProfile = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const characters = await ctx.db.query("characters").collect();
    const searchLower = args.name.toLowerCase();
    
    const character = characters
      .filter(c => c.name.toLowerCase().includes(searchLower))
      .sort((a, b) => a.name.length - b.name.length)[0];

    if (!character) return null;

    // Fetch character owner's user info
    const ownerUser = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", character.userId))
      .first();

    // Count how many locked (completed) sessions this character participated in
    const sessions = await ctx.db
      .query("sessions")
      .filter(q => q.eq(q.field("locked"), true))
      .collect();

    const charSessions = sessions.filter(s => s.characters.includes(character._id));
    const sessionCount = charSessions.length;

    // Calculate most visited world
    const worldCounts = new Map<string, number>();
    for (const s of charSessions) {
      if (s.world) {
        const key = s.world.toString();
        worldCounts.set(key, (worldCounts.get(key) || 0) + 1);
      }
    }

    let mostVisitedWorld: { name: string; count: number } | null = null;
    if (worldCounts.size > 0) {
      let maxCount = 0;
      let topWorldId: Id<"worlds"> | null = null;
      for (const [wId, count] of worldCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          topWorldId = wId as Id<"worlds">;
        }
      }
      if (topWorldId) {
        const worldDoc = await ctx.db.get(topWorldId);
        if (worldDoc) {
          mostVisitedWorld = {
            name: worldDoc.name,
            count: maxCount,
          };
        }
      }
    }

    // Fetch commendations received by this character
    const comms = await ctx.db
      .query("commendations")
      .withIndex("by_toCharacter", (q) => q.eq("toCharacterId", character._id))
      .collect();

    const commendationSummary = {
      total: comms.length,
      roleplay: comms.filter(c => c.category === 'roleplay').length,
      tactics: comms.filter(c => c.category === 'tactics').length,
      clutch: comms.filter(c => c.category === 'clutch').length,
      heroic: comms.filter(c => c.category === 'heroic').length,
      gm: comms.filter(c => c.category === 'gm').length,
    };

    return {
      ...character,
      sessionCount,
      ownerImageUrl: ownerUser?.imageUrl || null,
      ownerName: ownerUser?.name || ownerUser?.username || null,
      mostVisitedWorld,
      commendations: commendationSummary,
    };
  },
});

/**
 * Searches for a world by name (case-insensitive fuzzy match) and finds its next session.
 */
export const searchWorld = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const worlds = await ctx.db.query("worlds").collect();
    const searchLower = args.name.toLowerCase();

    const matchedWorld = worlds
      .filter(w => w.name.toLowerCase().includes(searchLower))
      .sort((a, b) => a.name.length - b.name.length)[0];

    if (!matchedWorld) return null;

    // Find the next upcoming session (not locked, closest date, or planning)
    const sessions = await ctx.db
      .query("sessions")
      .filter(q => q.and(
        q.eq(q.field("world"), matchedWorld._id),
        q.eq(q.field("locked"), false)
      ))
      .collect();

    // Sort: 1. Dated sessions by date (soonest first), 2. Planning sessions
    const nextSession = sessions.sort((a, b) => {
      if (a.date && b.date) return a.date - b.date;
      if (a.date) return -1;
      if (b.date) return 1;
      return 0;
    })[0];

    return {
      world: matchedWorld,
      nextSession: nextSession || null,
    };
  },
});

/**
 * Lists upcoming and planning sessions for Discord autocomplete.
 */
export const searchSessions = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("locked"), false))
      .collect();

    const worlds = await ctx.db.query("worlds").collect();
    const worldMap = new Map(worlds.map((w) => [w._id, w.name]));

    const searchLower = args.query.toLowerCase();

    return sessions
      .map((s) => {
        const worldName = worldMap.get(s.world) || "Unknown World";
        let dateStr = "Planning";
        if (s.date) {
            const d = new Date(s.date);
            // Use Brussels time for consistency
            const formatter = new Intl.DateTimeFormat('en-GB', {
                day: '2-digit',
                month: '2-digit',
                timeZone: 'Europe/Brussels'
            });
            const parts = formatter.formatToParts(d);
            const day = parts.find(p => p.type === 'day')?.value || "01";
            const month = parts.find(p => p.type === 'month')?.value || "01";
            dateStr = `${day}/${month}`;
        }
        return {
          name: `${worldName} (${dateStr})`,
          id: s._id,
        };
      })
      .filter((s) => s.name.toLowerCase().includes(searchLower))
      .slice(0, 25);
  },
});

/**
 * Lists characters for Discord autocomplete.
 */
export const searchCharacters = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const characters = await ctx.db.query("characters").collect();
    const searchLower = args.query.toLowerCase();

    return characters
      .filter((c) => c.name.toLowerCase().includes(searchLower))
      .sort((a, b) => a.name.length - b.name.length)
      .slice(0, 25)
      .map((c) => ({
        name: `${c.name} (Lvl ${c.lvl} ${c.class || ''})`,
        value: c.name, // The /character command expects the name string
      }));
  },
});

/**
 * Lists worlds for Discord autocomplete.
 */
export const searchWorlds = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const worlds = await ctx.db.query("worlds").collect();
    const searchLower = args.query.toLowerCase();

    return worlds
      .filter((w) => w.name.toLowerCase().includes(searchLower))
      .sort((a, b) => a.name.length - b.name.length)
      .slice(0, 25)
      .map((w) => ({
        name: w.name,
        value: w.name,
      }));
  },
});

/**
 * Fetches active bets for a user identified by their Discord account ID.
 */
export const getUserActiveBets = query({
  args: { discordId: v.string() },
  handler: async (ctx, args) => {
    // 1. Find user by discordId
    const user = await ctx.db
      .query("users")
      .withIndex("by_discordId", (q) => q.eq("discordId", args.discordId))
      .first();

    if (!user) {
      return { status: "no_user" as const };
    }

    // 2. Find all characters belonging to this user
    const characters = await ctx.db
      .query("characters")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId))
      .collect();

    if (characters.length === 0) {
      return { status: "no_bets" as const, myTurnBets: [], otherTurnBets: [] };
    }

    const charIds = new Set(characters.map((c) => c._id));
    const charMap = new Map(characters.map((c) => [c._id.toString(), c]));

    // 3. Query all accepted (active) bets
    const allAccepted = await ctx.db
      .query("blackVoidBets")
      .withIndex("by_status", (q) => q.eq("status", "accepted"))
      .collect();

    // Filter bets involving any of the user's characters
    const userBets = allAccepted.filter(
      (b) => charIds.has(b.senderCharacterId) || (b.acceptedByCharacterId && charIds.has(b.acceptedByCharacterId))
    );

    if (userBets.length === 0) {
      return { status: "no_bets" as const, myTurnBets: [], otherTurnBets: [] };
    }

    const myTurnBets: any[] = [];
    const otherTurnBets: any[] = [];

    for (const b of userBets) {
      const isSender = charIds.has(b.senderCharacterId);
      const myChar = isSender
        ? charMap.get(b.senderCharacterId.toString())
        : (b.acceptedByCharacterId ? charMap.get(b.acceptedByCharacterId.toString()) : null);

      const opponentCharId = isSender ? b.acceptedByCharacterId : b.senderCharacterId;
      const opponentChar = opponentCharId ? await ctx.db.get(opponentCharId) : null;

      const isMyTurn = b.currentTurnCharacterId && charIds.has(b.currentTurnCharacterId);

      const lastRoll = b.rolls && b.rolls.length > 0 ? b.rolls[b.rolls.length - 1] : null;
      const currentDeathrollValue = lastRoll ? lastRoll.roll : (b.currentRollMax || b.deathrollValue);

      const betInfo = {
        id: b._id,
        wagerAmount: b.wagerAmount,
        deathrollValue: currentDeathrollValue,
        myCharacterName: myChar?.name || "Your Character",
        opponentCharacterName: opponentChar?.name || "Opponent",
        isMyTurn,
        lastRoll,
        updatedAt: b.updatedAt || b.createdAt,
      };

      if (isMyTurn) {
        myTurnBets.push(betInfo);
      } else {
        otherTurnBets.push(betInfo);
      }
    }

    return {
      status: "ok" as const,
      myTurnBets,
      otherTurnBets,
    };
  },
});

/**
 * Send deathroll challenge from Discord user.
 */
export const createDiscordDeathrollChallenge = mutation({
  args: {
    discordId: v.string(),
    senderCharacterName: v.string(),
    targetCharacterName: v.optional(v.string()),
    wagerAmount: v.number(),
    deathrollValue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_discordId", (q) => q.eq("discordId", args.discordId))
      .first();

    if (!user) {
      throw new Error("No guild account linked. Link your account on the Guild website first.");
    }

    const userChars = await ctx.db
      .query("characters")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId))
      .collect();

    const senderChar = userChars
      .filter((c) => c.name.toLowerCase().includes(args.senderCharacterName.toLowerCase()))
      .sort((a, b) => a.name.length - b.name.length)[0];

    if (!senderChar) {
      throw new Error(`Character "${args.senderCharacterName}" not found on your account.`);
    }

    let targetCharId: Id<"characters"> | undefined = undefined;
    if (args.targetCharacterName) {
      const allChars = await ctx.db.query("characters").collect();
      const targetChar = allChars
        .filter((c) => c.name.toLowerCase().includes(args.targetCharacterName!.toLowerCase()))
        .sort((a, b) => a.name.length - b.name.length)[0];

      if (!targetChar) {
        throw new Error(`Opponent character "${args.targetCharacterName}" not found.`);
      }

      if (targetChar.userId === user.userId) {
        throw new Error("You cannot challenge another character that you own.");
      }

      targetCharId = targetChar._id;
    }

    const wager = Math.max(1, Math.round(args.wagerAmount * 100) / 100);
    const startVal = args.deathrollValue && args.deathrollValue >= 2 ? Math.min(1000000, Math.floor(args.deathrollValue)) : 1000;

    // Check existing pending challenge
    const existingPending = await ctx.db
      .query("blackVoidBets")
      .withIndex("by_senderCharacterId_and_status", (q) =>
        q.eq("senderCharacterId", senderChar._id).eq("status", "pending")
      )
      .first();

    if (existingPending) {
      throw new Error(`${senderChar.name} already has an active pending challenge!`);
    }

    const betId = await ctx.db.insert("blackVoidBets", {
      senderCharacterId: senderChar._id,
      targetCharacterId: targetCharId,
      wagerAmount: wager,
      deathrollValue: startVal,
      currentRollMax: startVal,
      status: "pending",
      createdAt: Date.now(),
    });

    return {
      betId,
      senderName: senderChar.name,
      targetName: targetCharId ? (await ctx.db.get(targetCharId))?.name : null,
      wager,
      startVal,
    };
  },
});

/**
 * Fetch active Black Void market listings for Discord /market command.
 */
export const getActiveMarketListings = query({
  args: { query: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const rawListings = await ctx.db
      .query("blackVoidListings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const searchLower = args.query?.toLowerCase() || "";
    let filtered = rawListings;
    if (searchLower) {
      filtered = rawListings.filter(
        (l) => l.name.toLowerCase().includes(searchLower) || (l.description && l.description.toLowerCase().includes(searchLower))
      );
    }

    const decorated = await Promise.all(
      filtered.slice(0, 10).map(async (l) => {
        const seller = await ctx.db.get(l.characterId);
        return {
          id: l._id,
          name: l.name,
          type: l.type,
          startingBid: l.startingBid,
          buyoutPrice: l.buyoutPrice,
          priceType: l.priceType,
          percentage: l.percentage,
          markupGp: l.markupGp,
          priceDetails: l.priceDetails,
          sellerName: seller?.name || "Unknown",
          expiresAt: l.expiresAt,
          nethysUrl: l.nethysUrl,
        };
      })
    );

    return decorated;
  },
});

/**
 * Fetch a Discord user's own character listings for /my-listings command.
 */
export const getUserMarketListings = query({
  args: { discordId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_discordId", (q) => q.eq("discordId", args.discordId))
      .first();

    if (!user) return { status: "no_user" as const };

    const characters = await ctx.db
      .query("characters")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId))
      .collect();

    if (characters.length === 0) return { status: "no_characters" as const, activeListings: [], wonListings: [] };

    const charIds = new Set(characters.map((c) => c._id));
    const charMap = new Map(characters.map((c) => [c._id.toString(), c]));

    const activeListings: any[] = [];
    for (const c of characters) {
      const cListings = await ctx.db
        .query("blackVoidListings")
        .withIndex("by_characterId", (q) => q.eq("characterId", c._id))
        .collect();

      for (const l of cListings) {
        if (l.status === "active") {
          activeListings.push({
            id: l._id,
            name: l.name,
            type: l.type,
            startingBid: l.startingBid,
            buyoutPrice: l.buyoutPrice,
            sellerName: c.name,
            winningAmount: l.winningAmount,
            expiresAt: l.expiresAt,
          });
        }
      }
    }

    const wonListings: any[] = [];
    for (const c of characters) {
      const won = await ctx.db
        .query("blackVoidListings")
        .withIndex("by_winningBidderCharacterId", (q) => q.eq("winningBidderCharacterId", c._id))
        .collect();

      for (const l of won) {
        if (l.status === "completed" && !l.buyerClaimed) {
          wonListings.push({
            id: l._id,
            name: l.name,
            buyerName: c.name,
            winningAmount: l.winningAmount,
          });
        }
      }
    }

    return {
      status: "ok" as const,
      activeListings,
      wonListings,
    };
  },
});

/**
 * Fetch a Discord user's unclaimed log summary for /ledger or /unclaimed command.
 */
export const getUserUnclaimedSummary = query({
  args: { discordId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_discordId", (q) => q.eq("discordId", args.discordId))
      .first();

    if (!user) return { status: "no_user" as const };

    const characters = await ctx.db
      .query("characters")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId))
      .collect();

    if (characters.length === 0) return { status: "no_unclaimed" as const, characters: [], totalUnclaimed: 0 };

    let totalUnclaimed = 0;
    const charSummaries: any[] = [];

    for (const char of characters) {
      // 1. Sold items/services
      const createdListings = await ctx.db
        .query("blackVoidListings")
        .withIndex("by_characterId", (q) => q.eq("characterId", char._id))
        .collect();
      const unclaimedSold = createdListings.filter((l) => l.status === "completed" && !l.sellerClaimed);

      // 2. Won items
      const wonListings = await ctx.db
        .query("blackVoidListings")
        .withIndex("by_winningBidderCharacterId", (q) => q.eq("winningBidderCharacterId", char._id))
        .collect();
      const unclaimedWon = wonListings.filter((l) => l.status === "completed" && !l.buyerClaimed);

      // 3. Quests
      const charQuests = await ctx.db
        .query("quests")
        .withIndex("by_characterId", (q) => q.eq("characterId", char._id))
        .collect();
      const unclaimedQuests = charQuests.filter((q) => q.isCompleted && (!q.paymentClaimed || (q.isSponsored && !q.reimbursementClaimed)));

      // 4. GM cuts
      let unclaimedGM: any[] = [];
      if (char.rank === "guildmaster") {
        const gmSessions = await ctx.db
          .query("sessions")
          .withIndex("by_guildmaster_cut", (q) => q.eq("guildmasterCut.characterId", char._id))
          .collect();
        unclaimedGM = gmSessions.filter((s) => s.guildmasterCut && !s.guildmasterCut.claimed);
      }

      // 5. Bets
      const wonBets = await ctx.db
        .query("blackVoidBets")
        .withIndex("by_winnerCharacterId", (q) => q.eq("winnerCharacterId", char._id))
        .collect();
      const unclaimedWonBets = wonBets.filter((b) => b.status === "completed" && !b.winnerClaimed);

      const lostBets = await ctx.db
        .query("blackVoidBets")
        .withIndex("by_loserCharacterId", (q) => q.eq("loserCharacterId", char._id))
        .collect();
      const unclaimedLostBets = lostBets.filter((b) => b.status === "completed" && !b.loserClaimed);

      const count =
        unclaimedSold.length +
        unclaimedWon.length +
        unclaimedQuests.length +
        unclaimedGM.length +
        unclaimedWonBets.length +
        unclaimedLostBets.length;

      if (count > 0) {
        totalUnclaimed += count;
        charSummaries.push({
          characterName: char.name,
          unclaimedCount: count,
          soldCount: unclaimedSold.length,
          wonCount: unclaimedWon.length,
          questCount: unclaimedQuests.length,
          gmCount: unclaimedGM.length,
          betsCount: unclaimedWonBets.length + unclaimedLostBets.length,
        });
      }
    }

    if (totalUnclaimed === 0) {
      return { status: "no_unclaimed" as const, characters: [], totalUnclaimed: 0 };
    }

    return {
      status: "ok" as const,
      characters: charSummaries,
      totalUnclaimed,
    };
  },
});
