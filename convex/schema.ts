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
    }).index('by_userId', ['userId']),
    sessions: defineTable({
        date: v.number(),
        world: v.string(),
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
  }),
})
