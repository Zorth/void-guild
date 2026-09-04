'use client'

import Link from 'next/link'
import { Book, Trash2, Loader2, Sparkles, Flame, Trophy, Star, Users, ExternalLink, Globe, Medal, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { cn, getLevelBadgeStyle, CharacterRankIcon } from '@/lib/utils'
import { UserMetadata } from '@/app/stats/actions'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { toast } from 'sonner'
import { resolveCosmeticsStyles } from '@/lib/cosmetics'

interface CharacterRelationship {
  count: number
  isNew: boolean
  lastSession: {
    _id: Id<'sessions'>
    date?: number
    inGameDate?: { year: number; month: number; day: number; era?: string }
    worldName?: string
  } | null
  streak: number
  worldCount?: number
  isNewToWorld?: boolean
  worldStreak?: number
  worldName?: string
}

interface AttendingCharactersListProps {
  sessionId?: Id<'sessions'>
  characters: Doc<'characters'>[]
  userCharacterIds: Set<Id<'characters'>>
  sessionLocked: boolean
  sessionPlanning?: boolean
  isSessionOwner: boolean
  isGM?: boolean
  onLeave: (characterId: Id<'characters'>) => void
  userMetadata?: Record<string, UserMetadata>
  leavingCharacterId?: string | null
  relationships?: Record<string, CharacterRelationship>
  hasUserSignedUp?: boolean
}

export default function AttendingCharactersList({ 
  sessionId,
  characters, 
  userCharacterIds, 
  sessionLocked, 
  sessionPlanning,
  isSessionOwner,
  isGM,
  onLeave,
  userMetadata,
  leavingCharacterId,
  relationships,
  hasUserSignedUp
}: AttendingCharactersListProps) {
  const sessionCommendations = useQuery(
    api.commendations.getSessionCommendations,
    sessionId ? { sessionId } : 'skip'
  )
  const giveCommendation = useMutation(api.commendations.giveCommendation)

  const handleCommend = async (
    toCharacterId: Id<'characters'>,
    category: 'roleplay' | 'tactics' | 'clutch' | 'heroic' | 'gm',
    charName: string
  ) => {
    if (!sessionId) return
    try {
      const res = await giveCommendation({ sessionId, toCharacterId, category })
      if (res.action === 'created') {
        toast.success(category === 'gm' ? `Awarded GM Commendation to ${charName}!` : `Commended ${charName}!`)
      } else if (res.action === 'updated') {
        toast.success(`Updated commendation for ${charName}!`)
      } else if (res.action === 'removed') {
        toast.info(category === 'gm' ? `Removed GM Commendation for ${charName}` : `Removed commendation for ${charName}`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to give commendation')
    }
  }
  if (characters.length === 0) {
    return <p className="text-muted-foreground italic">No characters have joined this session yet.</p>
  }

  return (
    <ul className="grid grid-cols-1 gap-3">
      {characters.map((char) => {
        const isUserCharacter = userCharacterIds.has(char._id)
        const canRemove = !sessionLocked && !sessionPlanning && (isSessionOwner || isUserCharacter)
        const metadata = userMetadata?.[char.userId]
        const rel = relationships?.[char._id]

        const isGmUser = isGM ?? false
        const canCommendAsPlayer = hasUserSignedUp && !isUserCharacter
        const canCommendAsGm = isGmUser && !isUserCharacter
        const canCommend = (canCommendAsPlayer || canCommendAsGm) && !!sessionId

        const myPlayerComm = sessionCommendations?.myCommendation
        const myGmComm = sessionCommendations?.myGmCommendation

        const isPlayerCommendedByMe = myPlayerComm?.toCharacterId === char._id
        const isGmCommendedByMe = myGmComm?.toCharacterId === char._id
        const isAnyCommendedByMe = isPlayerCommendedByMe || isGmCommendedByMe

        const hasGivenPlayerComm = !!myPlayerComm
        const hasGivenGmComm = !!myGmComm
        const cosmeticsStyles = resolveCosmeticsStyles(char.cosmetics)
        const hasCustomBorderShape = char.cosmetics?.borderShape && char.cosmetics.borderShape !== 'default'
        
        return (
            <li 
                key={char._id} 
                className={cn(
                    "flex items-center justify-between p-4 rounded-lg border transition-colors gap-3",
                    hasCustomBorderShape ? cosmeticsStyles.cardClassName : (
                        isUserCharacter 
                            ? "bg-[rgba(147,51,234,0.1)] border-2 border-[#D8B4FE] hover:border-[#E9D5FF] hover:bg-[rgba(147,51,234,0.2)] shadow-sm" 
                            : "bg-muted/20"
                    ),
                    isUserCharacter && hasCustomBorderShape && "bg-purple-500/25"
                )}
                style={cosmeticsStyles.cardStyle}
            >
              <div className="flex items-center gap-3 min-w-0">
                {metadata?.imageUrl ? (
                    <img 
                        src={metadata.imageUrl} 
                        alt={metadata.name} 
                        className={cn("w-8 h-8 rounded-full shrink-0 object-cover", cosmeticsStyles.profileRingClassName)}
                    />
                ) : (
                    <div 
                        className={cn("w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center font-bold text-xs shrink-0", cosmeticsStyles.profileRingClassName)}
                    >
                        {char.name ? char.name[0]?.toUpperCase() : 'C'}
                    </div>
                )}
                <div className="min-w-0">
                    <div className="font-bold flex items-center flex-wrap gap-2">
                        <span className={cn("break-words", cosmeticsStyles.nameClassName)} style={cosmeticsStyles.nameStyle}>{char.name}</span>
                        {isUserCharacter && <span className="text-[10px] bg-purple-200 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold shrink-0">You</span>}
                        {/* Book Icon */}
                        <a
                            href={`https://void.tarragon.be/Player-Characters/${char.name.replace(/\s+/g, '-')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-purple-500 shrink-0"
                        >
                            <Book size={16} />
                        </a>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 whitespace-normal flex items-center flex-wrap gap-1.5">
                      <span className={cosmeticsStyles.subtitleClassName} style={cosmeticsStyles.subtitleStyle}>{char.ancestry} {char.class}</span>

                      {hasUserSignedUp && rel && (
                        isUserCharacter ? (
                          rel.isNewToWorld ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 focus:outline-none shrink-0"
                                >
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors">
                                    <Sparkles className="h-2.5 w-2.5" />
                                    NEW WORLD
                                  </span>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 p-3 text-xs space-y-2">
                                <div>
                                  <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 text-sm mb-1">
                                    <Sparkles className="h-4 w-4" />
                                    <span>First Time in {rel.worldName || 'this World'}!</span>
                                  </div>
                                  <p className="text-muted-foreground">
                                    This is your character's first time playing in {rel.worldName || 'this world'}!
                                  </p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (rel.worldCount ?? 0) > 0 ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 focus:outline-none shrink-0"
                                >
                                  {(rel.worldStreak ?? 0) >= 3 ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/25 hover:bg-orange-500/25 transition-colors">
                                      <Flame className="h-2.5 w-2.5 fill-orange-500 text-orange-500" />
                                      {rel.worldStreak} world streak
                                    </span>
                                  ) : (rel.worldCount ?? 0) >= 10 ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/25 hover:bg-purple-500/25 transition-colors">
                                      <Trophy className="h-2.5 w-2.5 text-purple-500" />
                                      {rel.worldCount}x world
                                    </span>
                                  ) : (rel.worldCount ?? 0) >= 5 ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-colors">
                                      <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                                      {rel.worldCount}x world
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25 hover:bg-blue-500/25 transition-colors">
                                      <Globe className="h-2.5 w-2.5" />
                                      {rel.worldCount}x world
                                    </span>
                                  )}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 p-3 text-xs space-y-2">
                                <div>
                                  <div className="flex items-center gap-1.5 font-bold text-sm mb-1">
                                    {(rel.worldStreak ?? 0) >= 3 ? (
                                      <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                        <Flame className="h-4 w-4 fill-orange-500 text-orange-500" />
                                        {rel.worldStreak}-Session World Streak!
                                      </span>
                                    ) : (rel.worldCount ?? 0) >= 10 ? (
                                      <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                                        <Trophy className="h-4 w-4 text-purple-500" />
                                        World Veteran! ({rel.worldCount}x)
                                      </span>
                                    ) : (rel.worldCount ?? 0) >= 5 ? (
                                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                                        Frequent Visitor! ({rel.worldCount}x)
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                        <Globe className="h-4 w-4" />
                                        World Explorer ({rel.worldCount}x)
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-muted-foreground">
                                    Your character has played in <b>{rel.worldCount}</b> session{rel.worldCount! > 1 ? 's' : ''} in {rel.worldName || 'this world'}.
                                    {(rel.worldStreak ?? 0) >= 3 && ` Currently on a ${rel.worldStreak}-session streak in this world!`}
                                  </p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : null
                        ) : (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 focus:outline-none shrink-0"
                              >
                                {rel.isNew ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors">
                                    <Sparkles className="h-2.5 w-2.5" />
                                    NEW
                                  </span>
                                ) : rel.streak >= 3 ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/25 hover:bg-orange-500/25 transition-colors">
                                    <Flame className="h-2.5 w-2.5 fill-orange-500 text-orange-500" />
                                    {rel.streak} streak
                                  </span>
                                ) : rel.count >= 10 ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/25 hover:bg-purple-500/25 transition-colors">
                                    <Trophy className="h-2.5 w-2.5 text-purple-500" />
                                    {rel.count}x
                                  </span>
                                ) : rel.count >= 5 ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-colors">
                                    <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                                    {rel.count}x
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25 hover:bg-blue-500/25 transition-colors">
                                    <Users className="h-2.5 w-2.5" />
                                    {rel.count}x
                                  </span>
                                )}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-3 text-xs space-y-2">
                              {rel.isNew ? (
                                <div>
                                  <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 text-sm mb-1">
                                    <Sparkles className="h-4 w-4" />
                                    <span>New Party Member!</span>
                                  </div>
                                  <p className="text-muted-foreground">
                                    This is the first time playing with this character!
                                  </p>
                                </div>
                              ) : (
                                <div>
                                  <div className="flex items-center gap-1.5 font-bold text-sm mb-1">
                                    {rel.streak >= 3 ? (
                                      <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                        <Flame className="h-4 w-4 fill-orange-500 text-orange-500" />
                                        {rel.streak}-Session Streak!
                                      </span>
                                    ) : rel.count >= 10 ? (
                                      <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                                        <Trophy className="h-4 w-4 text-purple-500" />
                                        Battle-hardened Companions! ({rel.count}x)
                                      </span>
                                    ) : rel.count >= 5 ? (
                                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                                        Frequent Adventurers! ({rel.count}x)
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                        <Users className="h-4 w-4" />
                                        Played Together ({rel.count}x)
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-muted-foreground mb-2">
                                    You have played in <b>{rel.count}</b> session{rel.count > 1 ? 's' : ''} together.
                                    {rel.streak >= 3 && ` Currently on a ${rel.streak}-session streak!`}
                                  </p>

                                  {rel.lastSession && (
                                    <div className="pt-2 border-t space-y-2">
                                      <div className="text-[11px] text-muted-foreground">
                                        <span className="font-semibold text-foreground">Last session together:</span>{' '}
                                        <span className="font-medium text-primary">{rel.lastSession.worldName}</span>
                                        {rel.lastSession.date && (
                                          <span className="block text-[10px] text-muted-foreground mt-0.5">
                                            {new Date(rel.lastSession.date).toLocaleDateString('en-US', {
                                              month: 'short',
                                              day: 'numeric',
                                              year: 'numeric'
                                            })}
                                          </span>
                                        )}
                                      </div>

                                      <Button size="sm" variant="outline" className="w-full text-xs h-7 gap-1" asChild>
                                        <Link href={`/sessions/${rel.lastSession._id}`}>
                                          <ExternalLink className="h-3.5 w-3.5" />
                                          Go to last session
                                        </Link>
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
                        )
                      )}
                    </div>
                    {char.websiteLink && (
                        <a 
                            href={char.websiteLink} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[10px] text-blue-500 hover:underline"
                        >
                            {char.websiteLink}
                        </a>
                    )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canCommend && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full border transition-all shrink-0 focus:outline-none",
                          isAnyCommendedByMe
                            ? "bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-500/40 hover:bg-purple-500/30 shadow-sm"
                            : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted/60"
                        )}
                        title="Commend this character"
                      >
                        <Medal className={cn("h-3 w-3", isAnyCommendedByMe ? "text-purple-500 fill-purple-500" : "")} />
                        {isAnyCommendedByMe ? (
                          <span className="flex items-center gap-1">
                            {isGmCommendedByMe && '👑 GM'}
                            {isGmCommendedByMe && isPlayerCommendedByMe && ' & '}
                            {isPlayerCommendedByMe && (
                              <>
                                {myPlayerComm?.category === 'roleplay' && '🎭 Roleplay'}
                                {myPlayerComm?.category === 'tactics' && '⚔️ Tactics'}
                                {myPlayerComm?.category === 'clutch' && '🛡️ Clutch'}
                                {myPlayerComm?.category === 'heroic' && '🌟 Heroic'}
                              </>
                            )}
                          </span>
                        ) : (
                          <span>Commend</span>
                        )}
                        {(sessionCommendations?.countsByCharacter[char._id]?.total ?? 0) > 0 && (
                          <span className="ml-0.5 px-1.5 py-0.2 bg-purple-500/20 text-purple-600 dark:text-purple-300 rounded-full text-[8px]">
                            {sessionCommendations?.countsByCharacter[char._id]?.total}
                          </span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3 text-xs space-y-3">
                      <div className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
                        <Medal className="h-4 w-4 text-purple-500" />
                        <span>Commend {char.name}</span>
                      </div>

                      {canCommendAsPlayer && (
                        <div className="space-y-2">
                          {canCommendAsGm && (
                            <div className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                              Player Commendation
                            </div>
                          )}
                          <p className="text-[11px] text-muted-foreground">
                            Award 1 commendation to a fellow party member:
                          </p>

                          {hasGivenPlayerComm && !isPlayerCommendedByMe ? (
                            <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2 rounded-md italic">
                              You have already given your player commendation this session. Unselect it first to commend {char.name}.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-1.5">
                              {(!hasGivenPlayerComm || (isPlayerCommendedByMe && myPlayerComm?.category === 'roleplay')) && (
                                <Button
                                  size="sm"
                                  variant={isPlayerCommendedByMe && myPlayerComm?.category === 'roleplay' ? 'default' : 'outline'}
                                  className="justify-start text-xs h-9 gap-2 font-normal"
                                  onClick={() => handleCommend(char._id, 'roleplay', char.name)}
                                >
                                  <span className="text-base">🎭</span>
                                  <div className="flex flex-col items-start text-left">
                                    <span className="font-semibold text-[11px]">Roleplay MVP</span>
                                    <span className="text-[9px] opacity-70">Great story & in-character play</span>
                                  </div>
                                </Button>
                              )}

                              {(!hasGivenPlayerComm || (isPlayerCommendedByMe && myPlayerComm?.category === 'tactics')) && (
                                <Button
                                  size="sm"
                                  variant={isPlayerCommendedByMe && myPlayerComm?.category === 'tactics' ? 'default' : 'outline'}
                                  className="justify-start text-xs h-9 gap-2 font-normal"
                                  onClick={() => handleCommend(char._id, 'tactics', char.name)}
                                >
                                  <span className="text-base">⚔️</span>
                                  <div className="flex flex-col items-start text-left">
                                    <span className="font-semibold text-[11px]">Tactical Genius</span>
                                    <span className="text-[9px] opacity-70">Smart combat & party strategies</span>
                                  </div>
                                </Button>
                              )}

                              {(!hasGivenPlayerComm || (isPlayerCommendedByMe && myPlayerComm?.category === 'clutch')) && (
                                <Button
                                  size="sm"
                                  variant={isPlayerCommendedByMe && myPlayerComm?.category === 'clutch' ? 'default' : 'outline'}
                                  className="justify-start text-xs h-9 gap-2 font-normal"
                                  onClick={() => handleCommend(char._id, 'clutch', char.name)}
                                >
                                  <span className="text-base">🛡️</span>
                                  <div className="flex flex-col items-start text-left">
                                    <span className="font-semibold text-[11px]">Clutch Savior</span>
                                    <span className="text-[9px] opacity-70">Saved the team in a tight spot</span>
                                  </div>
                                </Button>
                              )}

                              {(!hasGivenPlayerComm || (isPlayerCommendedByMe && myPlayerComm?.category === 'heroic')) && (
                                <Button
                                  size="sm"
                                  variant={isPlayerCommendedByMe && myPlayerComm?.category === 'heroic' ? 'default' : 'outline'}
                                  className="justify-start text-xs h-9 gap-2 font-normal"
                                  onClick={() => handleCommend(char._id, 'heroic', char.name)}
                                >
                                  <span className="text-base">🌟</span>
                                  <div className="flex flex-col items-start text-left">
                                    <span className="font-semibold text-[11px]">Heroic MVP</span>
                                    <span className="text-[9px] opacity-70">Overall outstanding performance</span>
                                  </div>
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {canCommendAsGm && (
                        <div className="space-y-2">
                          {canCommendAsPlayer && <div className="border-t pt-2" />}
                          <div className="font-semibold text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                            <Crown className="h-3.5 w-3.5" /> GM Commendation
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Award 1 player with your Gamemaster commendation:
                          </p>

                          {hasGivenGmComm && !isGmCommendedByMe ? (
                            <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2 rounded-md italic">
                              You have already given your GM commendation this session. Unselect it first to award it to {char.name}.
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant={isGmCommendedByMe ? 'default' : 'outline'}
                              className={cn(
                                "w-full justify-start text-xs h-9 gap-2 font-normal",
                                isGmCommendedByMe ? "bg-amber-600 hover:bg-amber-700 text-white" : "border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                              )}
                              onClick={() => handleCommend(char._id, 'gm', char.name)}
                            >
                              <Crown className="h-4 w-4 shrink-0 text-amber-500" />
                              <div className="flex flex-col items-start text-left">
                                <span className="font-semibold text-[11px]">GM Commendation</span>
                                <span className="text-[9px] opacity-80">Gamemaster's award for excellence</span>
                              </div>
                            </Button>
                          )}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                )}
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1">
                        <CharacterRankIcon rank={char.rank} />
                        {char.system && (
                            <img 
                                src={char.system === 'PF' ? '/PFVoid.svg' : '/DnDVoid.svg'} 
                                alt={char.system} 
                                className="h-4 w-4 mx-0.5"
                            />
                        )}
                        <span 
                            className="inline-flex align-middle justify-center w-14 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
                            style={getLevelBadgeStyle(char.lvl)}
                        >
                            Lvl {char.lvl}
                        </span>
                    </div>
                </div>
                {canRemove && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                        onClick={() => onLeave(char._id)}
                        disabled={leavingCharacterId === char._id}
                    >
                        {leavingCharacterId === char._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Trash2 className="h-4 w-4" />
                        )}
                    </Button>
                )}
              </div>
            </li>
        )
      })}
    </ul>
  )
}

