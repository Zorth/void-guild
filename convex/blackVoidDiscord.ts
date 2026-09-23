import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { DISCORD_API_BASE } from "./discordHelpers";

const DEFAULT_BV_CHANNEL_ID = "1547741552649048125";

/**
 * Sends a message or embed payload to the #black-void Discord channel.
 */
async function sendDiscordBlackVoidMessage(payload: any) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_BV_CHANNEL_ID || DEFAULT_BV_CHANNEL_ID;

  if (!botToken) {
    console.warn("Discord bot token not configured.");
    return false;
  }

  try {
    const res = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Discord API error in #black-void (${res.status}):`, errText);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to send Discord message to #black-void:", err);
    return false;
  }
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
    return {
      _id: bet._id,
      senderCharacterId: bet.senderCharacterId,
      senderName: sender?.name || "Unknown Character",
      senderLvl: sender?.lvl,
      senderClass: sender?.class,
      wagerAmount: bet.wagerAmount,
      deathrollValue: bet.deathrollValue,
      message: bet.message,
      targetCharacterId: bet.targetCharacterId,
    };
  },
});

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
        fields.push({ name: "Starting Bid", value: `${details.startingBid} GP`, inline: true });
      }
      if (details.buyoutPrice !== undefined) {
        fields.push({ name: "Buyout Price", value: `${details.buyoutPrice} GP`, inline: true });
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
        feeStr = `${details.markupGp} GP Flat Fee`;
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

    const title = `🎲 Open Deathroll Challenge: ${details.wagerAmount} GP!`;
    const challengerStr = details.senderLvl
      ? `**${details.senderName}** (Lvl ${details.senderLvl})`
      : `**${details.senderName}**`;

    const fields: Array<{ name: string; value: string; inline?: boolean }> = [
      { name: "Challenger", value: challengerStr, inline: true },
      { name: "Wager", value: `💰 **${details.wagerAmount} GP**`, inline: true },
      { name: "Starting Roll", value: `🎲 /roll 1-${details.deathrollValue.toLocaleString()}`, inline: true },
    ];

    if (details.message) {
      fields.push({
        name: "Challenger's Note",
        value: `> "${details.message}"`,
        inline: false,
      });
    }

    const embed = {
      title,
      description: `${challengerStr} has thrown down an open Deathroll wager in the Black Void! Any adventurer can accept the challenge.`,
      color: 0xf59e0b, // Amber / Gold
      url: betsUrl,
      fields,
      timestamp: new Date().toISOString(),
      footer: {
        text: "Black Void • Deathroll Arena",
      },
    };

    await sendDiscordBlackVoidMessage({ embeds: [embed] });
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
          ? `💰 **${details.winningAmount} GP**`
          : details.startingBid !== undefined
          ? `${details.startingBid} GP (Starting)`
          : "Buyout Only",
        inline: true,
      },
    ];

    if (details.winningBidderName) {
      fields.push({ name: "High Bidder", value: details.winningBidderName, inline: true });
    }

    if (details.buyoutPrice !== undefined) {
      fields.push({ name: "Buyout Price", value: `${details.buyoutPrice} GP`, inline: true });
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
