import { InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { NextResponse } from 'next/server';

// Lazy initialization to prevent module-level crashes if env vars are missing
let client: ConvexHttpClient | null = null;
function getConvexClient() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
    client = new ConvexHttpClient(url);
  }
  return client;
}

export const runtime = 'nodejs'; // Ensure we're using Node.js runtime for crypto stability

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-signature-ed25519');
    const timestamp = req.headers.get('x-signature-timestamp');
    
    // Discord verification is extremely sensitive to the raw body
    const body = await req.text();

    const publicKey = process.env.DISCORD_PUBLIC_KEY || process.env.NEXT_PUBLIC_DISCORD_PUBLIC_KEY;

    console.log(`[Discord] Interaction received. Sig: ${!!signature}, TS: ${!!timestamp}, PK: ${!!publicKey}, Body length: ${body.length}`);
    console.log(`[Discord] Body sample: ${body.substring(0, 100)}`);

    if (!signature || !timestamp || !publicKey) {
      console.error("[Discord] Missing signature, timestamp, or public key configuration");
      return new Response('Missing headers or configuration', { status: 401 });
    }

    const isValidRequest = verifyKey(
      body,
      signature,
      timestamp,
      publicKey
    );

    if (!isValidRequest) {
      console.log("[Discord] Invalid signature check failed (this is expected for Discord's security tests)");
      return new Response('Bad request signature', { status: 401 });
    }

    const interaction = JSON.parse(body);

    // Handle PING from Discord (mandatory for endpoint verification)
    if (interaction.type === 1) { // InteractionType.PING
      console.log("[Discord] Valid PING received, sending PONG");
      return new Response('{"type":1}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle /sessions command
    if (interaction.type === 2) { // InteractionType.APPLICATION_COMMAND
      const { name } = interaction.data;

      if (name === 'sessions') {
        try {
          const convex = getConvexClient();
          const sessions = await convex.query(api.sessions.listSessions, { past: false });

          if (!sessions || sessions.length === 0) {
            return NextResponse.json({
              type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
              data: { content: "No upcoming sessions scheduled in the Void Guild." },
            });
          }

          const sessionList = sessions.slice(0, 5).map(s => {
            const date = new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            return `• **${s.worldName}** - ${date} (${s.characterNames.length}/${s.maxPlayers} players)`;
          }).join('\n');

          return NextResponse.json({
            type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
            data: {
              content: `### ⚔️ Upcoming Sessions\n${sessionList}\n\n[View Full Schedule](${process.env.NEXT_PUBLIC_BASE_URL || 'https://guild.tarragon.be'})`,
            },
          });
        } catch (e) {
          console.error("[Discord] Convex query error:", e);
          return NextResponse.json({
            type: 4,
            data: { content: "Error fetching sessions from the database." },
          });
        }
      }
    }

    return new Response('Unknown interaction type', { status: 400 });
  } catch (error) {
    console.error("[Discord] Interaction error:", error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
