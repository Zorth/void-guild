import { query, mutation, MutationCtx } from './_generated/server'
import { v } from 'convex/values'
import { Doc, Id } from './_generated/dataModel'
import { isAdmin } from './roles'
import { adjustCharacterMoney } from './moneyHelpers'
import { internal } from './_generated/api'

const MAX_ORDERS_PER_SIDE = 100
const MAX_INQUIRIES_PER_SIDE = 20

const termsArgs = {
    description: v.optional(v.string()),
    priceGp: v.number(),
    itemName: v.optional(v.string()),
    itemQty: v.optional(v.number()),
}

type Terms = {
    description?: string
    priceGp: number
    itemName?: string
    itemQty?: number
}

function normalizeTerms(args: Terms) {
    if (!Number.isFinite(args.priceGp) || args.priceGp < 0) {
        throw new Error('Price must be zero or more GP.')
    }
    const priceGp = Math.round(args.priceGp * 100) / 100
    const itemName = args.itemName?.trim() || undefined
    const itemQty = itemName ? Math.max(1, Math.floor(args.itemQty ?? 1)) : undefined
    if (priceGp === 0 && !itemName) {
        throw new Error('An order needs a price, an item, or both.')
    }
    return {
        priceGp,
        itemName,
        itemQty,
        description: args.description?.trim() || undefined,
    }
}

async function requireOwnedCharacter(ctx: MutationCtx, characterId: Id<'characters'>) {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error('Not authenticated')
    const character = await ctx.db.get(characterId)
    const isAdminUser = await isAdmin(ctx)
    if (!character || (character.userId !== user.subject && !isAdminUser)) {
        throw new Error('You do not own this character.')
    }
    return character
}

async function notifyDiscord(
    ctx: MutationCtx,
    orderId: Id<'blackVoidOrders'>,
    event: 'proposed' | 'accepted' | 'delivered' | 'cancelled',
    actorCharacterId: Id<'characters'>
) {
    await ctx.scheduler.runAfter(0, internal.blackVoidDiscord.postOrderUpdate, { orderId, event, actorCharacterId })
}

async function getOrderForParty(ctx: MutationCtx, orderId: Id<'blackVoidOrders'>, characterId: Id<'characters'>) {
    await requireOwnedCharacter(ctx, characterId)
    const order = await ctx.db.get(orderId)
    if (!order) throw new Error('Order not found.')
    if (order.providerCharacterId !== characterId && order.buyerCharacterId !== characterId) {
        throw new Error('You are not part of this order.')
    }
    return order
}

/** After a client has made contact, either party can open an order by proposing terms. */
export const proposeOrder = mutation({
    args: {
        inquiryId: v.id('blackVoidInquiries'),
        characterId: v.id('characters'),
        ...termsArgs,
    },
    handler: async (ctx, args) => {
        await requireOwnedCharacter(ctx, args.characterId)

        const inquiry = await ctx.db.get(args.inquiryId)
        if (!inquiry) throw new Error('Inquiry not found.')
        if (inquiry.providerCharacterId !== args.characterId && inquiry.buyerCharacterId !== args.characterId) {
            throw new Error('You are not part of this inquiry.')
        }

        const listing = await ctx.db.get(inquiry.listingId)
        if (!listing || listing.type !== 'service' || listing.status !== 'active') {
            throw new Error('Service listing is not active or does not exist.')
        }

        const terms = normalizeTerms(args)
        const now = Date.now()
        const orderId = await ctx.db.insert('blackVoidOrders', {
            inquiryId: inquiry._id,
            listingId: inquiry.listingId,
            serviceName: inquiry.serviceName,
            providerCharacterId: inquiry.providerCharacterId,
            buyerCharacterId: inquiry.buyerCharacterId,
            ...terms,
            status: 'proposed',
            lastProposedByCharacterId: args.characterId,
            createdAt: now,
            updatedAt: now,
        })
        await notifyDiscord(ctx, orderId, 'proposed', args.characterId)
        return orderId
    },
})

/** Either party can change the terms; the other party then has to accept them. */
export const proposeTerms = mutation({
    args: {
        orderId: v.id('blackVoidOrders'),
        characterId: v.id('characters'),
        ...termsArgs,
    },
    handler: async (ctx, args) => {
        const order = await getOrderForParty(ctx, args.orderId, args.characterId)
        if (order.status !== 'proposed' && order.status !== 'agreed') {
            throw new Error('This order can no longer be changed.')
        }
        await ctx.db.patch(args.orderId, {
            ...normalizeTerms(args),
            status: 'proposed',
            lastProposedByCharacterId: args.characterId,
            updatedAt: Date.now(),
        })
        await notifyDiscord(ctx, args.orderId, 'proposed', args.characterId)
    },
})

export const acceptOrder = mutation({
    args: {
        orderId: v.id('blackVoidOrders'),
        characterId: v.id('characters'),
    },
    handler: async (ctx, args) => {
        const order = await getOrderForParty(ctx, args.orderId, args.characterId)
        if (order.status !== 'proposed') throw new Error('This order is not awaiting agreement.')
        if (order.lastProposedByCharacterId === args.characterId) {
            throw new Error('The other party has to accept your terms.')
        }
        await ctx.db.patch(args.orderId, { status: 'agreed', updatedAt: Date.now() })
        await notifyDiscord(ctx, args.orderId, 'accepted', args.characterId)
    },
})

