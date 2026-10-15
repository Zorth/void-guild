import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { FunctionReturnType } from "convex/server";
import { DISCORD_API_BASE, DISCORD_GP_EMOJI } from "./discordHelpers";
import { bustChance } from "./deathroll";

const DEFAULT_BV_CHANNEL_ID = "1547741552649048125";

/**
 * Calls the Discord REST API with the bot token. Returns the parsed JSON body, or null on failure.
 */
async function discordRequest(path: string, method: "POST" | "PATCH", body: unknown): Promise<{ id: string } | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!botToken) {
    console.warn("Discord bot token not configured.");
    return null;
  }

  try {
    const res = await fetch(`${DISCORD_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Discord API error on ${method} ${path} (${res.status}):`, errText);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`Failed Discord request ${method} ${path}:`, err);
    return null;
  }
}

/**
 * Sends a message or embed payload to the #black-void Discord channel.
 * Returns the created message ID, or null if it could not be sent.
 */
async function sendDiscordBlackVoidMessage(payload: any): Promise<string | null> {
  const channelId = process.env.DISCORD_BV_CHANNEL_ID || DEFAULT_BV_CHANNEL_ID;
  const msg = await discordRequest(`/channels/${channelId}/messages`, "POST", payload);
  return msg?.id ?? null;
}

/**
 * Queries listing and seller details for sending a Discord notification.
 */
export const getListingNotificationDetails = internalQuery({
  args: { listingId: v.id("blackVoidListings") },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) return null;

    const seller = await ctx.db.get(listing.characterId);
    let winningBidder = null;
    if (listing.winningBidderCharacterId) {
      winningBidder = await ctx.db.get(listing.winningBidderCharacterId);
    }

    return {
      _id: listing._id,
      name: listing.name,
      description: listing.description,
      nethysUrl: listing.nethysUrl,
      type: listing.type,
      startingBid: listing.startingBid,
      buyoutPrice: listing.buyoutPrice,
      priceType: listing.priceType,
      percentage: listing.percentage,
      markupGp: listing.markupGp,
      priceDetails: listing.priceDetails,
      minLevel: listing.minLevel,
      maxLevel: listing.maxLevel,
      durationDays: listing.durationDays,
      expiresAt: listing.expiresAt,
      winningAmount: listing.winningAmount,
      winningBidderName: winningBidder?.name,
      sellerName: seller?.name || "Unknown Character",
      sellerLvl: seller?.lvl,
      sellerClass: seller?.class,
    };
  },
});

/**
 * Queries bet challenge details for Discord notification.
 */
export const getBetNotificationDetails = internalQuery({
  args: { betId: v.id("blackVoidBets") },
  handler: async (ctx, args) => {
    const bet = await ctx.db.get(args.betId);
    if (!bet) return null;

    const sender = await ctx.db.get(bet.senderCharacterId);
    const accepter = bet.acceptedByCharacterId ? await ctx.db.get(bet.acceptedByCharacterId) : null;
    const senderName = sender?.name || "Unknown Character";
    const accepterName = accepter?.name || "Unknown Character";
    const nameOf = (id?: Id<"characters">) => (id === bet.senderCharacterId ? senderName : accepterName);

    let senderDiscordId: string | null = null;
    if (sender?.userId) {
      const senderUser = await ctx.db
        .query("users")
        .withIndex("by_userId", (q) => q.eq("userId", sender.userId))
        .first();
      senderDiscordId = senderUser?.discordId || null;
    }

    let accepterDiscordId: string | null = null;
    if (accepter?.userId) {
      const accepterUser = await ctx.db
        .query("users")
        .withIndex("by_userId", (q) => q.eq("userId", accepter.userId))
        .first();
      accepterDiscordId = accepterUser?.discordId || null;
    }

    return {
      _id: bet._id,
      senderCharacterId: bet.senderCharacterId,
      senderName,
      senderLvl: sender?.lvl,
      senderClass: sender?.class,
      senderDiscordId,
      accepterName: accepter ? accepterName : null,
      accepterLvl: accepter?.lvl,
      accepterDiscordId,
      wagerAmount: bet.wagerAmount,
      deathrollValue: bet.deathrollValue,
      message: bet.message,
      targetCharacterId: bet.targetCharacterId,
      status: bet.status,
      currentRollMax: bet.currentRollMax ?? bet.deathrollValue,
      currentTurnName: bet.currentTurnCharacterId ? nameOf(bet.currentTurnCharacterId) : null,
      turnDeadline: bet.turnDeadline,
      rolls: (bet.rolls || []).map((r) => ({
        name: nameOf(r.characterId),
        isSender: r.characterId === bet.senderCharacterId,
        roll: r.roll,
        outOf: r.outOf,
      })),
      winnerName: bet.winnerCharacterId ? nameOf(bet.winnerCharacterId) : null,
      loserName: bet.loserCharacterId ? nameOf(bet.loserCharacterId) : null,
      lossReason: bet.lossReason,
      discordMessageId: bet.discordMessageId,
      discordThreadId: bet.discordThreadId,
    };
  },
});

