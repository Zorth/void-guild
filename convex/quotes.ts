import { query, mutation, action, internalMutation, internalQuery } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import { Doc, Id } from './_generated/dataModel'
import { isAdmin } from './roles'

const DISCORD_API_BASE = "https://discord.com/api/v10"

export const insertQuote = internalMutation({
  args: {
    sessionId: v.id('sessions'),
    characterId: v.id('characters'),
    quote: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const character = await ctx.db.get(args.characterId)
    const session = await ctx.db.get(args.sessionId)
    if (!character || !session) {
      throw new Error('Character or Session not found')
    }

    const quoteId = await ctx.db.insert('quotes', {
      sessionId: args.sessionId,
      characterId: args.characterId,
      quote: args.quote,
      userId: args.userId,
    })

    // Log activity
    await ctx.db.insert('activity', {
      type: 'quote_logged',
      message: `${character.name}: "${args.quote}"`,
      userId: args.userId,
      metadata: {
        sessionId: args.sessionId,
        characterId: args.characterId,
        quoteId,
      },
    })

    return quoteId
  },
})

export const getQuoteDetails = internalQuery({
  args: {
    sessionId: v.id('sessions'),
    characterId: v.id('characters'),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)
    const character = await ctx.db.get(args.characterId)
    if (!session || !character) return null

    let worldName = 'The Void'
    if (session.world) {
      const worldDoc = await ctx.db.get(session.world)
      if (worldDoc) worldName = worldDoc.name
    }

    return {
      characterName: character.name,
      worldName,
    }
  },
})

export const logQuote = action({
  args: {
    sessionId: v.id('sessions'),
    characterId: v.id('characters'),
    quote: v.string(),
  },
  handler: async (ctx, args): Promise<{ quoteId: Id<'quotes'>; postedToDiscord: boolean; error?: string }> => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const trimmed = args.quote.trim()
    if (!trimmed) throw new Error('Quote cannot be empty')

    // 1. Save quote to database
    const quoteId = await ctx.runMutation(internal.quotes.insertQuote, {
      sessionId: args.sessionId,
      characterId: args.characterId,
      quote: trimmed,
      userId: user.subject,
    })

    // 2. Fetch details for Discord message
    const details = await ctx.runQuery(internal.quotes.getQuoteDetails, {
      sessionId: args.sessionId,
      characterId: args.characterId,
    })

    if (!details) return { quoteId, postedToDiscord: false }

    // 3. Post to Discord #ouroubouros-inn channel
    const botToken = process.env.DISCORD_BOT_TOKEN
    const channelId = process.env.DISCORD_CHANNEL_ID

    if (!botToken || !channelId) {
      console.warn('Discord bot token or activity channel ID not configured.')
      return { quoteId, postedToDiscord: false }
    }

    const sessionLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://guild.tarragon.be'}/sessions/${args.sessionId}`

    const hasQuotes = (trimmed.startsWith('"') && trimmed.endsWith('"')) || 
                      (trimmed.startsWith('“') && trimmed.endsWith('”'))
    const displayQuote = hasQuotes ? trimmed : `“${trimmed}”`

    const quoteLines = displayQuote
      .split('\n')
      .map(line => `> ${line}`)
      .join('\n')

    const worldLabel = details.worldName ? `[${details.worldName}](${sessionLink})` : `[Session](${sessionLink})`
    const content = `${quoteLines}\n— **${details.characterName}** in ${worldLabel}`

    try {
      const response = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          flags: 4, // SUPPRESS_EMBEDS
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Discord quote posting failed:', response.status, errorText)
        return { quoteId, postedToDiscord: false, error: errorText }
      }

      return { quoteId, postedToDiscord: true }
    } catch (e) {
      console.error('Failed to post quote to Discord:', e)
      return { 
        quoteId, 
        postedToDiscord: false, 
        error: e instanceof Error ? e.message : 'Unknown error' 
      }
    }
  },
})

export const getSessionQuotes = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    const quotes = await ctx.db
      .query('quotes')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .collect()

    const quotesWithChar = await Promise.all(
      quotes.map(async (q) => {
        const char = await ctx.db.get(q.characterId)
        return {
          ...q,
          characterName: char?.name || 'Unknown Character',
        }
      })
    )

    return quotesWithChar.sort((a, b) => b._creationTime - a._creationTime)
  },
})

export const getCharacterQuotes = query({
  args: { characterId: v.id('characters') },
  handler: async (ctx, args) => {
    const quotes = await ctx.db
      .query('quotes')
      .withIndex('by_character', (q) => q.eq('characterId', args.characterId))
      .collect()

    return quotes.sort((a, b) => b._creationTime - a._creationTime)
  },
})

export const deleteQuote = mutation({
  args: { quoteId: v.id('quotes') },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')

    const quote = await ctx.db.get(args.quoteId)
    if (!quote) throw new Error('Quote not found')

    const session = await ctx.db.get(quote.sessionId)
    const character = await ctx.db.get(quote.characterId)
    const isAdminUser = await isAdmin(ctx)

    const canDelete =
      quote.userId === user.subject ||
      character?.userId === user.subject ||
      session?.owner === user.subject ||
      isAdminUser

    if (!canDelete) {
      throw new Error('Unauthorized to delete this quote')
    }

    await ctx.db.delete(args.quoteId)
  },
})
