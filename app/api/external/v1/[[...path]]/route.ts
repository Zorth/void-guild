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

function getApiDocsResponse() {
    return NextResponse.json({
        name: "Guild of The Void External API",
        version: "v1.1",
        documentationUrl: "https://github.com/Zorth/void-guild/blob/main/API.md",
        baseUrl: "https://guild.tarragon.be/api/external/v1",
        authentication: {
            getRequests: "Public (No API key required)",
            mutationRequests: "Requires Bearer token in Authorization header or apiKey parameter",
            keyGeneration: "User Profile -> API Access in top navigation menu",
            restrictions: [
                "XP and Level cannot be edited via API",
                "Character deletion is disabled via API",
                "Mutations verify resource ownership (only owned resources can be modified unless user is Admin)"
            ]
        },
        endpoints: [
            { method: "GET", path: "/sessions", description: "List sessions with filters", queryParams: ["past=true|false", "worldId=string", "system=PF|DnD"] },
            { method: "GET", path: "/session/:id", description: "Get detailed session info" },
            { method: "GET", path: "/session/:id/characters", description: "List attending characters in a session" },
            { method: "GET", path: "/session/:id/state", description: "Get live initiative and clock state" },
            { method: "POST", path: "/session", description: "Create a session (GM/Admin)" },
            { method: "POST", path: "/session/:id/loot", description: "Add loot item to session" },
            { method: "POST", path: "/session/:id/commendation", description: "Submit character commendation" },
            { method: "PATCH", path: "/session/:id", description: "Update session metadata" },
            { method: "PATCH", path: "/session/:id/state", description: "Update initiative & clock" },

            { method: "GET", path: "/characters", description: "List user characters", queryParams: ["userId=string"] },
            { method: "GET", path: "/character/:id", description: "Get full character details" },
            { method: "POST", path: "/character", description: "Create a new character (starts at Lvl 1, 0 XP)" },
            { method: "PATCH", path: "/character/:id", description: "Update character details (XP/Lvl protected)" },

            { method: "GET", path: "/worlds", description: "List all campaign worlds" },
            { method: "GET", path: "/world/:id", description: "Get details for a specific world" },
            { method: "GET", path: "/world/:id/calendar", description: "Get world calendar config & current date" },
            { method: "GET", path: "/world/:id/quests", description: "List all quests in a specific world" },
            { method: "GET", path: "/quests", description: "List all quests (global + world)" },
            { method: "GET", path: "/character-quests", description: "List character-issued quests", queryParams: ["characterId=string"] },
            { method: "POST", path: "/quest", description: "Create a new quest" },
            { method: "PATCH", path: "/world/:id/calendar", description: "Update world calendar date" },
            { method: "PATCH", path: "/quest/:id", description: "Update quest status or details" },

            { method: "GET", path: "/black-void/listings", description: "List items & services on The Black Void market", queryParams: ["type=item|service", "status=active|completed"] },
            { method: "GET", path: "/black-void/character/:id/transactions", description: "Get sold items and won auctions for a character" },
            { method: "POST", path: "/black-void/item", description: "Post an item listing" },
            { method: "POST", path: "/black-void/service", description: "Post a crafting/service listing" },
            { method: "POST", path: "/black-void/bid", description: "Place bid, 2-sig-fig auto-bid cap, or buyout on item" },

            { method: "GET", path: "/world/:id/reputation", description: "Get character faction reputation scores" },
            { method: "PATCH", path: "/reputation", description: "Update character faction reputation" },

            { method: "GET", path: "/availability", description: "Get player availability calendar entries", queryParams: ["startDate=number", "endDate=number"] },
            { method: "POST", path: "/availability", description: "Toggle availability entry" },

            { method: "GET", path: "/commendations", description: "List player commendations", queryParams: ["sessionId=string", "characterId=string"] },
            { method: "GET", path: "/achievements", description: "List unlocked achievements" },
            { method: "GET", path: "/search", description: "Search worlds & characters by name", queryParams: ["q=string"] },
            { method: "GET", path: "/activity", description: "Get recent activity feed", queryParams: ["limit=number"] }
        ]
    });
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path?: string[] }> }
) {
    const { path } = await params;
    if (!path || path.length === 0 || ['docs', 'help', 'spec', 'openapi.json'].includes(path[0])) {
        return getApiDocsResponse();
    }
    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '') || undefined;

    const convex = getConvexClient();
    const [resource, id, subresource] = path;

    switch (resource) {
        case 'sessions':
            const past = req.nextUrl.searchParams.has('past')
                ? req.nextUrl.searchParams.get('past') === 'true'
                : undefined;
            const worldIdFilter = req.nextUrl.searchParams.get('worldId') || undefined;
            const systemFilter = (req.nextUrl.searchParams.get('system') as any) || undefined;
            return handleResponse(convex.query(api.external_api.listSessions, { apiKey, past, worldId: worldIdFilter, system: systemFilter }));
        case 'session':
            if (subresource === 'characters') {
                return handleResponse(convex.query(api.external_api.getSessionCharacters, { apiKey, sessionId: id }));
            }
            if (subresource === 'state') {
                return handleResponse(convex.query(api.external_api.getSessionState, { apiKey, sessionId: id }));
            }
            if (id) {
                return handleResponse(convex.query(api.external_api.getSessionDetails, { apiKey, sessionId: id }));
            }
            break;
        case 'worlds':
            return handleResponse(convex.query(api.external_api.listWorlds, { apiKey }));
        case 'world':
            if (subresource === 'calendar') {
                return handleResponse(convex.query(api.external_api.getWorldCalendar, { apiKey, worldId: id }));
            }
            if (subresource === 'quests') {
                return handleResponse(convex.query(api.external_api.listQuests, { apiKey, worldId: id }));
            }
            if (subresource === 'reputation') {
                return handleResponse(convex.query(api.external_api.getReputations, { apiKey, worldId: id }));
            }
            if (id) {
                return handleResponse(convex.query(api.external_api.getWorld, { apiKey, worldId: id }));
            }
            break;
        case 'characters':
            const uId = req.nextUrl.searchParams.get('userId') || undefined;
            return handleResponse(convex.query(api.external_api.listCharacters, { apiKey, userId: uId }));
        case 'character':
            return handleResponse(convex.query(api.external_api.getCharacter, { apiKey, characterId: id }));
        case 'quests':
            return handleResponse(convex.query(api.external_api.listQuests, { apiKey }));
        case 'character-quests':
            const charId = req.nextUrl.searchParams.get('characterId') || undefined;
            return handleResponse(convex.query(api.external_api.getCharacterQuests, { apiKey, characterId: charId }));
        case 'black-void':
            if (id === 'listings' || !id) {
                const type = req.nextUrl.searchParams.get('type') as any;
                const status = req.nextUrl.searchParams.get('status') as any;
                return handleResponse(convex.query(api.external_api.getBlackVoidListings, { apiKey, type: type || undefined, status: status || undefined }));
            }
            if (id === 'character' && subresource) {
                return handleResponse(convex.query(api.external_api.getBlackVoidTransactions, { apiKey, characterId: subresource }));
            }
            break;
        case 'availability':
            const startDate = req.nextUrl.searchParams.get('startDate') ? parseInt(req.nextUrl.searchParams.get('startDate')!) : undefined;
            const endDate = req.nextUrl.searchParams.get('endDate') ? parseInt(req.nextUrl.searchParams.get('endDate')!) : undefined;
            return handleResponse(convex.query(api.external_api.getAvailability, { apiKey, startDate, endDate }));
        case 'commendations':
            const sId = req.nextUrl.searchParams.get('sessionId') || undefined;
            const cId = req.nextUrl.searchParams.get('characterId') || undefined;
            return handleResponse(convex.query(api.external_api.listCommendations, { apiKey, sessionId: sId, characterId: cId }));
        case 'achievements':
            return handleResponse(convex.query(api.external_api.getUnlockedAchievements, { apiKey }));
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
    { params }: { params: Promise<{ path?: string[] }> }
) {
    const { path } = await params;
    if (!path || path.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 401 });

    const convex = getConvexClient();
    const body = await req.json();
    const [resource, id, subresource] = path;

    switch (resource) {
        case 'session':
            if (id && subresource === 'loot') {
                return handleResponse(convex.mutation(api.external_api.addSessionLoot, { apiKey, sessionId: id, ...body }));
            }
            if (id && subresource === 'commendation') {
                return handleResponse(convex.mutation(api.external_api.addCommendation, { apiKey, sessionId: id, ...body }));
            }
            return handleResponse(convex.mutation(api.external_api.createSession, { apiKey, ...body }));
        case 'character':
            return handleResponse(convex.mutation(api.external_api.createCharacter, { apiKey, ...body }));
        case 'quest':
            return handleResponse(convex.mutation(api.external_api.createQuest, { apiKey, ...body }));
        case 'black-void':
            if (id === 'item') {
                return handleResponse(convex.mutation(api.external_api.createBlackVoidItemListing, { apiKey, ...body }));
            }
            if (id === 'service') {
                return handleResponse(convex.mutation(api.external_api.createBlackVoidServiceListing, { apiKey, ...body }));
            }
            if (id === 'bid') {
                return handleResponse(convex.mutation(api.external_api.placeBlackVoidBid, { apiKey, ...body }));
            }
            break;
        case 'availability':
            return handleResponse(convex.mutation(api.external_api.setAvailability, { apiKey, ...body }));
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ path?: string[] }> }
) {
    const { path } = await params;
    if (!path || path.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 401 });

    const convex = getConvexClient();
    const body = await req.json();
    const [resource, id, subresource] = path;

    switch (resource) {
        case 'session':
            if (subresource === 'state') {
                return handleResponse(convex.mutation(api.external_api.updateSessionState, { apiKey, sessionId: id, ...body }));
            }
            if (id) {
                return handleResponse(convex.mutation(api.external_api.updateSession, { apiKey, sessionId: id, ...body }));
            }
            break;
        case 'world':
            if (subresource === 'calendar') {
                return handleResponse(convex.mutation(api.external_api.updateWorldDate, { apiKey, worldId: id, ...body }));
            }
            break;
        case 'character':
            return handleResponse(convex.mutation(api.external_api.updateCharacter, { apiKey, characterId: id, ...body }));
        case 'quest':
            return handleResponse(convex.mutation(api.external_api.updateQuest, { apiKey, questId: id, ...body }));
        case 'reputation':
            return handleResponse(convex.mutation(api.external_api.updateReputation, { apiKey, ...body }));
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