/**
 * Stores the Discord invite post and/or play-by-play thread IDs on a bet.
 */
export const setBetDiscordIds = internalMutation({
  args: {
    betId: v.id("blackVoidBets"),
    discordMessageId: v.optional(v.string()),
    discordThreadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { betId, ...ids } = args;
    await ctx.db.patch(betId, ids);
  },
});

type BetDetails = NonNullable<FunctionReturnType<typeof internal.blackVoidDiscord.getBetNotificationDetails>>;

const BET_COLORS = {
  open: 0xf59e0b, // Amber
  live: 0xef4444, // Red
  won: 0x10b981, // Emerald
  withdrawn: 0x6b7280, // Grey
  challenger: 0x8b5cf6, // Purple
  opponent: 0x06b6d4, // Cyan
};

function rollPath(details: BetDetails): string {
  const values = [details.deathrollValue, ...details.rolls.map((r) => r.roll)];
  // Discord caps descriptions, so very long duels show only the most recent rolls
  const shown = values.length > 20 ? values.slice(-20) : values;
  const path = shown.map((v) => v.toLocaleString()).join(" → ");
  return values.length > 20 ? `… → ${path}` : path;
}

function discordTime(ms: number): string {
  return `<t:${Math.floor(ms / 1000)}:R>`;
}

/**
 * Builds the #black-void invite embed for a bet's current state, so the original post doubles as a
 * live scoreboard.
 */
function buildBetEmbed(details: BetDetails, betsUrl: string) {
  const base = {
    url: betsUrl,
    timestamp: new Date().toISOString(),
    footer: { text: "Black Void • Deathroll" },
  };

  if (details.status === "cancelled") {
    return {
      ...base,
      title: `🚫 Deathroll withdrawn · ${details.wagerAmount} ${DISCORD_GP_EMOJI}`,
      description: `**${details.senderName}** cancelled this bet.`,
      color: BET_COLORS.withdrawn,
    };
  }

  if (details.status === "completed") {
    const outcome = details.lossReason === "timeout"
      ? `**${details.loserName}** ran out of time.`
      : `**${details.loserName}** rolled a **0**.`;
    return {
      ...base,
      title: `🏆 ${details.winnerName} wins ${details.wagerAmount} ${DISCORD_GP_EMOJI}`,
      description: `${outcome}\n\nRolls: ${rollPath(details)}`,
      color: BET_COLORS.won,
    };
  }

  if (details.status === "accepted") {
    const lines = [
      `**${details.senderName}** vs **${details.accepterName}**`,
      "",
      `Current number: **${details.currentRollMax.toLocaleString()}**`,
    ];
    if (details.currentTurnName && details.turnDeadline) {
      lines.push(`Next to roll: **${details.currentTurnName}** (due ${discordTime(details.turnDeadline)})`);
    }
    lines.push(`Chance to bust: **${bustChance(details.currentRollMax)}%**`, "", "Follow the rolls in the thread.");
    return {
      ...base,
      title: `🔥 Deathroll · ${details.wagerAmount} ${DISCORD_GP_EMOJI}`,
      description: lines.join("\n"),
      color: BET_COLORS.live,
    };
  }

  return {
    ...base,
    title: `🎲 Deathroll · ${details.wagerAmount} ${DISCORD_GP_EMOJI}`,
    description: [
      `**${details.senderName}** challenges anyone to a deathroll.`,
      ...(details.message ? [`> ${details.message}`] : []),
      "",
      `Starting number: **${details.deathrollValue.toLocaleString()}**`,
      "Players take turns rolling from 0 up to the last number.",
      "First to roll **0** loses.",
    ].join("\n"),
    color: BET_COLORS.open,
  };
}

