'use client'

import Link from 'next/link'
import { Book, Trash2, Loader2, Sparkles, Flame, Trophy, Star, Users, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { cn, getLevelBadgeStyle, CharacterRankIcon } from '@/lib/utils'
import { UserMetadata } from '@/app/stats/actions'

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
}

interface AttendingCharactersListProps {
  characters: Doc<'characters'>[]
  userCharacterIds: Set<Id<'characters'>>
  sessionLocked: boolean
  sessionPlanning?: boolean
  isSessionOwner: boolean
  onLeave: (characterId: Id<'characters'>) => void
  userMetadata?: Record<string, UserMetadata>
  leavingCharacterId?: string | null
  relationships?: Record<string, CharacterRelationship>
  hasUserSignedUp?: boolean
}

export default function AttendingCharactersList({ 
  characters, 
  userCharacterIds, 
  sessionLocked, 
  sessionPlanning,
  isSessionOwner, 
  onLeave,
  userMetadata,
  leavingCharacterId,
  relationships,
  hasUserSignedUp
}: AttendingCharactersListProps) {
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
        
        return (
            <li 
                key={char._id} 
                className={cn(
                    "flex items-center justify-between p-4 rounded-lg border transition-colors gap-3",
                    isUserCharacter 
                        ? "bg-[rgba(147,51,234,0.1)] border-2 border-[#D8B4FE] hover:border-[#E9D5FF] hover:bg-[rgba(147,51,234,0.2)] shadow-sm" 
                        : "bg-muted/20"
                )}
            >
              <div className="flex items-center gap-3 min-w-0">
                {metadata?.imageUrl && (
                    <img 
                        src={metadata.imageUrl} 
                        alt={metadata.name} 
                        className="w-8 h-8 rounded-full border border-border shrink-0"
                    />
                )}
                <div className="min-w-0">
                    <div className="font-bold flex items-center flex-wrap gap-2">
                        <span className="break-words">{char.name}</span>
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
                      <span>{char.ancestry} {char.class}</span>

                      {hasUserSignedUp && !isUserCharacter && rel && (
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

