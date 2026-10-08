import { action, mutation, internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

import { DISCORD_API_BASE, getQuestLevelStr, formatDiscordBlockquote, formatInGameDate } from "./discordHelpers";


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
            
            const formattedDesc = formatDiscordBlockquote(desc);
            if (formattedDesc) {
              questContent += `\n${formattedDesc}`;
            }
        }
        questContent += "\n";
    } else if (session.quests && session.quests.length > 0) {
        // Show only up to 5 quests to avoid exceeding 2000 char limit
        const displayedQuests = session.quests.slice(0, 5);
        questContent = "\n## Quests\n" + displayedQuests.map((q: any) => {
          const qLevel = getQuestLevelStr(q);
          let str = `• **${q.name}** (${qLevel})`;
          if (q.description) {
            // Truncate description for list view
            const desc = q.description.length > 200 
                ? q.description.substring(0, 197) + "..." 
                : q.description;
            
            const formattedDesc = formatDiscordBlockquote(desc);
            if (formattedDesc) {
              str += `\n${formattedDesc}`;
            }
          }
          return str;
        }).join("\n\n") + "\n";
        
        if (session.quests.length > 5) {
            questContent += `\n*...and ${session.quests.length - 5} more on the website!*\n`;
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

    const gmPing = session.gmDiscordId 
      ? `<@${session.gmDiscordId}>` 
      : (session.gmName || session.gmCharacterName || "Unknown");
    const gmDisplay = session.gmCharacterName && session.gmDiscordId
      ? `${gmPing} (${session.gmCharacterName})`
      : gmPing;

    const messageContent = `# ${systemEmoji} [${session.worldName}](${worldLink})\n` +
      privateBanner +
      `**Voidmaster**: ${gmDisplay}\n` +
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
      { name: "Voidmaster", value: gmDisplay, inline: true },
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

    let createdThreadId: string | null = null;

    // 2. If we have a thread ID, update the first message and thread name
    if (session.discordThreadId) {
      try {
        // Update thread name & ensure thread is not archived
        // NOTE: Discord heavily rate limits thread renaming (2 changes per 10 minutes).
        const threadPatchRes = await fetch(`${DISCORD_API_BASE}/channels/${session.discordThreadId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            name: threadName.substring(0, 100),
            archived: false,
          }),
        });

        if (!threadPatchRes.ok) {
          const errStatus = threadPatchRes.status;
          let retrySec = 0;
          try {
            const errData = await threadPatchRes.json();
            console.warn(`Discord thread name PATCH failed with status ${errStatus}:`, errData);
            if (errData?.retry_after) {
              retrySec = Number(errData.retry_after);
            }
          } catch (_) {}

          if (errStatus === 429 && retrySec > 0) {
            const retryMs = Math.ceil(retrySec * 1000) + 1500;
            console.log(`Scheduling Discord sync retry in ${Math.round(retryMs / 1000)}s due to thread name rate limit.`);
            await ctx.scheduler.runAfter(retryMs, internal.discord.syncSessionToDiscord, {
              sessionId: args.sessionId,
            });
          } else if (errStatus === 404) {
            console.warn("Discord thread not found (404). Resetting thread ID to recreate...");
            await ctx.runMutation(internal.discord.clearSessionThreadId, { sessionId: args.sessionId });
            await ctx.scheduler.runAfter(1000, internal.discord.syncSessionToDiscord, { sessionId: args.sessionId });
            return;
          }
        }

        // In forums, the first message has the same ID as the thread
        const msgPatchRes = await fetch(`${DISCORD_API_BASE}/channels/${session.discordThreadId}/messages/${session.discordThreadId}`, {
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

        if (!msgPatchRes.ok) {
          const msgErr = await msgPatchRes.text();
          console.error("Failed to update Discord thread message:", msgPatchRes.status, msgErr);
          if (msgPatchRes.status === 429) {
            try {
              const msgData = JSON.parse(msgErr);
              if (msgData?.retry_after) {
                const retryMs = Math.ceil(Number(msgData.retry_after) * 1000) + 1500;
                await ctx.scheduler.runAfter(retryMs, internal.discord.syncSessionToDiscord, {
                  sessionId: args.sessionId,
                });
              }
            } catch (_) {}
          }
        }

        // Ensure root message is pinned in the forum thread
        try {
          const pinsRes = await fetch(`${DISCORD_API_BASE}/channels/${session.discordThreadId}/pins`, {
            headers: {
              Authorization: `Bot ${botToken}`,
            },
          });
          let isAlreadyPinned = false;
          if (pinsRes.ok) {
            const pinnedList = await pinsRes.json();
            if (Array.isArray(pinnedList)) {
              isAlreadyPinned = pinnedList.some((p: any) => p.id === session.discordThreadId);
            }
          }

          if (!isAlreadyPinned) {
            const pinPutRes = await fetch(`${DISCORD_API_BASE}/channels/${session.discordThreadId}/pins/${session.discordThreadId}`, {
              method: "PUT",
              headers: {
                Authorization: `Bot ${botToken}`,
                "Content-Type": "application/json",
              },
            });
            if (!pinPutRes.ok) {
              const pinErrText = await pinPutRes.text();
              console.warn(`Could not pin root message on thread update (${pinPutRes.status}):`, pinErrText);
            } else {
              console.log(`Successfully pinned starter message for thread ${session.discordThreadId}`);
            }
          }
        } catch (pinErr) {
          console.warn("Could not check/pin root message on thread update:", pinErr);
        }
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
            content: finalMessageContent,
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
          createdThreadId = thread.id;
          // Store the thread ID back in Convex
          await ctx.runMutation(internal.discord.updateSessionThreadId, {
            sessionId: args.sessionId,
            threadId: thread.id,
          });

          // Pin the root/first message in the forum thread (message ID is thread.id)
          try {
            const pinPutRes = await fetch(`${DISCORD_API_BASE}/channels/${thread.id}/pins/${thread.id}`, {
              method: "PUT",
              headers: {
                Authorization: `Bot ${botToken}`,
                "Content-Type": "application/json",
              },
            });
            if (!pinPutRes.ok) {
              const pinErrText = await pinPutRes.text();
              console.warn(`Failed to pin root message in newly created forum thread (${pinPutRes.status}):`, pinErrText);
            } else {
              console.log(`Successfully pinned starter message for new thread ${thread.id}`);
            }
          } catch (pinErr) {
            console.error("Failed to pin root message in newly created forum thread:", pinErr);
          }
        } else {
          const err = await response.text();
          console.error("Discord API error on thread creation:", err);
        }
      } catch (e) {
        console.error("Failed to create Discord thread:", e);
      }
    }

    // 4. Automatically add all participating users (Voidmaster, signed-up characters, interested players) to the forum thread
    const targetThreadId = session.discordThreadId || createdThreadId;
    if (targetThreadId) {
      const targetDiscordIds = new Set<string>();
      if (session.gmDiscordId) {
        targetDiscordIds.add(session.gmDiscordId);
      }
      for (const c of session.attendingCharacters) {
        if (c.discordId) targetDiscordIds.add(c.discordId);
      }
      for (const p of (session.interestedPlayers || [])) {
        if (p.discordId) targetDiscordIds.add(p.discordId);
      }

      if (targetDiscordIds.size > 0) {
        await Promise.all(
          Array.from(targetDiscordIds).map(async (discordUserId) => {
            try {
              const res = await fetch(`${DISCORD_API_BASE}/channels/${targetThreadId}/thread-members/${discordUserId}`, {
                method: "PUT",
                headers: {
                  Authorization: `Bot ${botToken}`,
                },
              });
              if (!res.ok && res.status !== 204) {
                const text = await res.text().catch(() => "");
                console.warn(`Could not add user ${discordUserId} to thread ${targetThreadId} (${res.status}):`, text);
              }
            } catch (err) {
              console.warn(`Error adding user ${discordUserId} to thread ${targetThreadId}:`, err);
            }
          })
        );
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
 * - "new": Posts an announcement to the activity channel (#ourobouros), pinging @VoidPathfinder or @VoidDungeonsAndDragons with a link to the session's Discord forum post.
 * - "remind": Posts a reminder with role ping to the activity channel (#ourobouros) with a link to the session's Discord forum post.
 * - "cancel": Posts cancellation to the activity channel (#ourobouros), and also alerts inside the forum thread.
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
    if (!channelId) {
      throw new Error("Discord activity channel ID not configured.");
    }

    let session = await ctx.runQuery(internal.discord.getInternalSessionDetails, { 
      sessionId: args.sessionId 
    });
    if (!session) throw new Error("Session not found");

    // Ensure Discord forum thread exists so we have the forum link ready
    if (!session.discordThreadId) {
      await ctx.runAction(internal.discord.syncSessionToDiscord, { sessionId: args.sessionId });
      const refreshedSession = await ctx.runQuery(internal.discord.getInternalSessionDetails, { 
        sessionId: args.sessionId 
      });
      if (refreshedSession) {
        session = refreshedSession;
      }
    }

    const unixTimestamp = session.date ? Math.floor(session.date / 1000) : null;
    const isIntro = Boolean(session.isIntro);
    const isPrivate = Boolean(session.isPrivate);

    const roleId = session.system === 'PF' 
      ? process.env.DISCORD_ROLE_ID_PF 
      : process.env.DISCORD_ROLE_ID_DND;

    let levelInfo = (session.level && session.level > 0) 
      ? `Level ${session.level}` 
      : "Level TBD";
    
    if (isIntro) {
      levelInfo = `Level ${session.system === 'PF' ? 1 : 3} (Intro)`;
    } else if (session.selectedQuest) {
      levelInfo = `Level ${getQuestLevelStr(session.selectedQuest)}`;
    }

    const content = (roleId && args.type !== 'cancel') ? `<@&${roleId}>` : undefined;
    let embedTitle = "";
    let statusText = "";
    let embedColor = 5814783; // Blueish

    const typeLabel = isIntro ? "🌱 Intro Session" : "Session";

    if (args.type === 'new') {
      embedTitle = isPrivate
        ? `🔒 Private ${typeLabel} Alert: ${session.worldName}`
        : `New ${typeLabel} Alert: ${session.worldName}`;
      statusText = session.date 
        ? (isPrivate 
            ? `A new private session for **${session.worldName}** has been scheduled!`
            : `A new session for **${session.worldName}** has been announced!`)
        : (isPrivate
            ? `A new private session for **${session.worldName}** is in planning!`
            : `A new session for **${session.worldName}** is in planning! Express interest on the Guild to help pick a date.`);
    } else if (args.type === 'remind' && session.date) {
      const spotsLeft = session.maxPlayers - session.attendingCharacters.length;
      embedTitle = isPrivate 
        ? `🔒 Private Session Reminder: ${session.worldName}`
        : `Reminder: ${session.worldName}`;
      embedColor = 16776960; // Yellow
      statusText = spotsLeft > 0
        ? `There ${spotsLeft === 1 ? 'is still 1 spot' : `are still ${spotsLeft} spots`} left in this session!`
        : `This session is full, but you can still express interest or check the roster!`;
    } else if (args.type === 'cancel') {
      embedTitle = `SESSION CANCELLED: ${session.worldName}`;
      statusText = `The session for **${session.worldName}** has been cancelled.`;
      embedColor = 15158332; // Red
    }

    const sessionLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://guild.tarragon.be'}/sessions/${session._id}`;
    const guildId = process.env.DISCORD_GUILD_ID;
    const threadLink = (guildId && session.discordThreadId) 
      ? `https://discord.com/channels/${guildId}/${session.discordThreadId}` 
      : null;

    const gmPing = session.gmDiscordId 
      ? `<@${session.gmDiscordId}>` 
      : (session.gmName || session.gmCharacterName || "Unknown");
    const gmDisplay = session.gmCharacterName && session.gmDiscordId
      ? `${gmPing} (${session.gmCharacterName})`
      : gmPing;

    const interestCount = (session.interestedPlayers || []).length;
    const playersValue = `${session.attendingCharacters.length}/${session.maxPlayers}` + (!isPrivate && interestCount > 0 ? ` (+${interestCount} interested)` : "");

    const systemEmoji = session.system === 'PF' ? '<:Pathfinder:1322734594864320522>' : '<:DnD:1322734981524754473>';
    const systemName = session.system === 'PF' ? 'PF2e' : 'D&D 5e';

    const timeDisplay = unixTimestamp
      ? `<t:${unixTimestamp}:f> (<t:${unixTimestamp}:R>) • Starts <t:${unixTimestamp + 1800}:t>`
      : "In Planning (TBD)";

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

    // Build ultra-minimalist description card
    const descriptionLines: string[] = [statusText];
    descriptionLines.push(`📅 ${timeDisplay}`);

    const stats: string[] = [
      `👑 ${gmDisplay}`,
      `${systemEmoji} ${systemName}`,
      `📊 ${levelInfo}`,
      `👥 ${playersValue}`,
    ];
    if (inGameDateInfo && args.type !== 'cancel') {
      stats.push(`⌛ ${inGameDateInfo}`);
    }
    descriptionLines.push(stats.join(' • '));

    if (args.type !== 'cancel') {
      const links: string[] = [];
      if (session.discordThreadId) {
        links.push(`💬 <#${session.discordThreadId}>`);
      }
      links.push(`🌐 [View on Guild](${sessionLink})`);
      if (session.location) {
        links.push(`📍 [Map](${session.location})`);
      }
      if (links.length > 0) {
        descriptionLines.push(links.join(' • '));
      }
    }

    const embed: any = {
      title: embedTitle,
      description: descriptionLines.join("\n"),
      color: isPrivate ? 0xd97706 : embedColor,
      timestamp: new Date().toISOString(),
      url: (args.type !== 'cancel' && threadLink) ? threadLink : sessionLink,
    };

    // 1. Post cancellation message in the thread if it exists
    if (args.type === 'cancel' && session.discordThreadId) {
      try {
        await fetch(`${DISCORD_API_BASE}/channels/${session.discordThreadId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            content: `🛑 **SESSION CANCELLED**\nThe session for "${session.worldName}" scheduled for ${timeDisplay} has been cancelled.` 
          }),
        });
      } catch (e) {
        console.error("Failed to post cancellation to Discord thread:", e);
      }
    }

    // 2. For "new", "remind", and "cancel", post to the activity channel (#ourobouros)
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

    const gmUser = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", session.owner))
      .first();

    const gmCharacter = session.gmCharacter ? await ctx.db.get(session.gmCharacter) : null;

    const quests = session.world
      ? await ctx.db
          .query('quests')
          .withIndex('by_worldId', (q) => q.eq('worldId', session.world))
          .collect()
      : [];
    
    // Fetch worldless / global quests
    const worldlessQuests = await ctx.db
      .query('quests')
      .withIndex('by_worldId', (q) => q.eq('worldId', undefined))
      .collect();

    const questMap = new Map<string, typeof quests[0]>();
    for (const q of quests) questMap.set(q._id, q);
    for (const q of worldlessQuests) questMap.set(q._id, q);

    let selectedQuest = null;
    if (session.questId && !session.isIntro) {
        const qDoc = await ctx.db.get(session.questId);
        // If the selected quest was hidden, or completed (unless this session is already locked and completed it), do not show it
        if (qDoc && !qDoc.isHidden) {
          if (session.locked || !qDoc.isCompleted) {
            selectedQuest = qDoc;
          }
        }
    }

    const availableQuests = Array.from(questMap.values()).filter(
      (q) => !q.isHidden && !q.isCompleted && !q.isSuggested
    );

    // Sort quests lowest level first based on the session's system (PF vs DnD)
    const sortedQuests = availableQuests.sort((a, b) => {
      const getLvl = (q: any) => {
        if (session.system === 'PF') {
          return q.levelPF ?? (q.levelDnD === undefined ? q.level : undefined) ?? 999;
        } else {
          return q.levelDnD ?? (q.levelPF === undefined ? q.level : undefined) ?? 999;
        }
      };
      const aLvl = getLvl(a);
      const bLvl = getLvl(b);
      if (aLvl !== bLvl) {
        return aLvl - bLvl;
      }
      return a.name.localeCompare(b.name);
    });

    return {
      ...session,
      worldName: world?.name || "Unknown World",
      worldCalendar: world?.calendar || null,
      attendingCharacters: attendingCharacters.filter((c): c is any => c !== null),
      interestedPlayers,
      gmDiscordId: gmUser?.discordId || null,
      gmName: gmUser?.name || gmUser?.username || null,
      gmCharacterName: gmCharacter?.name || null,
      quests: sortedQuests,
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

export const clearSessionThreadId = internalMutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { discordThreadId: undefined });
  },
});

export const resyncSessionDiscord = action({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Not authenticated");
    await ctx.runAction(internal.discord.syncSessionToDiscord, { sessionId: args.sessionId });
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

/**
 * Action to register Discord slash commands and clean up duplicates.
 * Discord shows duplicates if commands exist at both Global and Guild levels.
 */
export const registerSlashCommands = action({
  args: {
    scope: v.optional(v.union(v.literal("guild"), v.literal("global"))),
  },
  handler: async (ctx, args) => {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const appId = process.env.DISCORD_APPLICATION_ID || "1479506068185944226";
    const guildId = process.env.DISCORD_GUILD_ID || "878674783972261918";

    if (!botToken) {
      throw new Error("DISCORD_BOT_TOKEN is not configured.");
    }

    const scope = args.scope || "guild";

    const commands = [
      {
        name: 'session',
        description: 'Show upcoming sessions or search for one',
        options: [
          {
            name: 'world-date',
            description: 'Search for a session by world or date',
            type: 3, // STRING
            required: false,
            autocomplete: true,
          }
        ]
      },
      {
        name: 'character',
        description: 'Search for a character by name',
        options: [
          {
            name: 'name',
            description: 'The name of the character to find',
            type: 3, // STRING
            required: true,
            autocomplete: true,
          }
        ]
      },
      {
        name: 'world',
        description: 'Search for a world by name or list all worlds',
        options: [
          {
            name: 'name',
            description: 'The name of the world to find',
            type: 3, // STRING
            required: false,
            autocomplete: true,
          }
        ]
      },
      {
        name: 'schedule',
        description: 'Show upcoming availability summary for the next 2 weeks',
      },
      {
        name: 'roll',
        description: 'Roll dice (default d100)',
        options: [
          {
            name: 'sides',
            description: 'Number of sides on the die (default 100)',
            type: 4, // INTEGER
            required: false,
          }
        ]
      },
      {
        name: 'bets',
        description: 'View your active Deathroll bets and turn status',
      },
      {
        name: 'deathroll',
        description: 'Issue a Deathroll gambling wager to an opponent or open challenge',
        options: [
          {
            name: 'character',
            description: 'Your character name',
            type: 3, // STRING
            required: true,
            autocomplete: true,
          },
          {
            name: 'wager',
            description: 'Gold Piece (GP) wager amount',
            type: 4, // INTEGER
            required: true,
          },
          {
            name: 'opponent',
            description: 'Target character name (leave empty for open challenge)',
            type: 3, // STRING
            required: false,
            autocomplete: true,
          },
          {
            name: 'max_roll',
            description: 'Starting max roll (default 100)',
            type: 4, // INTEGER
            required: false,
          }
        ]
      },
      {
        name: 'market',
        description: 'View active items and services on the Black Void market',
        options: [
          {
            name: 'query',
            description: 'Search filter for market listings',
            type: 3, // STRING
            required: false,
          }
        ]
      },
      {
        name: 'my-listings',
        description: 'View your active market listings and won auctions',
      },
      {
        name: 'ledger',
        description: 'View unclaimed gold, items, quests, and cuts across your characters',
      },
      {
        name: 'nethys',
        description: 'Lookup an item on Archives of Nethys (PF2e)',
        options: [
          {
            name: 'item_name',
            description: 'Item name to search on AoN',
            type: 3, // STRING
            required: true,
          }
        ]
      }
    ];

    const results = [];

    if (scope === "guild") {
      // 1. Set commands on guild
      const guildUrl = `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`;
      const guildRes = await fetch(guildUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commands),
      });
      results.push({ action: 'set_guild_commands', status: guildRes.status, ok: guildRes.ok, body: await guildRes.text() });

      // 2. Clear global commands to remove duplicates
      const globalUrl = `https://discord.com/api/v10/applications/${appId}/commands`;
      const globalRes = await fetch(globalUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([]),
      });
      results.push({ action: 'clear_global_commands', status: globalRes.status, ok: globalRes.ok, body: await globalRes.text() });
    } else {
      // 1. Set global commands
      const globalUrl = `https://discord.com/api/v10/applications/${appId}/commands`;
      const globalRes = await fetch(globalUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commands),
      });
      results.push({ action: 'set_global_commands', status: globalRes.status, ok: globalRes.ok, body: await globalRes.text() });

      // 2. Clear guild commands to remove duplicates
      const guildUrl = `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`;
      const guildRes = await fetch(guildUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([]),
      });
      results.push({ action: 'clear_guild_commands', status: guildRes.status, ok: guildRes.ok, body: await guildRes.text() });
    }

    return results;
  },
});