/**
 * Builds the play-by-play thread embeds for the latest bet event, one card per turn.
 */
function buildBetThreadUpdate(details: BetDetails, event: "accepted" | "rolled" | "timeout") {
  const embeds: Array<{ title?: string; description: string; color: number }> = [];
  const last = details.rolls[details.rolls.length - 1];

  if (event === "accepted") {
    embeds.push({
      title: `⚔️ ${details.senderName} vs ${details.accepterName}`,
      description: `**${details.accepterName}** accepted the challenge from **${details.senderName}**! **${details.wagerAmount} ${DISCORD_GP_EMOJI}** is on the line.`,
      color: BET_COLORS.open,
    });
  }

  if (event !== "timeout" && last) {
    const lines = [`Rolled **${last.roll.toLocaleString()}** out of ${last.outOf.toLocaleString()}.`];
    if (last.roll === 0) {
      lines[0] += " 💀 Bust!";
    } else if (details.status === "accepted" && details.currentTurnName && details.turnDeadline) {
      lines.push(
        `Next: **${details.currentTurnName}** rolls from 0 to ${details.currentRollMax.toLocaleString()}` +
          ` (due ${discordTime(details.turnDeadline)})`
      );
    }
    embeds.push({
      title: `🎲 Roll ${details.rolls.length} · ${last.name}`,
      description: lines.join("\n"),
      color: last.roll === 0 ? BET_COLORS.live : last.isSender ? BET_COLORS.challenger : BET_COLORS.opponent,
    });
  }

  if (details.status === "completed") {
    const outcome = details.lossReason === "timeout" ? `**${details.loserName}** ran out of time.\n` : "";
    embeds.push({
      title: `🏆 ${details.winnerName} wins ${details.wagerAmount} ${DISCORD_GP_EMOJI}`,
      description: `${outcome}Rolls: ${rollPath(details)}`,
      color: BET_COLORS.won,
    });
  }

  return embeds;
}

/**
 * Marks a listing as having received its 1-hour closing notification.
 */
export const markClosingNotificationSent = internalMutation({
  args: { listingId: v.id("blackVoidListings") },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) return;
    await ctx.db.patch(args.listingId, { closingNotificationSent: true });
  },
});

/**
 * Queries active item listings that will expire within the next hour and haven't notified yet.
 */
export const getListingsClosingSoon = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneHourFromNow = now + 60 * 60 * 1000;

    // Use by_status index to query active listings
    const activeListings = await ctx.db
      .query("blackVoidListings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Filter to item listings closing within 1 hour that haven't expired yet and haven't notified
    return activeListings
      .filter(
        (l) =>
          l.type === "item" &&
          l.expiresAt !== undefined &&
          l.expiresAt > now &&
          l.expiresAt <= oneHourFromNow &&
          !l.closingNotificationSent
      )
      .map((l) => l._id);
  },
});

/**
 * Action to notify #black-void of a newly created auction house listing.
 */
