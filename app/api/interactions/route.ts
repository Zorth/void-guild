import { InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');
  const body = await req.text();

  const isValidRequest = signature && timestamp && verifyKey(
    body,
    signature,
    timestamp,
    process.env.DISCORD_PUBLIC_KEY! // Add this to your .env from Discord Portal
  );

  if (!isValidRequest) {
    return new Response('Bad request signature', { status: 401 });
  }

  const interaction = JSON.parse(body);

  // Handle PING from Discord (mandatory)
  if (interaction.type === InteractionType.PING) {
    return Response.json({ type: InteractionResponseType.PONG });
  }

  // Handle /sessions command
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const { name } = interaction.data;

    if (name === 'sessions') {
      try {
        // Fetch upcoming sessions from Convex
        const sessions = await client.query(api.sessions.listSessions, { past: false });

        if (!sessions || sessions.length === 0) {
          return Response.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: "No upcoming sessions scheduled in the Void Guild." },
          });
        }

        const sessionList = sessions.slice(0, 5).map(s => {
          const date = new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          return `• **${s.worldName}** - ${date} (${s.characterNames.length}/${s.maxPlayers} players)`;
        }).join('\n');

        return Response.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `### ⚔️ Upcoming Sessions\n${sessionList}\n\n[View Full Schedule](${process.env.NEXT_PUBLIC_BASE_URL || 'https://void.tarragon.be'})`,
          },
        });
      } catch (e) {
        console.error("Convex fetch error:", e);
        return Response.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: "Failed to fetch sessions from the Void." },
        });
      }
    }
  }

  return new Response('Unknown interaction', { status: 400 });
}
