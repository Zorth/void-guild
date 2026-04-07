import { action, internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const DISCORD_API_BASE = "https://discord.com/api/v10";

/**
 * Syncs a session's state to a Discord Forum post.
 * Creates the post if it doesn't exist, otherwise updates it.
 */
export const syncSessionToDiscord = internalAction({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const forumChannelId = process.env.DISCORD_FORUM_CHANNEL_ID;

    if (!botToken || !forumChannelId) {
      console.warn("Discord bot token or forum channel ID not configured.");
      return;
    }

    // 1. Fetch session details using an internal query
    const session = await ctx.runQuery(internal.discord.getInternalSessionDetails, { 
      sessionId: args.sessionId 
    });

    if (!session) return;

    const sessionTime = session.date ? new Date(session.date) : null;
    let dateStr = "TBD";
    if (sessionTime) {
      // Use Europe/Brussels to ensure the thread name reflects the GM's intended day/month
      const formatter = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        timeZone: 'Europe/Brussels'
      });
      const parts = formatter.formatToParts(sessionTime);
      const day = parts.find(p => p.type === 'day')?.value || "01";
      const month = parts.find(p => p.type === 'month')?.value || "01";
      dateStr = `${day}/${month}`;
    }
    
    // Format: (DD/MM) The Void: <WorldName> [Lvl X] [<signupCharacters>/<MaxCharacters>]
    // OR: (PLANNING) The Void: <WorldName> [Lvl X] [<interestCount> Interested]
    const isPlanning = session.planning || !session.date;
    const levelStr = (session.level && session.level > 0) ? `[Lvl ${session.level}]` : "[Lvl ?]";
    const threadName = isPlanning 
      ? `(PLANNING) The Void: ${session.worldName} ${levelStr} [${(session.interestedPlayers || []).length} Interested]`
      : `(${dateStr}) The Void: ${session.worldName} ${levelStr} [${session.attendingCharacters.length}/${session.maxPlayers}]`;

    const unixTimestamp = session.date ? Math.floor(session.date / 1000) : null;
    const dateInfo = (isPlanning || !unixTimestamp) 
      ? "TBD (Planning Phase)" 
      : `<t:${unixTimestamp}:F> (<t:${unixTimestamp}:R>)\n**Session starts at** <t:${unixTimestamp + 1800}:t>`;

    const systemEmoji = session.system === 'PF' ? '<:Pathfinder:1322734594864320522>' : '<:DnD:1322734981524754473>';
    const systemName = session.system === 'PF' ? 'Pathfinder 2e' : 'D&D 5e';
    const locationInfo = session.location ? `[View on Google Maps](${session.location})` : (isPlanning ? 'TBD (Planning Phase)' : 'TBD');
    const levelInfo = (session.level && session.level > 0) 
      ? `Level ${session.level}` 
      : "Discuss what you're going to do to decide the mission's level";
    const worldLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://guild.tarragon.be'}/world/${encodeURIComponent(session.worldName)}`;
    const sessionLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://guild.tarragon.be'}/sessions/${session._id}`;
    
    const messageContent = `# ${systemEmoji} [${session.worldName}](${worldLink})\n` +
      `**System**: ${systemName}\n` +
      `**Level**: ${levelInfo}\n` +
      `**Location**: ${locationInfo}\n` +
      `**Date**: ${dateInfo}\n\n` +
      `[**VIEW SESSION ON GUILD**]( ${sessionLink} )\n\n` +
      (isPlanning 
        ? `*This session is currently in the planning phase. Click the link above to **show your interest** and make it easier for everyone to pick a date by filling in the Planning tab!*`
        : `*Click the link above to **sign up with your character**! Voidmasters encourage you to use this thread to discuss your plans and prepare for this session!*`);

    // Format the list of signed-up characters and interested players for the embed fields
    const signupList = session.attendingCharacters.length > 0
      ? session.attendingCharacters.map(c => `• **${c.name}** (Lvl ${c.lvl} ${c.class})`).join("\n")
      : (isPlanning ? "_Signups not yet open._" : "_No characters signed up yet._");
    
    const interestList = (session.interestedPlayers && session.interestedPlayers.length > 0)
      ? session.interestedPlayers.map(p => `• **${p.username}**`).join("\n")
      : "_No interest expressed yet._";

    const embed = {
      title: "Session Participants",
      fields: [
        { name: "Current Signups", value: signupList, inline: false },
        { name: "Interested Players", value: interestList, inline: false },
      ],
      color: session.system === 'PF' ? 0xde2e2e : 0xe81123,
      url: sessionLink,
      timestamp: new Date().toISOString(),
      footer: { text: "Void Guild Session Tracker" }
    };

    // 2. If we have a thread ID, update the first message and thread name
    if (session.discordThreadId) {
      try {
        // Update thread name
        await fetch(`${DISCORD_API_BASE}/channels/${session.discordThreadId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: threadName }),
        });

        // In forums, the first message has the same ID as the thread
        await fetch(`${DISCORD_API_BASE}/channels/${session.discordThreadId}/messages/${session.discordThreadId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            content: messageContent,
            embeds: [embed] 
          }),
        });
      } catch (e) {
        console.error("Failed to update Discord thread:", e);
      }
    } else {
      // 3. Create a new thread in the forum channel
      try {
        // Fetch channel to get available tags
        const channelResponse = await fetch(`${DISCORD_API_BASE}/channels/${forumChannelId}`, {
          headers: { Authorization: `Bot ${botToken}` },
        });
        
        let appliedTags: string[] = ["1322271502950993940"];
        if (channelResponse.ok) {
          const channel = await channelResponse.json();
          const tags = channel.available_tags || [];
          const systemTag = tags.find((t: any) => 
            t.name.toLowerCase().includes(session.system?.toLowerCase() || 'none')
          );
          if (systemTag && !appliedTags.includes(systemTag.id)) {
            appliedTags.push(systemTag.id);
          }
        }

        const response = await fetch(`${DISCORD_API_BASE}/channels/${forumChannelId}/threads`, {
          method: "POST",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: threadName,
            auto_archive_duration: 1440, // 1 day
            applied_tags: appliedTags,
            message: {
              content: messageContent,
              embeds: [embed],
            },
          }),
        });

        if (response.ok) {
          const thread = await response.json();
          // Store the thread ID back in Convex
          await ctx.runMutation(internal.discord.updateSessionThreadId, {
            sessionId: args.sessionId,
            threadId: thread.id,
          });
        } else {
          const err = await response.text();
          console.error("Discord API error:", err);
        }
      } catch (e) {
        console.error("Failed to create Discord thread:", e);
      }
    }
  },
});