export const notifyNewListing = internalAction({
  args: { listingId: v.id("blackVoidListings") },
  handler: async (ctx, args) => {
    const details = await ctx.runQuery(internal.blackVoidDiscord.getListingNotificationDetails, {
      listingId: args.listingId,
    });
    if (!details) return;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://guild.tarragon.be";
    const blackVoidUrl = `${baseUrl}/black-void`;

    const isItem = details.type === "item";
    const title = isItem
      ? `📦 New Auction Listing: ${details.name}`
      : `🛠️ New Service Offered: ${details.name}`;

    const fields: Array<{ name: string; value: string; inline?: boolean }> = [
      {
        name: "Listed By",
        value: details.sellerLvl ? `${details.sellerName} (Lvl ${details.sellerLvl})` : details.sellerName,
        inline: true,
      },
    ];

    if (isItem) {
      if (details.startingBid !== undefined) {
        fields.push({ name: "Starting Bid", value: `${details.startingBid} ${DISCORD_GP_EMOJI}`, inline: true });
      }
      if (details.buyoutPrice !== undefined) {
        fields.push({ name: "Buyout Price", value: `${details.buyoutPrice} ${DISCORD_GP_EMOJI}`, inline: true });
      }
      if (details.expiresAt) {
        const discordTimestamp = Math.floor(details.expiresAt / 1000);
        fields.push({
          name: "Closes",
          value: `<t:${discordTimestamp}:R> (<t:${discordTimestamp}:f>)`,
          inline: false,
        });
      }
    } else {
      let feeStr = "Custom";
      if (details.priceType === "flat" && details.markupGp !== undefined) {
        feeStr = `${details.markupGp} ${DISCORD_GP_EMOJI} Flat Fee`;
      } else if (details.priceType === "percentage" && details.percentage !== undefined) {
        feeStr = `${details.percentage}% of item value`;
      } else if (details.priceDetails) {
        feeStr = details.priceDetails;
      }
      fields.push({ name: "Fee", value: feeStr, inline: true });

      if (details.minLevel !== undefined || details.maxLevel !== undefined) {
        fields.push({
          name: "Item Level Range",
          value: `Lvl ${details.minLevel ?? 1} - ${details.maxLevel ?? details.sellerLvl ?? 20}`,
          inline: true,
        });
      }
    }

    if (details.description) {
      fields.push({
        name: "Description",
        value: details.description.length > 300
          ? details.description.slice(0, 297) + "..."
          : details.description,
        inline: false,
      });
    }

    if (details.nethysUrl) {
      fields.push({
        name: "Archives of Nethys",
        value: `[View on AoN](${details.nethysUrl})`,
        inline: false,
      });
    }

    const embed = {
      title,
      description: isItem
        ? `A new item has been placed on the Black Void Auction House!`
        : `A new crafting or mercenary service is now available in the Black Void!`,
      color: 0x8b5cf6, // Purple
      url: blackVoidUrl,
      fields,
      timestamp: new Date().toISOString(),
      footer: {
        text: "Black Void Auction House",
      },
    };

    await sendDiscordBlackVoidMessage({ embeds: [embed] });
  },
});

/**
 * Action to notify #black-void of an open public deathroll bet challenge.
 */
export const notifyPublicBetInvite = internalAction({
  args: { betId: v.id("blackVoidBets") },
  handler: async (ctx, args) => {
    const details = await ctx.runQuery(internal.blackVoidDiscord.getBetNotificationDetails, {
      betId: args.betId,
    });
    // Only notify for public challenges (no specific targetCharacterId)
    if (!details || details.targetCharacterId) return;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://guild.tarragon.be";
    const betsUrl = `${baseUrl}/black-void?tab=bets`;

    const messageId = await sendDiscordBlackVoidMessage({ embeds: [buildBetEmbed(details, betsUrl)] });
    if (messageId) {
      await ctx.runMutation(internal.blackVoidDiscord.setBetDiscordIds, {
        betId: args.betId,
        discordMessageId: messageId,
      });
    }
  },
});

/**
 * Action to reflect a bet's progress on Discord: refreshes the original invite embed and
 * posts a play-by-play update in a thread on that invite (created when the bet is accepted).
 */
export const notifyBetProgress = internalAction({
  args: {
    betId: v.id("blackVoidBets"),
    event: v.union(v.literal("accepted"), v.literal("rolled"), v.literal("timeout"), v.literal("cancelled")),
  },
  handler: async (ctx, args) => {
    const details = await ctx.runQuery(internal.blackVoidDiscord.getBetNotificationDetails, {
      betId: args.betId,
    });
    // Direct challenges are never posted
    if (!details?.discordMessageId) return;

    const channelId = process.env.DISCORD_BV_CHANNEL_ID || DEFAULT_BV_CHANNEL_ID;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://guild.tarragon.be";
    const betsUrl = `${baseUrl}/black-void?tab=bets`;

    await discordRequest(`/channels/${channelId}/messages/${details.discordMessageId}`, "PATCH", {
      embeds: [buildBetEmbed(details, betsUrl)],
    });

    if (args.event === "cancelled") return;

    let threadId = details.discordThreadId;
    let isNewThread = false;
    if (!threadId) {
      let threadTitle = `🎲 ${details.senderName} vs ${details.accepterName}: ${details.wagerAmount} GP`;
      if (threadTitle.length > 100) {
        threadTitle = threadTitle.substring(0, 97) + "...";
      }
      // ponytail: two racing events can't both open a thread, the second update is skipped
      const thread = await discordRequest(
        `/channels/${channelId}/messages/${details.discordMessageId}/threads`,
        "POST",
        { name: threadTitle, auto_archive_duration: 10080 } // 7 days
      );
      if (!thread) return;
      threadId = thread.id;
      isNewThread = true;
      await ctx.runMutation(internal.blackVoidDiscord.setBetDiscordIds, {
        betId: args.betId,
        discordThreadId: threadId,
      });
    }

    // Ping the two betters only in the very first message of the thread so they are added to it
    let content: string | undefined = undefined;
    if (isNewThread) {
      const senderTag = details.senderDiscordId ? ` (<@${details.senderDiscordId}>)` : "";
      const accepterTag = details.accepterDiscordId ? ` (<@${details.accepterDiscordId}>)` : "";
      content = `⚔️ **${details.senderName}**${senderTag} vs **${details.accepterName}**${accepterTag} — Deathroll duel started!`;
    }

    await discordRequest(`/channels/${threadId}/messages`, "POST", {
      content,
      embeds: buildBetThreadUpdate(details, args.event),
    });
  },
});

