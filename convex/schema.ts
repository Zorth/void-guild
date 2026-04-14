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
        discordThreadId: v.optional(v.string()),
  }),
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
    }).index('by_worldId', ['worldId']),
})
