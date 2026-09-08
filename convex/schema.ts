import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
    characters: defineTable({
        name: v.string(),
        title: v.optional(v.string()),
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
            titleFont: v.optional(v.string()),
            subtitleFont: v.optional(v.string()),
            nameColor: v.optional(v.string()),
            titleColor: v.optional(v.string()),
            subtitleColor: v.optional(v.string()),
            borderShape: v.optional(v.string()),
            borderColor: v.optional(v.string()),
            profileBorder: v.optional(v.string()),
            bgColor: v.optional(v.string()),
        })),
    }).index('by_userId', ['userId'])
      .index('by_rank', ['rank']),
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
        guildmasterCut: v.optional(v.object({
            characterId: v.id("characters"),
            claimed: v.optional(v.boolean()),
        })),
  }).index('by_locked', ['locked'])
    .index('by_owner', ['owner'])
    .index('by_guildmaster_cut', ['guildmasterCut.characterId']),
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
        rewardType: v.optional(v.union(v.literal('party'), v.literal('per_person'))), // 'party' (default) or 'per_person'
        rewardMoneyGP: v.optional(v.number()), // Gold Piece reward with up to 2 decimals
        rewardOther: v.optional(v.string()), // Found loot, special magic items, or custom extra reward
        tags: v.optional(v.array(v.string())),
        owner: v.string(), // Clerk userId of the creator
        characterId: v.optional(v.id("characters")), // Character owner for character quests
        characterRank: v.optional(v.string()), // 'none' | 'journeyman' | 'guildmaster' at time of creation
        isSponsored: v.optional(v.boolean()), // 20% (1/5th) reimbursed by Guild of the Void
        sponsoredAmount: v.optional(v.string()), // Formatted reimbursement string e.g. "1,000 SP" or "100 GP"
        netCost: v.optional(v.string()), // Actual out-of-pocket cost for the issuer e.g. "4,000 SP" or "80 GP"
        reimbursementClaimed: v.optional(v.boolean()), // Claim checkmark for reimbursement payback in character sheet log
        paymentClaimed: v.optional(v.boolean()), // Claim checkmark for paying out adventurers ('to be paid') in character sheet log
        isSuggested: v.optional(v.boolean()), // True if suggested to a world owner by a Guildmaster
        suggestionStatus: v.optional(v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected'))), // Approval status
        isCompleted: v.optional(v.boolean()),
        completedSessionId: v.optional(v.id("sessions")),
        completedAt: v.optional(v.number()),
    }).index('by_worldId', ['worldId'])
      .index('by_characterId', ['characterId'])
      .index('by_worldId_isSuggested', ['worldId', 'isSuggested']),
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
        minLevel: v.optional(v.number()),
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
    characterDetails: defineTable({
        characterId: v.id('characters'),
        pathbuilderId: v.optional(v.number()),
        system: v.optional(v.string()), // "PF2e"
        name: v.optional(v.string()),
        level: v.optional(v.number()),
        xp: v.optional(v.number()),
        ancestry: v.optional(v.string()),
        heritage: v.optional(v.string()),
        background: v.optional(v.string()),
        class: v.optional(v.string()),
        dualClass: v.optional(v.union(v.string(), v.null())),
        keyAbility: v.optional(v.union(
            v.literal('str'),
            v.literal('dex'),
            v.literal('con'),
            v.literal('int'),
            v.literal('wis'),
            v.literal('cha')
        )),
        alignment: v.optional(v.string()),
        deity: v.optional(v.string()),
        size: v.optional(v.string()),
        speed: v.optional(v.number()),
        hitPoints: v.optional(v.object({
            max: v.number(),
            current: v.number(),
            temporary: v.number(),
            dieSize: v.optional(v.number()),
            ancestryHP: v.optional(v.number()),
            classHP: v.optional(v.number()),
            bonusHP: v.optional(v.number()),
        })),
        armorClass: v.optional(v.object({
            total: v.number(),
            shieldBonus: v.optional(v.number()),
            unarmoredProf: v.optional(v.number()),
            equippedArmorName: v.optional(v.string()),
            shieldHardness: v.optional(v.number()),
            shieldCurrentHP: v.optional(v.number()),
            shieldMaxHP: v.optional(v.number()),
        })),
        saves: v.optional(v.object({
            fortitude: v.optional(v.object({
                bonus: v.number(),
                proficiency: v.optional(v.union(v.literal('U'), v.literal('T'), v.literal('E'), v.literal('M'), v.literal('L'))),
                profValue: v.optional(v.number()),
                itemBonus: v.optional(v.number()),
            })),
            reflex: v.optional(v.object({
                bonus: v.number(),
                proficiency: v.optional(v.union(v.literal('U'), v.literal('T'), v.literal('E'), v.literal('M'), v.literal('L'))),
                profValue: v.optional(v.number()),
                itemBonus: v.optional(v.number()),
            })),
            will: v.optional(v.object({
                bonus: v.number(),
                proficiency: v.optional(v.union(v.literal('U'), v.literal('T'), v.literal('E'), v.literal('M'), v.literal('L'))),
                profValue: v.optional(v.number()),
                itemBonus: v.optional(v.number()),
            })),
            perception: v.optional(v.object({
                bonus: v.number(),
                proficiency: v.optional(v.union(v.literal('U'), v.literal('T'), v.literal('E'), v.literal('M'), v.literal('L'))),
                profValue: v.optional(v.number()),
                itemBonus: v.optional(v.number()),
            })),
        })),
        abilities: v.optional(v.object({
            str: v.number(),
            dex: v.number(),
            con: v.number(),
            int: v.number(),
            wis: v.number(),
            cha: v.number(),
        })),
        skills: v.optional(v.record(v.string(), v.object({
            name: v.string(),
            modifier: v.number(),
            proficiency: v.optional(v.union(v.literal('U'), v.literal('T'), v.literal('E'), v.literal('M'), v.literal('L'))),
            ability: v.optional(v.string()),
            isLore: v.optional(v.boolean()),
        }))),
        conditions: v.optional(v.array(v.object({
            name: v.string(),
            value: v.optional(v.number()),
        }))),
        money: v.optional(v.object({
            cp: v.number(),
            sp: v.number(),
            gp: v.number(),
            pp: v.number(),
            totalInGold: v.optional(v.number()),
        })),
        gear: v.optional(v.object({
            weapons: v.optional(v.array(v.object({
                name: v.string(),
                die: v.optional(v.string()),
                damageType: v.optional(v.string()),
                attackBonus: v.optional(v.number()),
                potency: v.optional(v.number()),
                striking: v.optional(v.union(v.string(), v.null())),
                runes: v.optional(v.array(v.string())),
                traits: v.optional(v.array(v.string())),
                qty: v.number(),
            }))),
            armor: v.optional(v.array(v.object({
                name: v.string(),
                acBonus: v.optional(v.number()),
                potency: v.optional(v.number()),
                resilient: v.optional(v.string()),
                runes: v.optional(v.array(v.string())),
                worn: v.optional(v.boolean()),
                qty: v.number(),
            }))),
            equipment: v.optional(v.array(v.object({
                name: v.string(),
                qty: v.number(),
                bulk: v.optional(v.string()),
                container: v.optional(v.string()),
            }))),
        })),
        buildSummary: v.optional(v.object({
            classFeatures: v.optional(v.array(v.string())),
            ancestryFeats: v.optional(v.array(v.string())),
            classFeats: v.optional(v.array(v.string())),
            skillFeats: v.optional(v.array(v.string())),
            generalFeats: v.optional(v.array(v.string())),
            languages: v.optional(v.array(v.string())),
            specialResistances: v.optional(v.array(v.string())),
            feats: v.optional(v.array(v.string())),
            specials: v.optional(v.array(v.string())),
        })),
        rawExport: v.optional(v.any()), // Compact optional raw snapshot
        lastSyncedAt: v.number(),
    }).index('by_characterId', ['characterId']),
    voidObjectives: defineTable({
        monthKey: v.string(), // "YYYY-MM" (e.g. "2026-03")
        title: v.string(),
        description: v.string(),
        unit: v.optional(v.string()), // e.g. "bugs", "kills", "points"
        tier1Goal: v.number(),
        tier2Goal: v.number(),
        tier3Goal: v.number(),
        currentProgress: v.number(),
        deadline: v.number(), // timestamp for end of the month
    }).index('by_monthKey', ['monthKey']),
    voidObjectiveContributions: defineTable({
        monthKey: v.string(),
        characterId: v.id('characters'),
        amount: v.number(), // total contributed
        rewardClaimed: v.optional(v.boolean()),
        claimedTier: v.optional(v.number()), // 1, 2, 3 or 0 if none
        claimedRewardGP: v.optional(v.number()),
        claimedAt: v.optional(v.number()),
        lastSessionId: v.optional(v.id('sessions')),
    }).index('by_monthKey_character', ['monthKey', 'characterId'])
      .index('by_monthKey', ['monthKey'])
      .index('by_character', ['characterId']),
})


