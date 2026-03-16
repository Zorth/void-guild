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
  
  console.log(`[Discord] New request. PK: ${!!publicKey}, Sig: ${!!signature}, TS: ${!!timestamp}`);

  try {
    const body = await req.text();
    console.log(`[Discord] Body received (${body.length} bytes)`);

    if (!signature || !timestamp || !publicKey) {
      console.error("[Discord] Missing Security Critical Data (Returning 401)");
      return new Response('Missing security headers', { status: 401 });
    }

    // VERIFY SIGNATURE
    const isValidRequest = verifyKey(body, signature, timestamp, publicKey);
    console.log(`[Discord] Security Check: ${isValidRequest ? "PASS" : "FAIL"}`);

    if (!isValidRequest) {
      console.warn("[Discord] Signature check failed (Correctly returning 401)");
      return new Response('Invalid request signature', { status: 401 });
    }

    console.log("[Discord] Security Check: VALID SIGNATURE");
    
    const interaction = JSON.parse(body);
    console.log(`[Discord] Interaction Type: ${interaction.type}`);

    // Handle PING (Type 1)
    if (interaction.type === 1) {
      console.log("[Discord] PING received -> Sending PONG");
      return new Response('{"type":1}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle Commands (Type 2)
    if (interaction.type === 2) {
      const { name } = interaction.data;
      if (name === 'sessions') {
        try {
          const convex = getConvexClient();
          const sessions = await convex.query(api.sessions.listSessions, { past: false });

          let content = "No upcoming sessions scheduled.";
          if (sessions && sessions.length > 0) {
            const sessionList = sessions.slice(0, 5).map(s => {
              const date = new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
              return `• **${s.worldName}** - ${date} (${s.characterNames.length}/${s.maxPlayers} players)`;
            }).join('\n');
            content = `### ⚔️ Upcoming Sessions\n${sessionList}\n\n[View Full Schedule](${process.env.NEXT_PUBLIC_BASE_URL || 'https://guild.tarragon.be'})`;
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
    }

    return new Response('Interaction type not supported', { status: 400 });

  } catch (error) {
    console.error("[Discord] Internal Error:", error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