/**
 * Action to notify #black-void when an auction listing is closing within 1 hour.
 */
export const notifyClosingSoonListing = internalAction({
  args: { listingId: v.id("blackVoidListings") },
  handler: async (ctx, args) => {
    const details = await ctx.runQuery(internal.blackVoidDiscord.getListingNotificationDetails, {
      listingId: args.listingId,
    });
    if (!details) return;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://guild.tarragon.be";
    const blackVoidUrl = `${baseUrl}/black-void`;

    const discordTimestamp = details.expiresAt ? Math.floor(details.expiresAt / 1000) : null;
    const timeRemainingStr = discordTimestamp
      ? `<t:${discordTimestamp}:R> (<t:${discordTimestamp}:t>)`
      : "in under 1 hour";

    const fields: Array<{ name: string; value: string; inline?: boolean }> = [
      {
        name: "Seller",
        value: details.sellerLvl ? `${details.sellerName} (Lvl ${details.sellerLvl})` : details.sellerName,
        inline: true,
      },
      {
        name: "Current Bid",
        value: details.winningAmount !== undefined
          ? `💰 **${details.winningAmount} ${DISCORD_GP_EMOJI}**`
          : details.startingBid !== undefined
          ? `${details.startingBid} ${DISCORD_GP_EMOJI} (Starting)`
          : "Buyout Only",
        inline: true,
      },
    ];

    if (details.winningBidderName) {
      fields.push({ name: "High Bidder", value: details.winningBidderName, inline: true });
    }

    if (details.buyoutPrice !== undefined) {
      fields.push({ name: "Buyout Price", value: `${details.buyoutPrice} ${DISCORD_GP_EMOJI}`, inline: true });
    }

    fields.push({ name: "Auction Closes", value: timeRemainingStr, inline: false });

    if (details.nethysUrl) {
      fields.push({
        name: "Archives of Nethys",
        value: `[View Item Details](${details.nethysUrl})`,
        inline: false,
      });
    }

    const embed = {
      title: `⏳ Auction Ending Soon: ${details.name}`,
      description: `The auction for **${details.name}** is closing in less than 1 hour! Place your final bids before time runs out.`,
      color: 0xef4444, // Red / Urgent
      url: blackVoidUrl,
      fields,
      timestamp: new Date().toISOString(),
      footer: {
        text: "Black Void Auction House • Final Call",
      },
    };

    const sent = await sendDiscordBlackVoidMessage({ embeds: [embed] });
    if (sent) {
      await ctx.runMutation(internal.blackVoidDiscord.markClosingNotificationSent, {
        listingId: args.listingId,
      });
    }
  },
});

/**
 * Periodic cron action checking for active auction items closing within 1 hour.
 */
export const checkClosingSoonListings = internalAction({
  args: {},
  handler: async (ctx) => {
    const listingIds = await ctx.runQuery(internal.blackVoidDiscord.getListingsClosingSoon, {});

    for (const listingId of listingIds) {
      try {
        await ctx.runAction(internal.blackVoidDiscord.notifyClosingSoonListing, { listingId });
      } catch (err) {
        console.error(`Error sending closing notification for listing ${listingId}:`, err);
      }
    }
  },
});

