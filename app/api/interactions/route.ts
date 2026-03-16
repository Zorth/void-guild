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
  const publicKey = process.env.DISCORD_PUBLIC_KEY || process.env.NEXT_PUBLIC_DISCORD_PUBLIC_KEY;
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');
  const userAgent = req.headers.get('user-agent');
  
  console.log(`[Discord] New request from ${userAgent}. Sig: ${!!signature}, PK: ${!!publicKey}`);
  if (publicKey) {
    console.log(`[Discord] PK Snippet: ${publicKey.substring(0, 4)}...${publicKey.substring(publicKey.length - 4)}`);
  }

  try {
    const body = await req.text();
    console.log(`[Discord] Received body (${body.length} bytes)`);

    if (!signature || !timestamp || !publicKey) {
      console.error("[Discord] Missing security data");
      return new Response('Missing headers', { status: 401 });
    }

    const isValidRequest = verifyKey(body, signature, timestamp, publicKey);

    if (!isValidRequest) {
      console.warn("[Discord] SECURITY CHECK: INVALID SIGNATURE (Responding with 401)");
      return new Response('Bad request signature', { status: 401 });
    }

    console.log("[Discord] SECURITY CHECK: VALID SIGNATURE");
    const interaction = JSON.parse(body);

    if (interaction.type === 1) { // InteractionType.PING
      console.log("[Discord] PING received -> Sending PONG");
      return new Response('{"type":1}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (interaction.type === 2) { // APPLICATION_COMMAND
      const { name } = interaction.data;
      if (name === 'sessions') {
        const convex = getConvexClient();
        const sessions = await convex.query(api.sessions.listSessions, { past: false });

        let content = "No upcoming sessions scheduled.";
        if (sessions && sessions.length > 0) {
          content = sessions.slice(0, 5).map(s => {
            const date = new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            return `• **${s.worldName}** - ${date}`;
          }).join('\n');
        }

        return new Response(JSON.stringify({
          type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
          data: { content: `### ⚔️ Upcoming Sessions\n${content}` },
        }), { headers: { 'Content-Type': 'application/json' } });
      }
    }

    return new Response('Unknown interaction type', { status: 400 });

  } catch (error) {
    console.error("[Discord] Internal Error:", error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
