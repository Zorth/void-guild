import { action, mutation, internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

import { DISCORD_API_BASE, getQuestLevelStr, formatInGameDate } from "./discordHelpers";


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
    const isPlanning = session.planning || !session.date;
    const isPrivate = Boolean(session.isPrivate);
    const isIntro = Boolean(session.isIntro);
    
    let levelStr = (session.level && session.level > 0) ? `[Lvl ${session.level}]` : "[Lvl ?]";
    if (isIntro) {
        levelStr = `[Lvl ${session.system === 'PF' ? 1 : 3}]`;
    } else if (session.selectedQuest) {
        levelStr = `[${getQuestLevelStr(session.selectedQuest)}]`;
    }
    
    const interestCount = (session.interestedPlayers || []).length;
    const interestStr = interestCount > 0 ? ` (+${interestCount})` : "";
    const privateTag = isPrivate ? " [PRIVATE]" : "";
    const introTag = isIntro ? " 🌱 [INTRO]" : "";

    let threadName = isPlanning 
      ? `(PLANNING) The Void: ${session.worldName}${privateTag}${introTag} ${levelStr} [${interestCount} Interested]`
      : `(${dateStr}) The Void: ${session.worldName}${privateTag}${introTag} ${levelStr} [${session.attendingCharacters.length}/${session.maxPlayers}${interestStr}]`;

    if (threadName.length > 100) {
      threadName = threadName.substring(0, 97) + "...";
    }

    const unixTimestamp = session.date ? Math.floor(session.date / 1000) : null;
    const dateInfo = (isPlanning || !unixTimestamp) 
      ? "TBD (Planning Phase)" 
      : `<t:${unixTimestamp}:F> (<t:${unixTimestamp}:R>)\n**Session starts at** <t:${unixTimestamp + 1800}:t>`;

    const systemEmoji = session.system === 'PF' ? '<:Pathfinder:1322734594864320522>' : '<:DnD:1322734981524754473>';
    const systemName = session.system === 'PF' ? 'Pathfinder 2e' : 'D&D 5e';
    const locationInfo = session.location ? `[View on Google Maps](${session.location})` : (isPlanning ? 'TBD (Planning Phase)' : 'TBD');
    
    let levelInfo = (session.level && session.level > 0) 
      ? `Level ${session.level}` 
      : "Discuss what you're going to do to decide the mission's level";
    
    if (isIntro) {
      levelInfo = `Level ${session.system === 'PF' ? 1 : 3} (Intro Session)`;
    } else if (session.selectedQuest) {
      levelInfo = getQuestLevelStr(session.selectedQuest);
    }

    const worldLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://guild.tarragon.be'}/world/${encodeURIComponent(session.worldName)}`;
    const sessionLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://guild.tarragon.be'}/sessions/${session._id}`;
    
    let questContent = "";
    if (isIntro) {
      questContent = `\n## 🌱 Intro Session\n> This session is designed for new players and beginners. No quest selection is required, and character level is set to Level ${session.system === 'PF' ? 1 : 3}.\n`;
    } else if (session.selectedQuest) {
        const qLevel = getQuestLevelStr(session.selectedQuest);
        questContent = `\n## Quest\n**${session.selectedQuest.name}** (${qLevel})`;
        if (session.selectedQuest.description) {
            // Truncate description if very long
            const desc = session.selectedQuest.description.length > 500 
                ? session.selectedQuest.description.substring(0, 497) + "..." 
                : session.selectedQuest.description;
            
            // Format each line with blockquote
            const formattedDesc = desc.split("\n")
              .map((line: string) => line.trim() ? `> ${line}` : ">")
              .join("\n");
            questContent += `\n${formattedDesc}`;
        }
        questContent += "\n";
    } else if (session.quests && session.quests.length > 0) {
        // Show only up to 5 quests to avoid exceeding 2000 char limit
        const displayedQuests = session.quests.slice(0, 5);
        questContent = "\n## Quests\n" + displayedQuests.map((q: any) => {
          const qLevel = getQuestLevelStr(q);
          let str = `**${q.name}** (${qLevel})`;
          if (q.description) {
            // Truncate description for list view
            const desc = q.description.length > 200 
                ? q.description.substring(0, 197) + "..." 
                : q.description;
            
            // Format each line with blockquote
            const formattedDesc = desc.split("\n")
              .map((line: string) => line.trim() ? `> ${line}` : ">")
              .join("\n");
            str += `\n${formattedDesc}`;
          }
          return str;
        }).join("\n") + "\n";
        
        if (session.quests.length > 5) {
            questContent += `*...and ${session.quests.length - 5} more on the website!*\n`;
        }
    }

    const { eras, yearZeroExists } = (() => {
      if (!session.worldCalendar) return { eras: [], yearZeroExists: false }
      try {
        const parsed = JSON.parse(session.worldCalendar)
        return {
          eras: parsed.static_data?.eras || parsed.static?.eras || [],
          yearZeroExists: parsed.static_data?.settings?.year_zero_exists || parsed.static?.settings?.year_zero_exists || false
        }
      } catch (e) {
        return { eras: [], yearZeroExists: false }
      }
    })()

    const inGameDateInfo = formatInGameDate(session.inGameDate, eras, yearZeroExists);

    const privateBanner = isPrivate
      ? `🔒 **PRIVATE SESSION (UNLISTED)**\n*This session is private and not listed in the public session list. Characters can only join when added manually by the session owner.*\n\n`
      : "";

    const callToAction = isPrivate
      ? `*🔒 This is a private, unlisted session. Characters can only be added manually by the session owner.*`
      : (isPlanning 
        ? `*This session is currently in the planning phase. Click the link above to **show your interest** and make it easier for everyone to pick a date by filling in the Planning tab!*`
        : `*Click the link above to **sign up with your character**! Voidmasters encourage you to use this thread to discuss your plans and prepare for this session!*`);

    const messageContent = `# ${systemEmoji} [${session.worldName}](${worldLink})\n` +
      privateBanner +
      `**System**: ${systemName}\n` +
      `**Level**: ${levelInfo}\n` +
      `**Location**: ${locationInfo}\n` +
      `**Date**: ${dateInfo}\n` +
      (inGameDateInfo ? `**In-Game Date**: ${inGameDateInfo}\n` : "") +
      questContent + "\n" +
      `[**VIEW SESSION ON GUILD**]( ${sessionLink} )\n\n` +
      callToAction;

    // Truncate messageContent if it somehow still exceeds 2000 chars (Discord limit)
    const finalMessageContent = messageContent.length > 2000 
        ? messageContent.substring(0, 1990) + "\n(Truncated...)" 
        : messageContent;

    // Format the list of signed-up characters and interested players for the embed fields
    const signupList = session.attendingCharacters.length > 0
      ? session.attendingCharacters.map((c: any) => {
          const ping = c.discordId ? ` (<@${c.discordId}>)` : "";
          const titleStr = c.title ? ` *"${c.title}"*` : "";
          return `• **${c.name}**${titleStr} (Lvl ${c.lvl} ${c.class})${ping}`;
        }).join("\n")
      : (isPlanning 
          ? (isPrivate ? "_No characters invited yet (Invite-Only)._" : "_Signups not yet open._")
          : (isPrivate ? "_No characters invited yet (Invite-Only)._" : "_No characters signed up yet._"));
    
    const interestList = (session.interestedPlayers && session.interestedPlayers.length > 0)
      ? session.interestedPlayers.map((p: any) => {
          const ping = p.discordId ? ` (<@${p.discordId}>)` : "";
          return `• **${p.username}**${ping}`;
        }).join("\n")
      : "_No interest expressed yet._";

    const embedFields = [
      { name: isPrivate ? "Invited Characters" : "Current Signups", value: signupList, inline: false },
    ];
    if (!isPrivate) {
      embedFields.push({ name: "Interested Players", value: interestList, inline: false });
    }

    const embed = {
      title: isPrivate ? "Session Participants (Private / Invite-Only)" : "Session Participants",
      fields: embedFields,
      color: isPrivate ? 0xd97706 : (session.system === 'PF' ? 0xde2e2e : 0xe81123),
      url: sessionLink,
      timestamp: new Date().toISOString(),
      footer: { text: isPrivate ? "Void Guild Session Tracker • Private Session" : "Void Guild Session Tracker" }
    };

    // 2. If we have a thread ID, update the first message and thread name
    if (session.discordThreadId) {
      try {
        // Update thread name
        // NOTE: Discord heavily rate limits thread renaming (2 changes per 10 minutes).
        // We'll attempt it, but the message update is more important.
        await fetch(`${DISCORD_API_BASE}/channels/${session.discordThreadId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: threadName.substring(0, 100) }), // Ensure < 100 chars
        });

        // In forums, the first message has the same ID as the thread
        await fetch(`${DISCORD_API_BASE}/channels/${session.discordThreadId}/messages/${session.discordThreadId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            content: finalMessageContent,
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
        
        let appliedTags: string[] = [];
        if (channelResponse.ok) {
          const channel = await channelResponse.json();
          const tags: Array<{ id: string; name: string }> = channel.available_tags || [];
          
          // Match system tag (Pathfinder / D&D)
          const systemTag = tags.find((t) => 
            t.name.toLowerCase().includes(session.system?.toLowerCase() || 'none')
          );
          if (systemTag) {
            appliedTags.push(systemTag.id);
          }

          // Match default / session tag if present
          const sessionTag = tags.find((t) => 
            t.name.toLowerCase().includes('session') || t.name.toLowerCase().includes('void')
          );
          if (sessionTag && !appliedTags.includes(sessionTag.id)) {
            appliedTags.push(sessionTag.id);
          }
        }

        const threadBody: Record<string, any> = {
          name: threadName,
          auto_archive_duration: 1440, // 1 day
          message: {
            content: messageContent,
            embeds: [embed],
          },
        };

        if (appliedTags.length > 0) {
          threadBody.applied_tags = appliedTags;
        }

        const response = await fetch(`${DISCORD_API_BASE}/channels/${forumChannelId}/threads`, {
          method: "POST",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(threadBody),
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
 * Sends a session notification (New, Reminder, Cancellation).
 * - "new": Posts an announcement directly to the session's Discord forum thread, pinging @VoidPathfinder or @VoidDungeonsAndDragons.
 * - "remind": Posts a reminder with role ping to the activity feed channel (#ouroubouros-inn).
 * - "cancel": Posts cancellation to the activity feed channel, and also alerts inside the forum thread.
 */
export const sendSessionNotification = action({
  args: {
    sessionId: v.id("sessions"),
    type: v.union(v.literal("new"), v.literal("remind"), v.literal("cancel")),
  },
  handler: async (ctx, args) => {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const channelId = process.env.DISCORD_CHANNEL_ID;
    if (!botToken) {
      throw new Error("Discord bot token not configured.");
    }
    if (args.type !== 'new' && !channelId) {
      throw new Error("Discord activity channel ID not configured.");
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

    let levelInfo = (session.level && session.level > 0) 
      ? `Level ${session.level}` 
      : "Discuss what you're going to do to decide the mission's level";
    
    const isIntro = Boolean(session.isIntro);
    if (isIntro) {
      levelInfo = `Level ${session.system === 'PF' ? 1 : 3} (Intro Session)`;
    } else if (session.selectedQuest) {
      levelInfo = `Level ${getQuestLevelStr(session.selectedQuest)}`;
    }

    const content = (roleId && args.type !== 'cancel') ? `<@&${roleId}>` : undefined;
    let embedTitle = "";
    let embedDescription = "";
    let embedColor = 5814783; // Blueish

    const isPrivate = Boolean(session.isPrivate);

    if (args.type === 'new') {
      const typeLabel = isIntro ? "🌱 Intro Session" : "Session";
      embedTitle = isPrivate
        ? `🔒 Private ${typeLabel} Alert: ${session.worldName}`
        : `New ${typeLabel} Alert: ${session.worldName}`;
      embedDescription = session.date 
        ? (isPrivate 
            ? `A new private (unlisted) ${isIntro ? 'intro ' : ''}session for "${session.worldName}" has been scheduled for ${dateInfo}!`
            : `A new ${isIntro ? 'intro ' : ''}session for "${session.worldName}" has been announced for ${dateInfo}!`)
        : (isPrivate
            ? `A new private (unlisted) ${isIntro ? 'intro ' : ''}session for "${session.worldName}" is now in planning!`
            : `A new ${isIntro ? 'intro ' : ''}session for "${session.worldName}" is now in the planning phase! Express interest on the website to help pick a date.`);
    } else if (args.type === 'remind' && session.date) {
      const spotsLeft = session.maxPlayers - session.attendingCharacters.length;
      embedTitle = isPrivate 
        ? `🔒 Private Session Reminder: ${session.worldName}`
        : `Reminder: ${session.worldName}`;
      embedDescription = isPrivate
        ? `There are still ${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left in this private session! The session starts on ${dateInfo}.`
        : `There are still ${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left! The session starts on ${dateInfo}.`;
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
    const playersValue = `${session.attendingCharacters.length}/${session.maxPlayers}` + (!isPrivate && interestCount > 0 ? ` (+${interestCount} interested)` : "");

    const { eras, yearZeroExists } = (() => {
      if (!session.worldCalendar) return { eras: [], yearZeroExists: false }
      try {
        const parsed = JSON.parse(session.worldCalendar)
        return {
          eras: parsed.static_data?.eras || parsed.static?.eras || [],
          yearZeroExists: parsed.static_data?.settings?.year_zero_exists || parsed.static?.settings?.year_zero_exists || false
        }
      } catch (e) {
        return { eras: [], yearZeroExists: false }
      }
    })()

    const inGameDateInfo = formatInGameDate(session.inGameDate, eras, yearZeroExists);

    const embed: any = {
      title: embedTitle,
      description: embedDescription,
      color: isPrivate ? 0xd97706 : embedColor,
      fields: [
        { name: 'System', value: session.system === 'PF' ? '<:Pathfinder:1322734594864320522> Pathfinder 2e' : '<:DnD:1322734981524754473> D&D 5e', inline: true },
        { name: 'Level', value: levelInfo, inline: true },
        { name: 'Players', value: playersValue, inline: true },
        ...(isPrivate ? [{ name: 'Access', value: '🔒 Private (Owner Added Only)', inline: true }] : []),
        { name: 'Date & Time', value: dateInfo, inline: false },
      ],
      timestamp: new Date().toISOString(),
      url: (args.type !== 'cancel' && threadLink) ? threadLink : sessionLink,
    };

    if (inGameDateInfo && args.type !== 'cancel') {
      embed.fields.push({ name: 'In-Game Date', value: inGameDateInfo, inline: false });
    }

    if (session.location && args.type !== 'cancel') {
      embed.fields.push({ name: 'Location', value: `[View on Google Maps](${session.location})`, inline: false });
    }

    // 1. "new" notifications: ping the role in the session's forum thread directly
    if (args.type === 'new') {
      let targetThreadId = session.discordThreadId;

      // If the forum thread does not exist yet, sync session to create it first
      if (!targetThreadId) {
        await ctx.runAction(internal.discord.syncSessionToDiscord, { sessionId: args.sessionId });
        const refreshedSession = await ctx.runQuery(internal.discord.getInternalSessionDetails, { 
          sessionId: args.sessionId 
        });
        targetThreadId = refreshedSession?.discordThreadId;
      }

      if (!targetThreadId) {
        throw new Error("Could not find or create a Discord forum thread for this session.");
      }

      const response = await fetch(`${DISCORD_API_BASE}/channels/${targetThreadId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, embeds: [embed] }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Discord API error in thread (${response.status}):`, errorText);
        throw new Error(`Discord API error: ${errorText}`);
      }
      return;
    }

    // 2. Post cancellation message in the thread if it exists
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

    // 3. For "remind" and "cancel", post to the activity channel (#ouroubouros-inn)
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

// Re-export slash command queries and bot interactions from discordInteractions for backwards compatibility
export {
  getCharacterProfile,
  searchWorld,
  searchSessions,
  searchCharacters,
  searchWorlds,
  getUserActiveBets,
  createDiscordDeathrollChallenge,
  getActiveMarketListings,
  getUserMarketListings,
  getUserUnclaimedSummary,
} from "./discordInteractions";


/** Internal helpers **/

export const getInternalSessionDetails = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    const world = await ctx.db.get(session.world);
    const attendingCharacters = await Promise.all(
      session.characters.map(async (id) => {
        const c = await ctx.db.get(id);
        if (!c) return null;
        const ownerUser = await ctx.db
          .query("users")
          .withIndex("by_userId", (q) => q.eq("userId", c.userId))
          .first();
        return {
          ...c,
          discordId: ownerUser?.discordId || null,
        };
      })
    );

    const interestedPlayers = session.interestedPlayers
      ? await Promise.all(
          session.interestedPlayers.map(async (p) => {
            const userDoc = await ctx.db
              .query("users")
              .withIndex("by_userId", (q) => q.eq("userId", p.userId))
              .first();
            return {
              ...p,
              discordId: userDoc?.discordId || null,
            };
          })
        )
      : [];

    const gmCharacter = session.gmCharacter ? await ctx.db.get(session.gmCharacter) : null;

    const quests = await ctx.db
      .query('quests')
      .withIndex('by_worldId', (q) => q.eq('worldId', session.world))
      .collect();
    
    const worldlessQuests = await ctx.db
      .query('quests')
      .withIndex('by_worldId', (q) => q.eq('worldId', undefined))
      .collect();

    let selectedQuest = null;
    if (session.questId) {
        selectedQuest = await ctx.db.get(session.questId);
        // If the selected quest was marked hidden, do not reveal it on Discord
        if (selectedQuest?.isHidden) {
          selectedQuest = null;
        }
    }

    const availableQuests = [...quests, ...worldlessQuests].filter(q => !q.isHidden && !q.isCompleted && !q.isSuggested);

    return {
      ...session,
      worldName: world?.name || "Unknown World",
      worldCalendar: world?.calendar || null,
      attendingCharacters: attendingCharacters.filter((c): c is any => c !== null),
      interestedPlayers,
      gmCharacterName: gmCharacter?.name || null,
      quests: availableQuests,
      selectedQuest,
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