export const cancelOrder = mutation({
    args: {
        orderId: v.id('blackVoidOrders'),
        characterId: v.id('characters'),
    },
    handler: async (ctx, args) => {
        const order = await getOrderForParty(ctx, args.orderId, args.characterId)
        if (order.status !== 'proposed' && order.status !== 'agreed') {
            throw new Error('Only open orders can be cancelled.')
        }
        await ctx.db.patch(args.orderId, { status: 'cancelled', updatedAt: Date.now() })
        await notifyDiscord(ctx, args.orderId, 'cancelled', args.characterId)
    },
})

export const markDelivered = mutation({
    args: {
        orderId: v.id('blackVoidOrders'),
        characterId: v.id('characters'),
    },
    handler: async (ctx, args) => {
        const order = await getOrderForParty(ctx, args.orderId, args.characterId)
        if (order.status !== 'agreed') throw new Error('Both parties must agree before delivery.')
        const now = Date.now()
        await ctx.db.patch(args.orderId, { status: 'delivered', deliveredAt: now, updatedAt: now })
        await notifyDiscord(ctx, args.orderId, 'delivered', args.characterId)
    },
})

/** Adds/removes the order's payment on the caller's tracked purse. Buyer pays, provider is paid. */
export const toggleOrderClaimed = mutation({
    args: {
        orderId: v.id('blackVoidOrders'),
        characterId: v.id('characters'),
    },
    handler: async (ctx, args) => {
        const order = await getOrderForParty(ctx, args.orderId, args.characterId)
        if (order.status !== 'delivered') throw new Error('This order has not been delivered yet.')

        const isProvider = order.providerCharacterId === args.characterId
        const nextClaimed = !(isProvider ? order.providerClaimed : order.buyerClaimed)
        await ctx.db.patch(args.orderId, {
            ...(isProvider ? { providerClaimed: nextClaimed } : { buyerClaimed: nextClaimed }),
            updatedAt: Date.now(),
        })

        if (order.priceGp > 0) {
            const delta = isProvider ? order.priceGp : -order.priceGp
            await adjustCharacterMoney(ctx, args.characterId, nextClaimed ? delta : -delta)
        }
        return { success: true, claimed: nextClaimed }
    },
})

export const getCharacterOrders = query({
    args: { characterId: v.id('characters') },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity()
        if (!user) return []

        const [asProvider, asBuyer] = await Promise.all([
            ctx.db
                .query('blackVoidOrders')
                .withIndex('by_providerCharacterId', (q) => q.eq('providerCharacterId', args.characterId))
                .order('desc')
                .take(MAX_ORDERS_PER_SIDE),
            ctx.db
                .query('blackVoidOrders')
                .withIndex('by_buyerCharacterId', (q) => q.eq('buyerCharacterId', args.characterId))
                .order('desc')
                .take(MAX_ORDERS_PER_SIDE),
        ])

        const orders: Doc<'blackVoidOrders'>[] = [...asProvider, ...asBuyer].sort(
            (a, b) => b.updatedAt - a.updatedAt
        )

        return await Promise.all(
            orders.map(async (o) => {
                const isProvider = o.providerCharacterId === args.characterId
                const counterpart = await ctx.db.get(isProvider ? o.buyerCharacterId : o.providerCharacterId)
                return {
                    ...o,
                    role: isProvider ? ('provider' as const) : ('buyer' as const),
                    counterpartName: counterpart?.name || 'Unknown Character',
                    // The party that did not make the latest proposal is the one who can accept it
                    canAccept: o.status === 'proposed' && o.lastProposedByCharacterId !== args.characterId,
                    isClaimed: !!(isProvider ? o.providerClaimed : o.buyerClaimed),
                }
            })
        )
    },
})

export const getCharacterInquiries = query({
    args: { characterId: v.id('characters') },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity()
        if (!user) return []

        const [asProvider, asBuyer] = await Promise.all([
            ctx.db
                .query('blackVoidInquiries')
                .withIndex('by_providerCharacterId', (q) => q.eq('providerCharacterId', args.characterId))
                .order('desc')
                .take(MAX_INQUIRIES_PER_SIDE),
            ctx.db
                .query('blackVoidInquiries')
                .withIndex('by_buyerCharacterId', (q) => q.eq('buyerCharacterId', args.characterId))
                .order('desc')
                .take(MAX_INQUIRIES_PER_SIDE),
        ])

        const inquiries = [...asProvider, ...asBuyer].sort((a, b) => b.createdAt - a.createdAt)

        return await Promise.all(
            inquiries.map(async (i) => {
                const isProvider = i.providerCharacterId === args.characterId
                const counterpart = await ctx.db.get(isProvider ? i.buyerCharacterId : i.providerCharacterId)
                return {
                    ...i,
                    role: isProvider ? ('provider' as const) : ('buyer' as const),
                    counterpartName: counterpart?.name || 'Unknown Character',
                }
            })
        )
    },
})
