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
      const queryArg = options?.[0]?.value || "";
      const convex = getConvexClient();

      if (name === 'session') {
        const results = await convex.query(api.discord.searchSessions, { query: queryArg });
        
        return new Response(JSON.stringify({
          type: 8, // APPLICATION_COMMAND_AUTOCOMPLETE_RESULT
          data: {
            choices: results.map(r => ({ name: r.name, value: r.id }))
          },
        }), { headers: { 'Content-Type': 'application/json' } });
      }

      if (name === 'character') {
        const results = await convex.query(api.discord.searchCharacters, { query: queryArg });
        
        return new Response(JSON.stringify({
          type: 8,
          data: {
            choices: results.map(r => ({ name: r.name, value: r.value }))
          },
        }), { headers: { 'Content-Type': 'application/json' } });
      }

      if (name === 'world') {
        const results = await convex.query(api.discord.searchWorlds, { query: queryArg });
        
        return new Response(JSON.stringify({
          type: 8,
          data: {
            choices: results.map(r => ({ name: r.name, value: r.value }))
          },
        }), { headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (interaction.type === 2) { // APPLICATION_COMMAND
      const { name, options } = interaction.data;
      const convex = getConvexClient();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://guild.tarragon.be';

      if (name === 'session') {
        const sessionId = options?.find((opt: any) => opt.name === 'world-date')?.value;
        
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
          
          // XP Math
          const totalBars = 20;
          const filledBars = Math.floor((character.xp / 1000) * totalBars);
          const xpBar = "▰".repeat(filledBars) + "▱".repeat(totalBars - filledBars);
          const xpNeeded = 1000 - character.xp;
          
          const rankInfo = character.rank && character.rank !== 'none' 
            ? `\n**Rank:** ${character.rank.charAt(0).toUpperCase() + character.rank.slice(1)}` 
            : '';

          const fields: any[] = [
            { name: 'Level', value: `\` ${character.lvl} \``, inline: true },
            { name: 'System', value: `\` ${systemName} \``, inline: true },
            { name: 'Sessions Played', value: `\` ${character.sessionCount} \``, inline: true },
          ];

          if (character.mostVisitedWorld) {
            fields.push({
              name: 'Most Visited World',
              value: `**${character.mostVisitedWorld.name}** (${character.mostVisitedWorld.count} session${character.mostVisitedWorld.count > 1 ? 's' : ''})`,
              inline: true
            });
          }

          if (character.commendations && character.commendations.total > 0) {
            const commParts: string[] = [];
            if (character.commendations.gm > 0) commParts.push(`👑 GM: ${character.commendations.gm}`);
            if (character.commendations.roleplay > 0) commParts.push(`🎭 Roleplay: ${character.commendations.roleplay}`);
            if (character.commendations.tactics > 0) commParts.push(`⚔️ Tactics: ${character.commendations.tactics}`);
            if (character.commendations.clutch > 0) commParts.push(`🛡️ Clutch: ${character.commendations.clutch}`);
            if (character.commendations.heroic > 0) commParts.push(`🌟 Heroic: ${character.commendations.heroic}`);

            fields.push({
              name: `Commendations (${character.commendations.total})`,
              value: commParts.join(' • '),
              inline: false
            });
          }

          if (character.websiteLink) {
            fields.push({ name: 'External Sheet', value: `[Link](${character.websiteLink})`, inline: true });
          }

          const embed = {
            author: {
              name: `${character.name}` + (character.ownerName ? ` (Owner: ${character.ownerName})` : ''),
              url: character.websiteLink || undefined
            },
            title: `${systemEmoji} ${character.title ? `"${character.title}" • ` : ''}${character.ancestry || 'Unknown'} ${character.class || 'Character'}`,
            description: `**Current Progress** \n\`${xpBar}\` \n**${character.xp}** / 1000 XP (*${xpNeeded} XP to level ${character.lvl + 1}*)${rankInfo}`,
            fields: fields,
            color: character.system === 'PF' ? 0xde2e2e : 0xe81123,
            timestamp: new Date().toISOString(),
            footer: { text: "Void Guild Chronicles" }
          };

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

      if (name === 'roll') {
        const rawSides = options?.find((opt: any) => opt.name === 'sides')?.value ?? options?.[0]?.value;
        let sides = typeof rawSides === 'number' ? Math.floor(rawSides) : 100;
        if (isNaN(sides) || sides < 1) {
          sides = 100;
        }

        const rollResult = Math.floor(Math.random() * sides) + 1;
        const userMention = interaction.member?.user?.id
          ? `<@${interaction.member.user.id}>`
          : interaction.user?.id
          ? `<@${interaction.user.id}>`
          : 'Someone';

        return new Response(JSON.stringify({
          type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
          data: {
            content: `🎲 ${userMention} rolled **${rollResult}** (1-${sides})`,
          },
        }), { headers: { 'Content-Type': 'application/json' } });
      }

      if (name === 'bets') {
        const discordId = interaction.member?.user?.id || interaction.user?.id;

        if (!discordId) {
          return new Response(JSON.stringify({
            type: 4,
            data: {
              content: "No guild account linked",
              flags: 64, // EPHEMERAL
            },
          }), { headers: { 'Content-Type': 'application/json' } });
        }

        try {
          const res = await convex.query(api.discord.getUserActiveBets, { discordId });

          if (res.status === 'no_user') {
            return new Response(JSON.stringify({
              type: 4,
              data: {
                content: "No guild account linked",
                flags: 64, // EPHEMERAL
              },
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          if (res.status === 'no_bets' || (res.myTurnBets.length === 0 && res.otherTurnBets.length === 0)) {
            return new Response(JSON.stringify({
              type: 4,
              data: {
                content: "no active bets",
                flags: 64, // EPHEMERAL
              },
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          const lines: string[] = ["### 🎲 Your Active Deathroll Bets\n"];

          if (res.myTurnBets.length > 0) {
            lines.push("**🎯 Your Turn:**");
            for (const b of res.myTurnBets) {
              lines.push(`• **${b.myCharacterName}** vs **${b.opponentCharacterName}** — Wager: **${b.wagerAmount} GP** | Current Max: **${b.deathrollValue}** (Waiting for your roll)`);
            }
          }

          if (res.otherTurnBets.length > 0) {
            if (res.myTurnBets.length > 0) lines.push("");
            lines.push("**⏳ Opponent's Turn:**");
            for (const b of res.otherTurnBets) {
              lines.push(`• **${b.myCharacterName}** vs **${b.opponentCharacterName}** — Wager: **${b.wagerAmount} GP** | Current Max: **${b.deathrollValue}** (Waiting for ${b.opponentCharacterName})`);
            }
          }

          return new Response(JSON.stringify({
            type: 4,
            data: {
              content: lines.join("\n"),
              flags: 64, // EPHEMERAL (Only visible to sender)
            },
          }), { headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
          console.error("[Discord] Convex Error:", e);
          return new Response(JSON.stringify({
            type: 4,
            data: {
              content: "Error fetching active bets.",
              flags: 64,
            },
          }), { headers: { 'Content-Type': 'application/json' } });
        }
      }

      // 1. /deathroll <character> <wager> [opponent] [max_roll]
      if (name === 'deathroll') {
        const discordId = interaction.member?.user?.id || interaction.user?.id;
        const senderCharName = options?.find((o: any) => o.name === 'character')?.value;
        const wagerAmount = options?.find((o: any) => o.name === 'wager')?.value;
        const targetCharName = options?.find((o: any) => o.name === 'opponent')?.value;
        const startVal = options?.find((o: any) => o.name === 'max_roll')?.value;

        if (!discordId) {
          return new Response(JSON.stringify({
            type: 4,
            data: { content: "No guild account linked.", flags: 64 },
          }), { headers: { 'Content-Type': 'application/json' } });
        }

        if (!senderCharName || wagerAmount === undefined) {
          return new Response(JSON.stringify({
            type: 4,
            data: { content: "Please specify your character and wager amount.", flags: 64 },
          }), { headers: { 'Content-Type': 'application/json' } });
        }

        try {
          const res = await convex.mutation(api.discord.createDiscordDeathrollChallenge, {
            discordId,
            senderCharacterName: senderCharName,
            targetCharacterName: targetCharName || undefined,
            wagerAmount: Number(wagerAmount),
            deathrollValue: startVal ? Number(startVal) : undefined,
          });

          const opponentStr = res.targetName ? `**${res.targetName}**` : "_Anyone_";
          return new Response(JSON.stringify({
            type: 4,
            data: {
              content: `🎲 **DEATHROLL CHALLENGE ISSUED!**\n**${res.senderName}** has challenged ${opponentStr} to a **${res.wager} GP** Deathroll starting at **${res.startVal}**!\n\n*Accept or view this challenge on the [Void Guild Market](${baseUrl}/black-void)*`,
            },
          }), { headers: { 'Content-Type': 'application/json' } });
        } catch (e: any) {
          return new Response(JSON.stringify({
            type: 4,
            data: { content: `⚠️ ${e?.message || "Error issuing Deathroll challenge."}`, flags: 64 },
          }), { headers: { 'Content-Type': 'application/json' } });
        }
      }

      // 2. /market [query]
      if (name === 'market') {
        const queryArg = options?.find((o: any) => o.name === 'query')?.value;
        try {
          const listings = await convex.query(api.discord.getActiveMarketListings, { query: queryArg });

          if (!listings || listings.length === 0) {
            return new Response(JSON.stringify({
              type: 4,
              data: { content: queryArg ? `No market listings matching "**${queryArg}**".` : "No active market listings currently on The Black Void." },
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          const fields = listings.map((l) => {
            let priceInfo = "Custom Price";
            if (l.type === 'item') {
              const start = l.startingBid ? `${l.startingBid} GP Bid` : '';
              const buyout = l.buyoutPrice ? `${l.buyoutPrice} GP Buyout` : '';
              priceInfo = [start, buyout].filter(Boolean).join(' | ');
            } else if (l.type === 'service') {
              if (l.priceType === 'percentage') priceInfo = `${l.percentage || 0}% Fee`;
              else if (l.priceType === 'flat') priceInfo = `+${l.markupGp || 0} GP Markup`;
              else priceInfo = l.priceDetails || 'Custom Service';
            }

            const expires = l.expiresAt ? `<t:${Math.floor(l.expiresAt / 1000)}:R>` : 'No Limit';
            return {
              name: `${l.type === 'item' ? '📦' : '🛠️'} ${l.name}`,
              value: `**Seller:** ${l.sellerName} | **Price:** ${priceInfo} | **Expires:** ${expires}`,
              inline: false,
            };
          });

          const embed = {
            title: "🏴‍☠️ The Black Void - Active Market",
            url: `${baseUrl}/black-void`,
            description: "Here are the top active listings available on the Guild market:",
            fields,
            color: 0x18181b,
            timestamp: new Date().toISOString(),
          };

          return new Response(JSON.stringify({
            type: 4,
            data: { embeds: [embed] },
          }), { headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
          return new Response(JSON.stringify({
            type: 4,
            data: { content: "Error fetching market listings." },
          }), { headers: { 'Content-Type': 'application/json' } });
        }
      }

      // 3. /my-listings (Ephemeral)
      if (name === 'my-listings') {
        const discordId = interaction.member?.user?.id || interaction.user?.id;
        if (!discordId) {
          return new Response(JSON.stringify({
            type: 4,
            data: { content: "No guild account linked", flags: 64 },
          }), { headers: { 'Content-Type': 'application/json' } });
        }

        try {
          const res = await convex.query(api.discord.getUserMarketListings, { discordId });

          if (res.status === 'no_user') {
            return new Response(JSON.stringify({
              type: 4,
              data: { content: "No guild account linked", flags: 64 },
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          if (res.activeListings.length === 0 && res.wonListings.length === 0) {
            return new Response(JSON.stringify({
              type: 4,
              data: { content: "You have no active market listings or pending won auctions.", flags: 64 },
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          const lines = ["### 📦 Your Market Activity\n"];
          if (res.activeListings.length > 0) {
            lines.push("**Active Listings:**");
            for (const l of res.activeListings) {
              const price = l.buyoutPrice ? `${l.buyoutPrice} GP (Buyout)` : (l.startingBid ? `${l.startingBid} GP (Start)` : 'Service');
              lines.push(`• **${l.name}** (${l.sellerName}) — ${price}`);
            }
          }

          if (res.wonListings.length > 0) {
            if (res.activeListings.length > 0) lines.push("");
            lines.push("**Won Auctions (Unclaimed):**");
            for (const w of res.wonListings) {
              lines.push(`• **${w.name}** (${w.buyerName}) — Won for **${w.winningAmount || 0} GP**`);
            }
          }

          return new Response(JSON.stringify({
            type: 4,
            data: { content: lines.join("\n"), flags: 64 },
          }), { headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
          return new Response(JSON.stringify({
            type: 4,
            data: { content: "Error fetching your listings.", flags: 64 },
          }), { headers: { 'Content-Type': 'application/json' } });
        }
      }

      // 9. /ledger or /unclaimed (Ephemeral - renamed to /ledger)
      if (name === 'ledger' || name === 'unclaimed') {
        const discordId = interaction.member?.user?.id || interaction.user?.id;
        if (!discordId) {
          return new Response(JSON.stringify({
            type: 4,
            data: { content: "No guild account linked", flags: 64 },
          }), { headers: { 'Content-Type': 'application/json' } });
        }

        try {
          const res = await convex.query(api.discord.getUserUnclaimedSummary, { discordId });

          if (res.status === 'no_user') {
            return new Response(JSON.stringify({
              type: 4,
              data: { content: "No guild account linked", flags: 64 },
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          if (res.status === 'no_unclaimed' || res.totalUnclaimed === 0) {
            return new Response(JSON.stringify({
              type: 4,
              data: { content: "✨ You have no unclaimed log entries across your characters!", flags: 64 },
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          const lines = [`### 📜 Character Ledger Status (${res.totalUnclaimed} Unclaimed Log Entries)\n`];
          for (const c of res.characters) {
            lines.push(`• **${c.characterName}**: **${c.unclaimedCount} unclaimed** (${[
              c.soldCount > 0 ? `${c.soldCount} sales` : null,
              c.wonCount > 0 ? `${c.wonCount} won items` : null,
              c.questCount > 0 ? `${c.questCount} quests` : null,
              c.gmCount > 0 ? `${c.gmCount} GM cuts` : null,
              c.betsCount > 0 ? `${c.betsCount} bets` : null,
            ].filter(Boolean).join(", ")})`);
          }

          lines.push(`\n[**Open Black Void Ledger**](${baseUrl}/black-void)`);

          return new Response(JSON.stringify({
            type: 4,
            data: { content: lines.join("\n"), flags: 64 },
          }), { headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
          return new Response(JSON.stringify({
            type: 4,
            data: { content: "Error fetching ledger status.", flags: 64 },
          }), { headers: { 'Content-Type': 'application/json' } });
        }
      }

      // 12. /nethys <item_name>
      if (name === 'nethys') {
        const itemName = options?.find((o: any) => o.name === 'item_name')?.value || options?.[0]?.value;

        if (!itemName) {
          return new Response(JSON.stringify({
            type: 4,
            data: { content: "Please enter an item name to search on Archives of Nethys.", flags: 64 },
          }), { headers: { 'Content-Type': 'application/json' } });
        }

        try {
          const result = await convex.action(api.blackVoid.lookupNethysItem, { itemName: String(itemName) });

          if (!result) {
            return new Response(JSON.stringify({
              type: 4,
              data: { content: `No Archives of Nethys entry found for "**${itemName}**".` },
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          const priceStr = result.priceInGP ? `**${result.priceInGP} GP**` : (result.priceRaw ? `**${result.priceRaw}**` : "_Unknown price_");
          const linkStr = result.nethysUrl ? `[View on Archives of Nethys](${result.nethysUrl})` : "_No direct link_";

          const embed = {
            title: `📚 Archives of Nethys: ${result.name}`,
            url: result.nethysUrl || undefined,
            description: `**Standard Price:** ${priceStr}\n\n🔗 ${linkStr}`,
            color: 0x9333ea,
            timestamp: new Date().toISOString(),
            footer: { text: "Pathfinder 2e Archives of Nethys Lookup" }
          };

          return new Response(JSON.stringify({
            type: 4,
            data: { embeds: [embed] },
          }), { headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
          return new Response(JSON.stringify({
            type: 4,
            data: { content: "Error searching Archives of Nethys." },
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

