import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
    characters: defineTable({
        name: v.string(),
        userId: v.string(),
        lvl: v.number(),
        xp: v.number(),
        ancestry: v.optional(v.string()),
        class: v.optional(v.string()),
        websiteLink: v.optional(v.string()),
        rank: v.optional(v.string()), // none, journeyman, guildmaster
        system: v.optional(v.union(v.literal('PF'), v.literal('DnD'))),
        cosmetics: v.optional(v.object({
            nameFont: v.optional(v.string()),
            subtitleFont: v.optional(v.string()),
            nameColor: v.optional(v.string()),
            subtitleColor: v.optional(v.string()),
            borderShape: v.optional(v.string()),
            borderColor: v.optional(v.string()),
            profileBorder: v.optional(v.string()),
            bgColor: v.optional(v.string()),
        })),
    }).index('by_userId', ['userId']),
    sessions: defineTable({
        date: v.optional(v.number()),
        world: v.id("worlds"),
        level: v.optional(v.number()),
        maxPlayers: v.number(),
        locked: v.boolean(),
        planning: v.optional(v.boolean()),
        characters: v.array(v.id("characters")),
        gmCharacter: v.optional(v.id("characters")),
        location: v.optional(v.string()), // Google Maps link
        xpGains: v.optional(v.array(v.object({
            characterId: v.id("characters"),
            xpGained: v.number(),
            oldLvl: v.number(),
            oldXp: v.number()
        }))),
        owner: v.string(), // Clerk userId of the GM
        interestedPlayers: v.optional(v.array(v.object({ // New field for interested players
            userId: v.string(),
            username: v.string(),
        }))),
        questId: v.optional(v.id("quests")),
        system: v.optional(v.union(v.literal('PF'), v.literal('DnD'))),
        inGameDate: v.optional(v.object({
            year: v.number(),
            month: v.number(), // 0-indexed to match JS/internal logic
            day: v.number(),
            era: v.optional(v.string()),
            endYear: v.optional(v.number()),
            endMonth: v.optional(v.number()),
            endDay: v.optional(v.number()),
        })),
        discordThreadId: v.optional(v.string()),
        loot: v.optional(v.array(v.object({
            id: v.string(),
            name: v.string(),
            link: v.optional(v.string()),
            valueGP: v.number(),
            isGood: v.boolean(),
            isPerCharacter: v.optional(v.boolean()),
            claimedBy: v.optional(v.id("characters")),
        }))),
  }).index('by_locked', ['locked']).index('by_owner', ['owner']),
    worlds: defineTable({
        name: v.string(),
        owner: v.string(), // Clerk userId of the world owner
        link: v.optional(v.string()),
        factions: v.optional(v.array(v.string())),
        factionGroups: v.optional(v.array(v.object({ 
            name: v.string(), 
            factions: v.array(v.string()) 
        }))),
        reputationVisible: v.optional(v.boolean()),
        calendar: v.optional(v.string()), // JSON string from Fantasy Calendar
        calendarVisible: v.optional(v.boolean()),
        description: v.optional(v.string()),
        mapEmbed: v.optional(v.string()),
    }).index('by_owner', ['owner']),
    reputations: defineTable({
        worldId: v.id('worlds'),
        characterId: v.id('characters'),
        factionName: v.string(),
        value: v.number(),
    }).index('by_world_character', ['worldId', 'characterId']).index('by_world_faction', ['worldId', 'factionName']),
    availability: defineTable({
        userId: v.string(),
        date: v.number(), // Start of day timestamp
        username: v.string(),
        isGM: v.boolean(),
    }).index('by_date', ['date']).index('by_user_date', ['userId', 'date']),
    activity: defineTable({
        type: v.string(), // "session_created", "level_up", "rank_promotion", "character_created"
        message: v.string(),
        userId: v.optional(v.string()), // The user who triggered the activity
        metadata: v.any(),
    }),
    quests: defineTable({
        name: v.string(),
        level: v.optional(v.number()), // 1-20 or 0 for unknown (DEPRECATED: Use levelPF)
        levelPF: v.optional(v.number()),
        levelDnD: v.optional(v.number()),
        worldId: v.optional(v.id("worlds")), // Optional for worldless quests (The Void)
        description: v.optional(v.string()),
        questgiver: v.optional(v.string()),
        reward: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        owner: v.string(), // Clerk userId of the creator
        characterId: v.optional(v.id("characters")), // Character owner for character quests
        isCompleted: v.optional(v.boolean()),
        completedSessionId: v.optional(v.id("sessions")),
        completedAt: v.optional(v.number()),
    }).index('by_worldId', ['worldId'])
      .index('by_characterId', ['characterId']),
    sessionStates: defineTable({
        sessionId: v.id('sessions'),
        initiative: v.optional(v.array(v.object({
            id: v.string(),
            name: v.string(),
            counter: v.optional(v.number()),
        }))),
        currentIndex: v.optional(v.number()),
        round: v.optional(v.number()),
        timeSeconds: v.optional(v.number()),
        isClockRunning: v.optional(v.boolean()),
        multiplier: v.optional(v.number()),
    }).index('by_sessionId', ['sessionId']),
    users: defineTable({
        userId: v.string(), // Clerk subject
        isAdmin: v.boolean(),
        isGM: v.boolean(),
        name: v.optional(v.string()),
        username: v.optional(v.string()),
        email: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        extraSessionsPlayed: v.optional(v.number()),
        extraSessionsRan: v.optional(v.number()),
        logoClicks: v.optional(v.number()),
        visitedWorld: v.optional(v.boolean()),
        visitedWiki: v.optional(v.boolean()),
        visitedLeaderboard: v.optional(v.boolean()),
        discordId: v.optional(v.string()),
        discordUsername: v.optional(v.string()),
        apiKey: v.optional(v.string()),
        apiKeyLastUsed: v.optional(v.number()),
    }).index('by_userId', ['userId'])
      .index('by_discordId', ['discordId'])
      .index('by_apiKey', ['apiKey']),
    commendations: defineTable({
        sessionId: v.id('sessions'),
        fromUserId: v.string(), // Clerk subject of the giver
        toCharacterId: v.id('characters'), // Character receiving the commendation
        category: v.union(
            v.literal('roleplay'),
            v.literal('tactics'),
            v.literal('clutch'),
            v.literal('heroic'),
            v.literal('gm')
        ),
    }).index('by_session_fromUser', ['sessionId', 'fromUserId'])
      .index('by_toCharacter', ['toCharacterId'])
      .index('by_fromUserId', ['fromUserId'])
      .index('by_session', ['sessionId']),
    unlockedAchievements: defineTable({
        userId: v.string(), // Clerk subject
        achievementId: v.string(), // Hardcoded ID
        unlockedAt: v.number(), // Timestamp
        notifiedAt: v.optional(v.number()), // Timestamp when toast was shown
    }).index('by_userId', ['userId'])
      .index('by_userId_achievementId', ['userId', 'achievementId']),
    blackVoidListings: defineTable({
        characterId: v.id('characters'), // Listing owner character
        type: v.union(v.literal('item'), v.literal('service')),
        name: v.string(),
        description: v.optional(v.string()),
        nethysUrl: v.optional(v.string()),
        // Item specific fields
        startingBid: v.optional(v.number()),
        buyoutPrice: v.optional(v.number()),
        durationDays: v.optional(v.number()), // min 1, max 30
        expiresAt: v.optional(v.number()),
        // Service specific fields
        priceType: v.optional(v.union(v.literal('percentage'), v.literal('flat'), v.literal('custom'))),
        percentage: v.optional(v.number()),
        markupGp: v.optional(v.number()),
        priceDetails: v.optional(v.string()),
        maxLevel: v.optional(v.number()),
        // Status and transactions
        status: v.union(v.literal('active'), v.literal('completed'), v.literal('cancelled')),
        winningBidderCharacterId: v.optional(v.id('characters')),
        winningAmount: v.optional(v.number()),
        winningType: v.optional(v.union(v.literal('bid'), v.literal('buyout'))),
        maxAutoBid: v.optional(v.number()),
        sellerClaimed: v.optional(v.boolean()), // Checkmark for seller adding earnings to character sheet
        buyerClaimed: v.optional(v.boolean()), // Checkmark for buyer adding item/expense to character sheet
    }).index('by_characterId', ['characterId'])
      .index('by_status', ['status'])
      .index('by_type_status', ['type', 'status'])
      .index('by_winningBidderCharacterId', ['winningBidderCharacterId']),
    blackVoidBids: defineTable({
        listingId: v.id('blackVoidListings'),
        characterId: v.id('characters'),
        amount: v.number(),
        maxAutoBid: v.optional(v.number()),
        isBuyout: v.boolean(),
        createdAt: v.number(),
        buyerClaimed: v.optional(v.boolean()),
    }).index('by_listingId', ['listingId'])
      .index('by_characterId', ['characterId']),
})

