import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { NextRequest, NextResponse } from "next/server";

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

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '');

    if (!apiKey) {
        return NextResponse.json({ error: 'Missing API key in Authorization header' }, { status: 401 });
    }

    const convex = getConvexClient();

    try {
        // GET /session/[sessionId]/characters
        if (path[0] === 'session' && path[2] === 'characters') {
            const sessionId = path[1];
            const result = await convex.query(api.external_api.getSessionCharacters, {
                apiKey,
                sessionId: sessionId as any
            });
            return NextResponse.json(result);
        }

        // GET /world/[worldId]/calendar
        if (path[0] === 'world' && path[2] === 'calendar') {
            const worldId = path[1];
            const result = await convex.query(api.external_api.getWorldCalendar, {
                apiKey,
                worldId: worldId as any
            });
            return NextResponse.json(result);
        }

        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '');

    if (!apiKey) {
        return NextResponse.json({ error: 'Missing API key in Authorization header' }, { status: 401 });
    }

    const convex = getConvexClient();

    try {
        // PATCH /world/[worldId]/calendar
        if (path[0] === 'world' && path[2] === 'calendar') {
            const worldId = path[1];
            const body = await req.json();
            const { year, month, day } = body;

            if (year === undefined || month === undefined || day === undefined) {
                return NextResponse.json({ error: 'Missing year, month, or day in body' }, { status:400 });
            }

            const result = await convex.mutation(api.external_api.updateWorldDate, {
                apiKey,
                worldId: worldId as any,
                year,
                month,
                day
            });
            return NextResponse.json(result);
        }

        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}
