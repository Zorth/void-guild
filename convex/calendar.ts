import { v } from 'convex/values'
import { internalQuery } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { isExpeditionSession } from './sessions'

const DAY_MS = 24 * 60 * 60 * 1000
const PAST_WINDOW_MS = 30 * DAY_MS
const MAX_SESSIONS = 300
// Sessions don't store an end time, so calendar events assume a standard game night length.
const DEFAULT_SESSION_DURATION_MS = 4 * 60 * 60 * 1000

export type CalendarSession = {
  id: string
  start: number
  end: number
  summary: string
  description: string
  location?: string
  url: string
  status: 'CONFIRMED' | 'TENTATIVE'
}

/**
 * Public (non-private) sessions in a window around `now`, shaped for the shared ICS feed.
 * `now` is passed in because queries must not read the wall clock.
 */
export const listFeedSessions = internalQuery({
  args: { now: v.number(), baseUrl: v.string() },
  handler: async (ctx, args): Promise<CalendarSession[]> => {
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_date', (q) => q.gte('date', args.now - PAST_WINDOW_MS))
      .take(MAX_SESSIONS)

    const visible = sessions.filter((s) => !s.isPrivate && s.date !== undefined)

    const charIds = Array.from(new Set(visible.flatMap((s) => [
      ...(s.characters || []),
      ...(s.gmCharacter ? [s.gmCharacter] : []),
    ])))
    const worldIds = Array.from(new Set(visible.map((s) => s.world)))
    const questIds = Array.from(new Set(visible.map((s) => s.questId).filter((q): q is Id<'quests'> => Boolean(q))))

    const [charDocs, worldDocs, questDocs] = await Promise.all([
      Promise.all(charIds.map((id) => ctx.db.get(id))),
      Promise.all(worldIds.map((id) => ctx.db.get(id))),
      Promise.all(questIds.map((id) => ctx.db.get(id))),
    ])
    const chars = new Map<string, Doc<'characters'>>()
    charDocs.forEach((c) => { if (c) chars.set(c._id, c) })
    const worlds = new Map<string, Doc<'worlds'>>()
    worldDocs.forEach((w) => { if (w) worlds.set(w._id, w) })
    const quests = new Map<string, Doc<'quests'>>()
    questDocs.forEach((q) => { if (q) quests.set(q._id, q) })

    return visible.map((session) => {
      const world = worlds.get(session.world)
      // Hidden quests are concealed from regular players, and the feed is public.
      const rawQuest = session.questId && !session.isIntro ? quests.get(session.questId) ?? null : null
      const quest = rawQuest && !rawQuest.isHidden ? rawQuest : null
      const expedition = isExpeditionSession(session, rawQuest)
      const gm = session.gmCharacter ? chars.get(session.gmCharacter) : undefined
      const players = (session.characters || [])
        .filter((id) => id !== session.gmCharacter)
        .map((id) => chars.get(id))
        .filter((c): c is Doc<'characters'> => Boolean(c))

      const worldName = world?.name ?? 'Unknown World'
      const tags = [
        session.isIntro ? 'INTRO' : null,
        expedition ? 'EXPEDITION' : null,
        session.locked ? 'COMPLETED' : null,
      ].filter(Boolean)
      const title = quest?.name ?? (session.isIntro ? 'Intro Session' : null)
      const summary = [
        `${session.system}: ${worldName}`,
        title ? ` - ${title}` : '',
        tags.length ? ` [${tags.join(', ')}]` : '',
      ].join('')

      const url = `${args.baseUrl}/sessions/${session._id}`
      const lines: string[] = []
      if (quest) {
        lines.push(`Quest: ${quest.name}`)
        if (quest.description) lines.push(quest.description)
        if (quest.questgiver) lines.push(`Questgiver: ${quest.questgiver}`)
      }
      lines.push(`World: ${worldName}`)
      const level = quest?.levelPF ?? quest?.levelDnD ?? quest?.level ?? session.level
      if (expedition) lines.push('Level: any (Expedition, flat 250 XP)')
      else if (level && level > 0) lines.push(`Level: ${level}`)
      if (gm) lines.push(`GM: ${gm.name}`)
      lines.push(`Signed up: ${players.length}/${session.maxPlayers}`)
      if (players.length) {
        lines.push(...players.map((c) => `  - ${c.name} (Lvl ${c.lvl}${c.class ? ` ${c.class}` : ''})`))
      }
      if (session.location) lines.push(`Location: ${session.location}`)
      lines.push('', `Details & sign up: ${url}`)

      const start = session.date as number
      return {
        id: session._id,
        start,
        end: start + DEFAULT_SESSION_DURATION_MS,
        summary,
        description: lines.join('\n'),
        location: session.location,
        url,
        status: session.locked || players.length > 0 ? 'CONFIRMED' : 'TENTATIVE',
      }
    })
  },
})
