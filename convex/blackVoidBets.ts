import { query, mutation, QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import { Doc, Id } from './_generated/dataModel'
import { isAdmin } from './roles'

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
const MAX_DEATHROLL_START = 1000000

// Helper to decorate character info for a bet
async function decorateBet(ctx: QueryCtx, bet: Doc<'blackVoidBets'>) {
  const sender = await ctx.db.get(bet.senderCharacterId)
  const target = bet.targetCharacterId ? await ctx.db.get(bet.targetCharacterId) : null
  const acceptedBy = bet.acceptedByCharacterId ? await ctx.db.get(bet.acceptedByCharacterId) : null
  const winner = bet.winnerCharacterId ? await ctx.db.get(bet.winnerCharacterId) : null
  const loser = bet.loserCharacterId ? await ctx.db.get(bet.loserCharacterId) : null
  const currentTurn = bet.currentTurnCharacterId ? await ctx.db.get(bet.currentTurnCharacterId) : null

  const now = Date.now()
  const turnDeadline = bet.turnDeadline || (bet.updatedAt || bet.createdAt) + TWENTY_FOUR_HOURS_MS
  const timeLeftMs = Math.max(0, turnDeadline - now)
  const isTimedOut = bet.status === 'accepted' && now > turnDeadline

  return {
    ...bet,
    senderName: sender?.name || 'Unknown',
    senderLevel: sender?.lvl || 1,
    senderClass: sender?.class || '',
    senderAncestry: sender?.ancestry || '',
    senderUserId: sender?.userId,
    targetName: target ? target.name : null,
    targetLevel: target ? target.lvl : null,
    targetClass: target ? target.class : null,
    targetAncestry: target ? target.ancestry : null,
    targetUserId: target?.userId,
    acceptedByName: acceptedBy ? acceptedBy.name : null,
    acceptedByLevel: acceptedBy ? acceptedBy.lvl : null,
    acceptedByClass: acceptedBy ? acceptedBy.class : null,
    acceptedByUserId: acceptedBy?.userId,
    winnerName: winner ? winner.name : null,
    loserName: loser ? loser.name : null,
    currentTurnName: currentTurn ? currentTurn.name : null,
    timeLeftMs,
    isTimedOut,
  }
}

export const getBettingData = query({
  args: {
    characterId: v.optional(v.id('characters')),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!args.characterId) {
      return {
        sentInvitation: null,
        receivedInvitations: [],
        openChallenges: [],
        activeMatches: [],
        recentBets: [],
        availableOpponents: [],
      }
    }

    const character = await ctx.db.get(args.characterId)
    if (!character) {
      return {
        sentInvitation: null,
        receivedInvitations: [],
        openChallenges: [],
        activeMatches: [],
        recentBets: [],
        availableOpponents: [],
      }
    }

    // 1. Sent active pending invitation (max 1 per character)
    const sentPendingRaw = await ctx.db
      .query('blackVoidBets')
      .withIndex('by_senderCharacterId_and_status', (q) =>
        q.eq('senderCharacterId', args.characterId!).eq('status', 'pending')
      )
      .first()

    const sentInvitation = sentPendingRaw ? await decorateBet(ctx, sentPendingRaw) : null

    // 2. Direct pending invitations received by this character
    const receivedPendingRaw = await ctx.db
      .query('blackVoidBets')
      .withIndex('by_targetCharacterId_and_status', (q) =>
        q.eq('targetCharacterId', args.characterId!).eq('status', 'pending')
      )
      .collect()

    const receivedInvitations = await Promise.all(receivedPendingRaw.map((b) => decorateBet(ctx, b)))

    // 3. Open pending challenges (no targetCharacterId) from other players
    const allPendingRaw = await ctx.db
      .query('blackVoidBets')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .collect()

    // Gather user's own character IDs to exclude from open challenges
    const userCharIds = new Set<string>()
    if (user) {
      const userChars = await ctx.db
        .query('characters')
        .withIndex('by_userId', (q) => q.eq('userId', user.subject))
        .collect()
      for (const c of userChars) {
        userCharIds.add(c._id)
      }
    }

    const openChallengesRaw = allPendingRaw.filter(
      (b) => !b.targetCharacterId && !userCharIds.has(b.senderCharacterId)
    )
    const openChallenges = await Promise.all(openChallengesRaw.map((b) => decorateBet(ctx, b)))

    // 4. Active accepted matches involving this character
    const allAcceptedRaw = await ctx.db
      .query('blackVoidBets')
      .withIndex('by_status', (q) => q.eq('status', 'accepted'))
      .collect()

    const activeMatchesRaw = allAcceptedRaw.filter(
      (b) => b.senderCharacterId === args.characterId || b.acceptedByCharacterId === args.characterId
    )
    const activeMatches = await Promise.all(activeMatchesRaw.map((b) => decorateBet(ctx, b)))

    // 5. Recent completed / cancelled / declined bets involving this character
    const allSenderBets = await ctx.db
      .query('blackVoidBets')
      .withIndex('by_senderCharacterId', (q) => q.eq('senderCharacterId', args.characterId!))
      .collect()

    const allTargetBets = await ctx.db
      .query('blackVoidBets')
      .withIndex('by_targetCharacterId', (q) => q.eq('targetCharacterId', args.characterId!))
      .collect()

    const allAcceptedByBets = await ctx.db
      .query('blackVoidBets')
      .withIndex('by_acceptedByCharacterId', (q) => q.eq('acceptedByCharacterId', args.characterId!))
      .collect()

    const map = new Map<string, Doc<'blackVoidBets'>>()
    for (const b of [...allSenderBets, ...allTargetBets, ...allAcceptedByBets]) {
      if (b.status !== 'pending' && b.status !== 'accepted') {
        map.set(b._id, b)
      }
    }
    const recentBetsRaw = Array.from(map.values())
      .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
      .slice(0, 20)

    const recentBets = await Promise.all(recentBetsRaw.map((b) => decorateBet(ctx, b)))

    // 6. Available opponent characters (excluding characters owned by the same user)
    const allCharacters = await ctx.db.query('characters').collect()
    const availableOpponents = allCharacters
      .filter((c) => c._id !== args.characterId && (!user || c.userId !== user.subject))
      .map((c) => ({
        _id: c._id,
        name: c.name,
        lvl: c.lvl,
        class: c.class || 'Adventurer',
        ancestry: c.ancestry || '',
      }))

    return {
      sentInvitation,
      receivedInvitations,
      openChallenges,
      activeMatches,
      recentBets,
      availableOpponents,
    }
  },
})

