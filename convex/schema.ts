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
    }).index('by_userId', ['userId']),
    sessions: defineTable({
        date: v.number(),
        world: v.id("worlds"),
        level: v.optional(v.number()),
        maxPlayers: v.number(),
        locked: v.boolean(),
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
  }),
    worlds: defineTable({
        name: v.string(),
        owner: v.string(), // Clerk userId of the world owner
        link: v.optional(v.string()),
    }).index('by_owner', ['owner']),
    availability: defineTable({
        userId: v.string(),
        date: v.number(), // Start of day timestamp
        username: v.string(),
        isGM: v.boolean(),
    }).index('by_date', ['date']).index('by_user_date', ['userId', 'date']),
})