/**
 * Queries service listing, craftsman, requester character, and both user Discord IDs for the contact notification.
 */
export const getContactServiceListingDetails = internalQuery({
  args: {
    listingId: v.id("blackVoidListings"),
    buyerCharacterId: v.id("characters"),
  },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.type !== "service") return null;

    const craftsmanChar = await ctx.db.get(listing.characterId);
    const buyerChar = await ctx.db.get(args.buyerCharacterId);

    if (!craftsmanChar || !buyerChar) return null;

    const craftsmanUser = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", craftsmanChar.userId))
      .first();

    const buyerUser = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", buyerChar.userId))
      .first();

    return {
      listingName: listing.name,
      priceDetails: listing.priceDetails,
      priceType: listing.priceType,
      percentage: listing.percentage,
      markupGp: listing.markupGp,
      craftsmanName: craftsmanChar.name,
      craftsmanLvl: craftsmanChar.lvl,
      craftsmanDiscordId: craftsmanUser?.discordId || null,
      buyerName: buyerChar.name,
      buyerLvl: buyerChar.lvl,
      buyerDiscordId: buyerUser?.discordId || null,
    };
  },
});

/**
 * Action to send a contact inquiry message into #black-void and create a conversation thread.
 */
export const contactServiceListing = internalAction({
  args: {
    listingId: v.id("blackVoidListings"),
    buyerCharacterId: v.id("characters"),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const channelId = process.env.DISCORD_BV_CHANNEL_ID || DEFAULT_BV_CHANNEL_ID;

    if (!botToken) {
      console.warn("Discord bot token not configured.");
      return false;
    }

    const details: {
      listingName: string;
      priceDetails?: string;
      priceType?: "percentage" | "flat" | "custom";
      percentage?: number;
      markupGp?: number;
      craftsmanName: string;
      craftsmanLvl: number;
      craftsmanDiscordId: string | null;
      buyerName: string;
      buyerLvl: number;
      buyerDiscordId: string | null;
    } | null = await ctx.runQuery(
      internal.blackVoidDiscord.getContactServiceListingDetails,
      {
        listingId: args.listingId,
        buyerCharacterId: args.buyerCharacterId,
      }
    );

    if (!details) {
      console.warn("Could not find contact details for service listing.");
      return false;
    }

    const craftsmanTag = details.craftsmanDiscordId ? ` (<@${details.craftsmanDiscordId}>)` : "";
    const buyerTag = details.buyerDiscordId ? ` (<@${details.buyerDiscordId}>)` : "";

    const pingMessage: string = `🛎️ **${details.craftsmanName}**${craftsmanTag}: **${details.buyerName}**${buyerTag} wants more information or to hire them for **${details.listingName}**!`;

    try {
      // 1. Post the main ping message to #black-void
      const msgRes = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: pingMessage,
        }),
      });

      if (!msgRes.ok) {
        const errText = await msgRes.text();
        console.error(`Discord API error creating message in #black-void (${msgRes.status}):`, errText);
        return false;
      }

      const createdMsg = await msgRes.json();
      const messageId = createdMsg.id;

      // 2. Create a public thread attached to the ping message to start the conversation
      let threadTitle = `Inquiry: ${details.listingName} (${details.buyerName})`;
      if (threadTitle.length > 100) {
        threadTitle = threadTitle.substring(0, 97) + "...";
      }

      const threadRes = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages/${messageId}/threads`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: threadTitle,
          auto_archive_duration: 1440, // 24 hours
        }),
      });

      if (!threadRes.ok) {
        const errText = await threadRes.text();
        console.warn(`Could not create thread from message in #black-void (${threadRes.status}):`, errText);
      } else {
        const threadData = await threadRes.json();
        const threadId = threadData.id;

        // 3. If an optional note/message was provided by the user, post it into the thread
        if (args.message && args.message.trim()) {
          const userNote = args.message.trim();
          const noteContent = `💬 **${details.buyerName}**: ${userNote}`;

          await fetch(`${DISCORD_API_BASE}/channels/${threadId}/messages`, {
            method: "POST",
            headers: {
              Authorization: `Bot ${botToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: noteContent,
            }),
          });
        }
      }

      return true;
    } catch (err) {
      console.error("Failed to post contact inquiry or create thread in #black-void:", err);
      return false;
    }
  },
});