/**
 * Sends a message to a Discord channel via the bot.
 */
export const sendActivityToDiscord = internalAction({
  args: { 
    message: v.optional(v.string()),
    embeds: v.optional(v.array(v.any()))
  },
  handler: async (ctx, args) => {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const channelId = process.env.DISCORD_CHANNEL_ID;
    if (!botToken || !channelId) {
      console.warn("Discord bot token or activity channel ID not configured.");
      return;
    }

    try {
      const response = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          content: args.message,
          embeds: args.embeds 
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Discord API error (${response.status}):`, errorText);
      }
    } catch (e) {
      console.error("Failed to send activity to Discord:", e);
    }
  },
});

/**
 * Sends a session notification (New, Reminder, Cancellation) to the activity channel.
 */
export const sendSessionNotification = action({
  args: {
    sessionId: v.id("sessions"),
    type: v.union(v.literal("new"), v.literal("remind"), v.literal("cancel")),
  },
  handler: async (ctx, args) => {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const channelId = process.env.DISCORD_CHANNEL_ID;
    if (!botToken || !channelId) {
      throw new Error("Discord bot token or activity channel ID not configured.");
    }

    const session = await ctx.runQuery(internal.discord.getInternalSessionDetails, { 
      sessionId: args.sessionId 
    });
    if (!session) throw new Error("Session not found");

    const unixTimestamp = session.date ? Math.floor(session.date / 1000) : null;
    let dateInfo = "TBD";
    if (unixTimestamp) {
      dateInfo = `<t:${unixTimestamp}:F> (<t:${unixTimestamp}:R>)\n**Session starts at** <t:${unixTimestamp + 1800}:t>`;
    }

    const roleId = session.system === 'PF' 
      ? process.env.DISCORD_ROLE_ID_PF 
      : process.env.DISCORD_ROLE_ID_DND;

    const levelInfo = (session.level && session.level > 0) 
      ? `Level ${session.level}` 
      : "Discuss what you're going to do to decide the mission's level";

    let content = (roleId && args.type !== 'cancel') ? `<@&${roleId}>` : undefined;
    let embedTitle = "";
    let embedDescription = "";
    let embedColor = 5814783; // Blueish

    if (args.type === 'new') {
      embedTitle = `New Session Alert: ${session.worldName}`;
      embedDescription = session.date 
        ? `A new session for "${session.worldName}" has been announced for ${dateInfo}!`
        : `A new session for "${session.worldName}" is now in the planning phase! Express interest on the website to help pick a date.`;
    } else if (args.type === 'remind' && session.date) {
      const spotsLeft = session.maxPlayers - session.attendingCharacters.length;
      embedTitle = `Reminder: ${session.worldName}`;
      embedDescription = `There are still ${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left! The session starts on ${dateInfo}.`;
      embedColor = 16776960; // Yellow
    } else if (args.type === 'cancel' && session.date) {
      embedTitle = `SESSION CANCELLED: ${session.worldName}`;
      embedDescription = `The session for "${session.worldName}" on ${dateInfo} has been cancelled and will no longer be happening.`;
      embedColor = 15158332; // Red
    }

    const sessionLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://guild.tarragon.be'}/sessions/${session._id}`;
    const guildId = process.env.DISCORD_GUILD_ID;
    const threadLink = (guildId && session.discordThreadId) 
      ? `https://discord.com/channels/${guildId}/${session.discordThreadId}` 
      : null;

    const interestCount = (session.interestedPlayers || []).length;
    const playersValue = `${session.attendingCharacters.length}/${session.maxPlayers}` + (interestCount > 0 ? ` (+${interestCount} interested)` : "");

    const embed: any = {
      title: embedTitle,
      description: embedDescription,
      color: embedColor,
      fields: [
        { name: 'System', value: session.system === 'PF' ? '<:Pathfinder:1322734594864320522> Pathfinder 2e' : '<:DnD:1322734981524754473> D&D 5e', inline: true },
        { name: 'Level', value: levelInfo, inline: true },
        { name: 'Players', value: playersValue, inline: true },
        { name: 'Date & Time', value: dateInfo, inline: false },
      ],
      timestamp: new Date().toISOString(),
      url: (args.type !== 'cancel' && threadLink) ? threadLink : sessionLink,
    };

    if (session.location && args.type !== 'cancel') {
      embed.fields.push({ name: 'Location', value: `[View on Google Maps](${session.location})`, inline: false });
    }

    // Post cancellation message in the thread if it exists
    if (args.type === 'cancel' && session.discordThreadId) {
      try {
        await fetch(`${DISCORD_API_BASE}/channels/${session.discordThreadId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            content: `🛑 **SESSION CANCELLED**\nThe session for "${session.worldName}" scheduled for ${dateInfo} has been cancelled.` 
          }),
        });
      } catch (e) {
        console.error("Failed to post cancellation to Discord thread:", e);
      }
    }

    const response = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content, embeds: [embed] }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Discord API error (${response.status}):`, errorText);
        throw new Error(`Discord API error: ${errorText}`);
    }
  },
});

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

    // Count how many locked (completed) sessions this character participated in
    const sessions = await ctx.db
      .query("sessions")
      .filter(q => q.and(
        q.eq(q.field("locked"), true),
      ))
      .collect();

    const sessionCount = sessions.filter(s => s.characters.includes(character._id)).length;

    return {
      ...character,
      sessionCount,
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

/** Internal helpers **/

export const getInternalSessionDetails = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    const world = await ctx.db.get(session.world);
    const attendingCharacters = await Promise.all(
      session.characters.map((id) => ctx.db.get(id))
    );

    const gmCharacter = session.gmCharacter ? await ctx.db.get(session.gmCharacter) : null;

    return {
      ...session,
      worldName: world?.name || "Unknown World",
      attendingCharacters: attendingCharacters.filter((c): c is any => c !== null),
      gmCharacterName: gmCharacter?.name || null,
    };
  },
});

export const updateSessionThreadId = internalMutation({
  args: { sessionId: v.id("sessions"), threadId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { discordThreadId: args.threadId });
  },
});

/**
 * Locks and archives a Discord thread.
 */
export const closeSessionThread = internalAction({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) return;

    try {
      await fetch(`${DISCORD_API_BASE}/channels/${args.threadId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          archived: true,
          locked: true
        }),
      });
    } catch (e) {
      console.error("Failed to close Discord thread:", e);
    }
  },
});
