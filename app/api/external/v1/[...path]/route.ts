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

async function handleResponse(promise: Promise<any>) {
    try {
        const result = await promise;
        return NextResponse.json(result);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 401 });

    const convex = getConvexClient();
    const [resource, id, subresource] = path;

    switch (resource) {
        case 'session':
            if (subresource === 'characters') {
                return handleResponse(convex.query(api.external_api.getSessionCharacters, { apiKey, sessionId: id }));
            }
            if (subresource === 'state') {
                return handleResponse(convex.query(api.external_api.getSessionState, { apiKey, sessionId: id as any }));
            }
            break;
        case 'world':
            if (subresource === 'calendar') {
                return handleResponse(convex.query(api.external_api.getWorldCalendar, { apiKey, worldId: id }));
            }
            if (subresource === 'quests') {
                return handleResponse(convex.query(api.external_api.listQuests, { apiKey, worldId: id }));
            }
            if (subresource === 'reputation') {
                return handleResponse(convex.query(api.external_api.getReputations, { apiKey, worldId: id as any }));
            }
            break;
        case 'character':
            return handleResponse(convex.query(api.external_api.getCharacter, { apiKey, characterId: id }));
        case 'quests':
            return handleResponse(convex.query(api.external_api.listQuests, { apiKey }));
        case 'search':
            const q = req.nextUrl.searchParams.get('q') || '';
            return handleResponse(convex.query(api.external_api.search, { apiKey, query: q }));
        case 'activity':
            const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10');
            return handleResponse(convex.query(api.external_api.getActivity, { apiKey, limit }));
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 401 });

    const convex = getConvexClient();
    const body = await req.json();

    if (path[0] === 'session') {
        return handleResponse(convex.mutation(api.external_api.createSession, { apiKey, ...body }));
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 401 });

    const convex = getConvexClient();
    const body = await req.json();
    const [resource, id, subresource] = path;

    switch (resource) {
        case 'world':
            if (subresource === 'calendar') {
                return handleResponse(convex.mutation(api.external_api.updateWorldDate, { apiKey, worldId: id, ...body }));
            }
            break;
        case 'quest':
            return handleResponse(convex.mutation(api.external_api.updateQuest, { apiKey, questId: id as any, ...body }));
        case 'reputation':
            return handleResponse(convex.mutation(api.external_api.updateReputation, { apiKey, ...body }));
        case 'session':
            if (subresource === 'state') {
                return handleResponse(convex.mutation(api.external_api.updateSessionState, { apiKey, sessionId: id as any, ...body }));
            }
            break;
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