export const sendBetInvitation = mutation({
  args: {
    senderCharacterId: v.id('characters'),
    targetCharacterId: v.optional(v.id('characters')),
    wagerAmount: v.number(),
    deathrollValue: v.number(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const sender = await ctx.db.get(args.senderCharacterId)
    const isAdminUser = await isAdmin(ctx)
    if (!sender || (sender.userId !== user.subject && !isAdminUser)) {
      throw new Error('You do not own this character.')
    }

    if (args.targetCharacterId) {
      if (args.targetCharacterId === args.senderCharacterId) {
        throw new Error('You cannot challenge your own character.')
      }
      const target = await ctx.db.get(args.targetCharacterId)
      if (!target) throw new Error('Target opponent character not found.')
      if (target.userId === user.subject && !isAdminUser) {
        throw new Error('You cannot challenge another character that you own.')
      }
    }

    if (args.wagerAmount <= 0 || isNaN(args.wagerAmount)) {
      throw new Error('Wager amount must be at least 1 GP.')
    }

    if (args.deathrollValue < 2 || isNaN(args.deathrollValue)) {
      throw new Error('Deathroll starting value must be at least 2.')
    }

    if (args.deathrollValue > MAX_DEATHROLL_START) {
      throw new Error(`Starting Deathroll value cannot exceed ${MAX_DEATHROLL_START.toLocaleString()}.`)
    }

    // STRICT RULE: Characters can only have 1 active sent invitation at a time
    const existingPending = await ctx.db
      .query('blackVoidBets')
      .withIndex('by_senderCharacterId_and_status', (q) =>
        q.eq('senderCharacterId', args.senderCharacterId).eq('status', 'pending')
      )
      .first()

    if (existingPending) {
      throw new Error(
        'This character already has an active pending betting invitation. You can only have 1 sent invitation at a time.'
      )
    }

    const wagerRounded = Math.round(args.wagerAmount * 100) / 100
    const deathrollRounded = Math.floor(args.deathrollValue)

    const betId = await ctx.db.insert('blackVoidBets', {
      senderCharacterId: args.senderCharacterId,
      targetCharacterId: args.targetCharacterId,
      wagerAmount: wagerRounded,
      deathrollValue: deathrollRounded,
      currentRollMax: deathrollRounded,
      message: args.message?.trim() || undefined,
      status: 'pending',
      createdAt: Date.now(),
    })

    return { success: true, betId }
  },
})

export const cancelBetInvitation = mutation({
  args: {
    betId: v.id('blackVoidBets'),
    characterId: v.id('characters'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const bet = await ctx.db.get(args.betId)
    if (!bet) throw new Error('Betting invitation not found.')

    if (bet.senderCharacterId !== args.characterId) {
      throw new Error('Only the sender can cancel this invitation.')
    }

    const character = await ctx.db.get(args.characterId)
    const isAdminUser = await isAdmin(ctx)
    if (!character || (character.userId !== user.subject && !isAdminUser)) {
      throw new Error('You do not own this character.')
    }

    if (bet.status !== 'pending') {
      throw new Error('This invitation is no longer pending.')
    }

    await ctx.db.patch(args.betId, {
      status: 'cancelled',
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

export const declineBetInvitation = mutation({
  args: {
    betId: v.id('blackVoidBets'),
    characterId: v.id('characters'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const bet = await ctx.db.get(args.betId)
    if (!bet) throw new Error('Betting invitation not found.')

    if (bet.targetCharacterId !== args.characterId) {
      throw new Error('Only the invited opponent can decline this invitation.')
    }

    const character = await ctx.db.get(args.characterId)
    const isAdminUser = await isAdmin(ctx)
    if (!character || (character.userId !== user.subject && !isAdminUser)) {
      throw new Error('You do not own this character.')
    }

    if (bet.status !== 'pending') {
      throw new Error('This invitation is no longer pending.')
    }

    await ctx.db.patch(args.betId, {
      status: 'declined',
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

export const acceptBetInvitation = mutation({
  args: {
    betId: v.id('blackVoidBets'),
    characterId: v.id('characters'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const bet = await ctx.db.get(args.betId)
    if (!bet) throw new Error('Betting invitation not found.')

    if (bet.status !== 'pending') {
      throw new Error('This invitation is no longer pending.')
    }

    if (bet.senderCharacterId === args.characterId) {
      throw new Error('You cannot accept your own betting invitation.')
    }

    if (bet.targetCharacterId && bet.targetCharacterId !== args.characterId) {
      throw new Error('This invitation was sent to a different character.')
    }

    const character = await ctx.db.get(args.characterId)
    const isAdminUser = await isAdmin(ctx)
    if (!character || (character.userId !== user.subject && !isAdminUser)) {
      throw new Error('You do not own this character.')
    }

    const senderChar = await ctx.db.get(bet.senderCharacterId)
    if (senderChar && senderChar.userId === user.subject && !isAdminUser) {
      throw new Error('You cannot accept a challenge against your own character.')
    }

    const now = Date.now()
    const maxRoll = bet.deathrollValue
    // The accepter immediately rolls between 0 and deathrollValue (inclusive)
    const initialRoll = Math.floor(Math.random() * (maxRoll + 1))

    const initialRollEntry = {
      characterId: args.characterId,
      roll: initialRoll,
      outOf: maxRoll,
      timestamp: now,
    }

    // If the accepter rolls a 0 right on accept, they lose immediately!
    if (initialRoll === 0) {
      await ctx.db.patch(args.betId, {
        status: 'completed',
        acceptedByCharacterId: args.characterId,
        currentRollMax: 0,
        rolls: [initialRollEntry],
        winnerCharacterId: bet.senderCharacterId,
        loserCharacterId: args.characterId,
        lossReason: 'rolled_zero',
        updatedAt: now,
      })

      return {
        success: true,
        roll: initialRoll,
        outOf: maxRoll,
        isGameOver: true,
        winnerId: bet.senderCharacterId,
        loserId: args.characterId,
      }
    }

    // Otherwise, game is accepted and turn passes to the original sender with a 24-hour deadline
    const turnDeadline = now + TWENTY_FOUR_HOURS_MS

    await ctx.db.patch(args.betId, {
      status: 'accepted',
      acceptedByCharacterId: args.characterId,
      currentRollMax: initialRoll,
      currentTurnCharacterId: bet.senderCharacterId, // Sent back to original challenger
      turnDeadline,
      rolls: [initialRollEntry],
      updatedAt: now,
    })

    return {
      success: true,
      roll: initialRoll,
      outOf: maxRoll,
      isGameOver: false,
      nextTurnId: bet.senderCharacterId,
      turnDeadline,
    }
  },
})

export const rollDeathroll = mutation({
  args: {
    betId: v.id('blackVoidBets'),
    characterId: v.id('characters'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const bet = await ctx.db.get(args.betId)
    if (!bet) throw new Error('Bet not found.')

    if (bet.status !== 'accepted') {
      throw new Error('This game is not currently active.')
    }

    if (bet.currentTurnCharacterId !== args.characterId) {
      throw new Error('It is not your turn to roll.')
    }

    const character = await ctx.db.get(args.characterId)
    const isAdminUser = await isAdmin(ctx)
    if (!character || (character.userId !== user.subject && !isAdminUser)) {
      throw new Error('You do not own this character.')
    }

    const now = Date.now()
    const opponentId =
      bet.senderCharacterId === args.characterId ? bet.acceptedByCharacterId! : bet.senderCharacterId

    // Check if player missed the 24-hour window
    if (bet.turnDeadline && now > bet.turnDeadline) {
      await ctx.db.patch(args.betId, {
        status: 'completed',
        winnerCharacterId: opponentId,
        loserCharacterId: args.characterId,
        lossReason: 'timeout',
        updatedAt: now,
      })
      return {
        isGameOver: true,
        isTimedOut: true,
        winnerId: opponentId,
        loserId: args.characterId,
        message: 'The 24-hour turn window expired. Opponent wins the bet!',
      }
    }

    const currentMax = bet.currentRollMax !== undefined ? bet.currentRollMax : bet.deathrollValue
    // Roll a random integer between 0 and currentMax (inclusive)
    const roll = Math.floor(Math.random() * (currentMax + 1))

    const updatedRolls = [
      ...(bet.rolls || []),
      {
        characterId: args.characterId,
        roll,
        outOf: currentMax,
        timestamp: now,
      },
    ]

    // If player rolls a 0, they LOSE the bet!
    if (roll === 0) {
      await ctx.db.patch(args.betId, {
        rolls: updatedRolls,
        currentRollMax: 0,
        status: 'completed',
        winnerCharacterId: opponentId,
        loserCharacterId: args.characterId,
        lossReason: 'rolled_zero',
        updatedAt: now,
      })
      return { roll, outOf: currentMax, isGameOver: true, winnerId: opponentId, loserId: args.characterId }
    } else {
      // Game continues: new value is sent back to the other better with 24 hours to roll
      const turnDeadline = now + TWENTY_FOUR_HOURS_MS

      await ctx.db.patch(args.betId, {
        rolls: updatedRolls,
        currentRollMax: roll,
        currentTurnCharacterId: opponentId,
        turnDeadline,
        updatedAt: now,
      })
      return { roll, outOf: currentMax, isGameOver: false, nextTurnId: opponentId, turnDeadline }
    }
  },
})

export const claimBetTimeout = mutation({
  args: {
    betId: v.id('blackVoidBets'),
    characterId: v.id('characters'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const bet = await ctx.db.get(args.betId)
    if (!bet) throw new Error('Bet not found.')

    if (bet.status !== 'accepted') {
      throw new Error('This match is not active.')
    }

    const now = Date.now()
    if (!bet.turnDeadline || now <= bet.turnDeadline) {
      throw new Error('The 24-hour window has not expired yet.')
    }

    const timedOutCharId = bet.currentTurnCharacterId!
    const opponentId =
      bet.senderCharacterId === timedOutCharId ? bet.acceptedByCharacterId! : bet.senderCharacterId

    await ctx.db.patch(args.betId, {
      status: 'completed',
      winnerCharacterId: opponentId,
      loserCharacterId: timedOutCharId,
      lossReason: 'timeout',
      updatedAt: now,
    })

    return { success: true, winnerId: opponentId, loserId: timedOutCharId }
  },
})

export const toggleBetWinnerClaimed = mutation({
  args: {
    betId: v.id('blackVoidBets'),
    characterId: v.id('characters'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const bet = await ctx.db.get(args.betId)
    if (!bet) throw new Error('Bet not found.')

    if (bet.winnerCharacterId !== args.characterId) {
      throw new Error('Only the winning character can claim these winnings.')
    }

    const character = await ctx.db.get(args.characterId)
    const isAdminUser = await isAdmin(ctx)
    if (!character || (character.userId !== user.subject && !isAdminUser)) {
      throw new Error('You do not own this character.')
    }

    const currentClaimed = !!bet.winnerClaimed
    await ctx.db.patch(args.betId, {
      winnerClaimed: !currentClaimed,
      updatedAt: Date.now(),
    })

    return { success: true, claimed: !currentClaimed }
  },
})

export const toggleBetLoserClaimed = mutation({
  args: {
    betId: v.id('blackVoidBets'),
    characterId: v.id('characters'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const bet = await ctx.db.get(args.betId)
    if (!bet) throw new Error('Bet not found.')

    if (bet.loserCharacterId !== args.characterId) {
      throw new Error('Only the losing character can mark this loss as recorded.')
    }

    const character = await ctx.db.get(args.characterId)
    const isAdminUser = await isAdmin(ctx)
    if (!character || (character.userId !== user.subject && !isAdminUser)) {
      throw new Error('You do not own this character.')
    }

    const currentClaimed = !!bet.loserClaimed
    await ctx.db.patch(args.betId, {
      loserClaimed: !currentClaimed,
      updatedAt: Date.now(),
    })

    return { success: true, claimed: !currentClaimed }
  },
})