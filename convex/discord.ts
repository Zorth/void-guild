import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
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

    const sessionTime = new Date(session.date);
    const day = String(sessionTime.getDate()).padStart(2, '0');
    const month = String(sessionTime.getMonth() + 1).padStart(2, '0');
    
    // Format: (DD/MM) The Void: <WorldName> [<signupCharacters>/<MaxCharacters>]
    const threadName = `(${day}/${month}) The Void: ${session.worldName} [${session.attendingCharacters.length}/${session.maxPlayers}]`;

    const unixTimestamp = Math.floor(session.date / 1000);
    const discordTimestamp = `<t:${unixTimestamp}:F> (<t:${unixTimestamp}:R>)`;
    
    // First message content following the user's specific format
    // # :Pathfinder: (or :DnD:) <WorldName>  
    // **System**: Pathfinder 2e/Dungeons & Dragons 
    // **Location**: <insert location> 
    // **Date**: <Insert date and time with "sessions starts 30 minutes after">
    const systemEmoji = session.system === 'PF' ? '<:Pathfinder:1322734594864320522>' : '<:DnD:1322734981524754473>';
    const systemName = session.system === 'PF' ? 'Pathfinder 2e' : 'D&D 5e';
    const locationInfo = session.location ? `[View on Google Maps](${session.location})` : 'TBD';
    
    const messageContent = `# ${systemEmoji} ${session.worldName}\n` +
      `**System**: ${systemName}\n` +
      `**Location**: ${locationInfo}\n` +
      `**Date**: ${discordTimestamp} (session starts 30 minutes after)`;

    // Format the list of signed-up characters for the embed
    const characterList = session.attendingCharacters.length > 0
      ? session.attendingCharacters.map(c => `• **${c.name}** (Lvl ${c.lvl} ${c.class})`).join("\n")
      : "_No characters signed up yet._";

    const embed = {
      title: "Current Signups",
      description: characterList,
      color: session.system === 'PF' ? 0xde2e2e : 0xe81123,
      url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://guild.tarragon.be'}/sessions/${session._id}`,
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

    return {
      ...session,
      worldName: world?.name || "Unknown World",
      attendingCharacters: attendingCharacters.filter((c): c is any => c !== null),
    };
  },
});

export const updateSessionThreadId = internalMutation({
  args: { sessionId: v.id("sessions"), threadId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { discordThreadId: args.threadId });
  },
});
