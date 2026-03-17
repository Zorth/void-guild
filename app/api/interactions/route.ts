import { InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

let client: ConvexHttpClient | null = null;
function getConvexClient() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
    client = new ConvexHttpClient(url);
  }
  return client;
}

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');
  const publicKey = process.env.DISCORD_PUBLIC_KEY || process.env.NEXT_PUBLIC_DISCORD_PUBLIC_KEY;

  try {
    const body = await req.text();

    if (!signature || !timestamp || !publicKey) {
      return new Response('Missing security headers', { status: 401 });
    }

    const isValidRequest = await verifyKey(body, signature, timestamp, publicKey);

    if (!isValidRequest) {
      return new Response('Invalid request signature', { status: 401 });
    }

    const interaction = JSON.parse(body);

    if (interaction.type === 1) { // InteractionType.PING
      return new Response('{"type":1}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (interaction.type === 4) { // APPLICATION_COMMAND_AUTOCOMPLETE
      const { name, options } = interaction.data;
      if (name === 'session') {
        const queryArg = options?.[0]?.value || "";
        const convex = getConvexClient();
        const results = await convex.query(api.discord.searchSessions, { query: queryArg });
        
        return new Response(JSON.stringify({
          type: 8, // APPLICATION_COMMAND_AUTOCOMPLETE_RESULT
          data: {
            choices: results.map(r => ({ name: r.name, value: r.id }))
          },
        }), { headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (interaction.type === 2) { // APPLICATION_COMMAND
      const { name, options } = interaction.data;
      const convex = getConvexClient();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://guild.tarragon.be';

      if (name === 'session') {
        const sessionId = options?.[0]?.value;
        
        if (!sessionId) {
          // List upcoming sessions (Equivalent to old /sessions)
          try {
            const sessions = await convex.query(api.sessions.publicListSessions, { past: false });

            let content = "No upcoming sessions scheduled in the Void Guild.";
            if (sessions && sessions.length > 0) {
              const sessionList = sessions.slice(0, 5).map(s => {
                const dateStr = s.date 
                  ? `<t:${Math.floor(s.date / 1000)}:d>`
                  : "Date TBD";
                return `• **${s.worldName}** - ${dateStr} (${s.characterNames.length}/${s.maxPlayers} players)${s.planning ? " (Planning)" : ""}`;
              }).join('\n');
              content = `### ⚔️ Upcoming Sessions\n${sessionList}\n\n[View Full Schedule](${baseUrl})`;
            }

            return new Response(JSON.stringify({
              type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
              data: { content },
            }), { headers: { 'Content-Type': 'application/json' } });
          } catch (e) {
            console.error("[Discord] Convex Error:", e);
            return new Response(JSON.stringify({
              type: 4,
              data: { content: "Error fetching sessions." },
            }), { headers: { 'Content-Type': 'application/json' } });
          }
        }

        // Show specific session details
        try {
          const session = await convex.query(api.sessions.getPublicSession, { sessionId });
          
          if (!session) {
            return new Response(JSON.stringify({
              type: 4,
              data: { content: `Session not found.` },
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          const unixTimestamp = session.date ? Math.floor(session.date / 1000) : null;
          let dateInfo = "TBD";
          if (unixTimestamp) {
            dateInfo = `<t:${unixTimestamp}:F> (<t:${unixTimestamp}:R>)\n**Session starts at** <t:${unixTimestamp + 1800}:t>`;
          }
          
          const systemEmoji = session.system === 'PF' ? '<:Pathfinder:1322734594864320522>' : '<:DnD:1322734981524754473>';
          const sessionLink = `${baseUrl}/sessions/${session._id}`;

          const embed = {
            title: `${systemEmoji} ${session.worldName}`,
            url: sessionLink,
            fields: [
              { name: 'System', value: session.system === 'PF' ? 'Pathfinder 2e' : 'D&D 5e', inline: true },
              { name: 'Level', value: session.level ? `Level ${session.level}` : 'TBD', inline: true },
              { name: 'Players', value: `${session.attendingCharacters.length}/${session.maxPlayers}`, inline: true },
              { name: 'Date & Time', value: dateInfo, inline: false },
              { 
                name: session.planning ? 'Interested Players' : 'Current Signups', 
                value: session.attendingCharacters.length > 0 
                  ? session.attendingCharacters.map(c => `• **${c.name}** (Lvl ${c.lvl})`).join('\n')
                  : (session.planning ? "_No interest expressed yet._" : "_No characters signed up yet._"),
                inline: false 
              },
            ],
            color: session.system === 'PF' ? 0xde2e2e : 0xe81123,
            timestamp: new Date().toISOString(),
          };

          if (session.planning) {
            embed.fields.push({ name: 'Status', value: `*This session is in the planning phase. Click the link above to show your interest!*`, inline: false });
          }

          return new Response(JSON.stringify({
            type: 4,
            data: { embeds: [embed] },
          }), { headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
          console.error("[Discord] Convex Error:", e);
          return new Response(JSON.stringify({
            type: 4,
            data: { content: "Error fetching session details." },
          }), { headers: { 'Content-Type': 'application/json' } });
        }
      }


      if (name === 'schedule') {
        try {
          const summary = await convex.query(api.planning.getPlanningSummary);
          
          if (!summary.nextAvailable && !summary.mostAvailable) {
            return new Response(JSON.stringify({
              type: 4,
              data: { content: "No upcoming availability recorded for the next 2 weeks. Go to the Planning tab on the website to mark your availability!" },
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          const fields = [];
          if (summary.nextAvailable) {
            const unixTs = Math.floor(summary.nextAvailable.date / 1000);
            fields.push({
              name: "📅 Next Session Opportunity",
              value: `<t:${unixTs}:D> (<t:${unixTs}:R>)\n**Players:** ${summary.nextAvailable.count} (inc. ${summary.nextAvailable.gmCount} GMs)\n**Names:** ${summary.nextAvailable.users.join(", ")}`,
              inline: false
            });
          }

          if (summary.mostAvailable && (!summary.nextAvailable || summary.mostAvailable.date !== summary.nextAvailable.date)) {
            const unixTs = Math.floor(summary.mostAvailable.date / 1000);
            fields.push({
              name: "🌟 Most Available Date",
              value: `<t:${unixTs}:D> (<t:${unixTs}:R>)\n**Players:** ${summary.mostAvailable.count} (inc. ${summary.mostAvailable.gmCount} GMs)\n**Names:** ${summary.mostAvailable.users.join(", ")}`,
              inline: false
            });
          }

          const embed = {
            title: "⚔️ Void Guild Planning Summary",
            description: "Here are the best dates for potential sessions in the next 2 weeks based on member availability.",
            fields: fields,
            color: 0x3b82f6, // Blue
            timestamp: new Date().toISOString(),
          };

          return new Response(JSON.stringify({
            type: 4,
            data: { 
              embeds: [embed],
              content: `[View Full Planning Calendar](${baseUrl})`
            },
          }), { headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
          console.error("[Discord] Convex Error:", e);
          return new Response(JSON.stringify({
            type: 4,
            data: { content: "Error fetching planning summary." },
          }), { headers: { 'Content-Type': 'application/json' } });
        }
      }

      if (name === 'character') {
        const charName = options?.[0]?.value;
        if (!charName) return new Response('Missing character name', { status: 400 });

        try {
          const character = await convex.query(api.discord.getCharacterProfile, { name: charName });
          
          if (!character) {
            return new Response(JSON.stringify({
              type: 4,
              data: { content: `No character found matching "**${charName}**".` },
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          const systemEmoji = character.system === 'PF' ? '<:Pathfinder:1322734594864320522>' : '<:DnD:1322734981524754473>';
          const systemName = character.system === 'PF' ? 'Pathfinder 2e' : 'D&D 5e';
          const systemLogo = character.system === 'PF' 
            ? `${baseUrl}/PFVoid.svg`
            : `${baseUrl}/DnDVoid.svg`;
          
          // XP Math
          const totalBars = 20;
          const filledBars = Math.floor((character.xp / 1000) * totalBars);
          const xpBar = "▰".repeat(filledBars) + "▱".repeat(totalBars - filledBars);
          const xpNeeded = 1000 - character.xp;
          
          const rankInfo = character.rank && character.rank !== 'none' 
            ? `\n**Rank:** ${character.rank.charAt(0).toUpperCase() + character.rank.slice(1)}` 
            : '';

          // Discord Interaction User Metadata
          const user = interaction.member?.user || interaction.user;
          const avatarUrl = user?.avatar 
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/0.png`;

          const embed = {
            author: {
              name: `${character.name}`,
              icon_url: avatarUrl,
              url: character.websiteLink || undefined
            },
            title: `${systemEmoji} ${character.ancestry || 'Unknown'} ${character.class || 'Character'}`,
            description: `**Current Progress** \n\`${xpBar}\` \n**${character.xp}** / 1000 XP (*${xpNeeded} XP to level ${character.lvl + 1}*)${rankInfo}`,
            thumbnail: { url: systemLogo },
            fields: [
              { name: 'Level', value: `\` ${character.lvl} \``, inline: true },
              { name: 'System', value: `\` ${systemName} \``, inline: true },
              { name: 'Sessions Played', value: `\` ${character.sessionCount} \``, inline: true },
            ],
            color: character.system === 'PF' ? 0xde2e2e : 0xe81123,
            timestamp: new Date().toISOString(),
            footer: { text: "Void Guild Chronicles", icon_url: `${baseUrl}/favicon.ico` }
          };

          if (character.websiteLink) {
            embed.fields.push({ name: 'External Sheet', value: `[Link](${character.websiteLink})`, inline: true });
          }

          return new Response(JSON.stringify({
            type: 4,
            data: { embeds: [embed] },
          }), { headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
          console.error("[Discord] Convex Error:", e);
          return new Response(JSON.stringify({
            type: 4,
            data: { content: "Error fetching character details." },
          }), { headers: { 'Content-Type': 'application/json' } });
        }
      }

      if (name === 'world') {
        const worldNameArg = options?.[0]?.value;
        
        if (!worldNameArg) {
          // List all worlds
          try {
            const worlds = await convex.query(api.worlds.listAllWorlds);
            
            let content = "No worlds found in the Void Guild.";
            if (worlds && worlds.length > 0) {
              const worldList = worlds.map(w => {
                const worldLink = `${baseUrl}/world/${encodeURIComponent(w.name)}`;
                return `• **[${w.name}](${worldLink})**`;
              }).join('\n');
              content = `### 🌍 Discover Our Worlds\n${worldList}\n\n[Explore All](${baseUrl}/world)`;
            }

            return new Response(JSON.stringify({
              type: 4,
              data: { content },
            }), { headers: { 'Content-Type': 'application/json' } });
          } catch (e) {
            console.error("[Discord] Convex Error:", e);
            return new Response(JSON.stringify({
              type: 4,
              data: { content: "Error fetching worlds." },
            }), { headers: { 'Content-Type': 'application/json' } });
          }
        }

        try {
          const result = await convex.query(api.discord.searchWorld, { name: worldNameArg });
          
          if (!result) {
            return new Response(JSON.stringify({
              type: 4,
              data: { content: `No world found matching "**${worldNameArg}**".` },
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          const { world, nextSession } = result;
          const worldLink = `${baseUrl}/world/${encodeURIComponent(world.name)}`;
          
          let sessionInfo = "No upcoming sessions.";
          if (nextSession) {
            if (nextSession.date) {
              const unixTimestamp = Math.floor(nextSession.date / 1000);
              sessionInfo = `Next session: <t:${unixTimestamp}:F> (<t:${unixTimestamp}:R>)`;
            } else if (nextSession.planning) {
              sessionInfo = "Next session is currently in the planning phase.";
            }
          }

          const embed = {
            title: `🌍 ${world.name}`,
            url: worldLink,
            description: world.description || "_No description provided._",
            fields: [
              { name: 'Status', value: sessionInfo },
            ],
            color: 0x3b82f6, // Blue
            timestamp: new Date().toISOString(),
          };

          return new Response(JSON.stringify({
            type: 4,
            data: { embeds: [embed] },
          }), { headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
          console.error("[Discord] Convex Error:", e);
          return new Response(JSON.stringify({
            type: 4,
            data: { content: "Error fetching world details." },
          }), { headers: { 'Content-Type': 'application/json' } });
        }
      }
    }

    return new Response('Interaction type not supported', { status: 400 });

  } catch (error) {
    console.error("[Discord] Internal Error:", error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
