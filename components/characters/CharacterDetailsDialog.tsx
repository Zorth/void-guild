'use client'

import React, { useState, useEffect, FormEvent } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Medal,
  Sparkles,
  Flame,
  Globe,
  Calendar,
  Quote,
  Pencil,
  Info,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { track } from '@vercel/analytics'
import Link from 'next/link'
import { cn, getLevelBadgeStyle, getXPBarStyles, formatDate, CharacterRankIcon } from '@/lib/utils'
import { CharacterCosmetics } from '@/lib/cosmetics'
import CharacterCallingCard from './CharacterCallingCard'
import CharacterCosmeticsTab from './CharacterCosmeticsTab'

interface CharacterDetailsDialogProps {
  characterId: Id<'characters'> | null
  isOpen: boolean
  onClose: () => void
}

export default function CharacterDetailsDialog({
  characterId,
  isOpen,
  onClose,
}: CharacterDetailsDialogProps) {
  const profile = useQuery(
    api.characters.getCharacterProfile,
    characterId ? { characterId } : 'skip'
  )
  const unlockedAchievementIds = useQuery(api.achievements.getUserUnlockedAchievementIds) || []
  const characterRanks = useQuery(api.characters.getCharacterLeaderboardRanks)

  const updateCharacter = useMutation(api.characters.updateCharacter)
  const deleteCharacter = useMutation(api.characters.deleteCharacter)
  const recordWikiVisit = useMutation(api.users.recordWikiVisit)
  const syncAndGetAchievements = useMutation(api.achievements.syncAndGetAchievements)

  const [activeTab, setActiveTab] = useState<'general' | 'edit' | 'cosmetics'>('general')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Edit form state
  const [editedData, setEditedData] = useState({
    name: '',
    ancestry: '',
    class: '',
    websiteLink: '',
    system: 'PF' as 'PF' | 'DnD',
  })

  // Cosmetics state
  const [editedCosmetics, setEditedCosmetics] = useState<CharacterCosmetics>({
    nameFont: 'default',
    titleFont: 'default',
    subtitleFont: 'default',
    nameColor: '',
    titleColor: '',
    subtitleColor: '',
    borderShape: 'default',
    borderColor: '',
    profileBorder: 'default',
    bgColor: 'default',
  })

  useEffect(() => {
    if (profile?.character) {
      const char = profile.character
      setEditedData({
        name: char.name,
        ancestry: char.ancestry ?? '',
        class: char.class ?? '',
        websiteLink: char.websiteLink ?? '',
        system: (char.system as 'PF' | 'DnD') ?? 'PF',
      })
      setEditedCosmetics({
        nameFont: char.cosmetics?.nameFont || 'default',
        titleFont: char.cosmetics?.titleFont || 'default',
        subtitleFont: char.cosmetics?.subtitleFont || 'default',
        nameColor: char.cosmetics?.nameColor || '',
        titleColor: char.cosmetics?.titleColor || '',
        subtitleColor: char.cosmetics?.subtitleColor || '',
        borderShape: char.cosmetics?.borderShape || 'default',
        borderColor: char.cosmetics?.borderColor || '',
        profileBorder: char.cosmetics?.profileBorder || 'default',
        bgColor: char.cosmetics?.bgColor || 'default',
      })
    }
  }, [profile?.character])

  // Reset tab to general when opening dialog or changing character
  useEffect(() => {
    if (isOpen) {
      setActiveTab('general')
    }
  }, [isOpen, characterId])

  if (!isOpen || !characterId) return null

  const char = profile?.character
  const canEdit = profile ? Boolean(profile.isOwner || profile.isAdmin) : false
  const rankNumber = (char?._id ? characterRanks?.[char._id] : undefined) ?? 1

  async function handleUpdate(e: FormEvent) {
    e.preventDefault()
    if (!char) return
    setIsSubmitting(true)
    try {
      await updateCharacter({
        characterId: char._id,
        ...editedData,
        cosmetics: editedCosmetics,
      })
      track('character_updated', { name: editedData.name })
      toast.success('Character updated successfully!')
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update character')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!char) return
    const name = char.name
    await deleteCharacter({ characterId: char._id })
    track('character_deleted', { name })
    toast.success(`${name} was deleted.`)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header with character summary */}
        <DialogHeader className="p-6 pb-2 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2 text-xl">
              {char ? char.name : <Skeleton className="h-6 w-32" />}
            </DialogTitle>
          </div>
          <DialogDescription className="flex items-center gap-2 mt-1">
            {char ? (
              <>
                <CharacterRankIcon rank={char.rank} />
                {char.system && (
                  <img
                    src={char.system === 'PF' ? '/PFVoid.svg' : '/DnDVoid.svg'}
                    alt={char.system}
                    className="h-4 w-4"
                  />
                )}
                <span
                  className="inline-flex align-middle justify-center w-14 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
                  style={getLevelBadgeStyle(char.lvl)}
                >
                  Lvl {char.lvl}
                </span>
                <span>{char.xp} XP</span>
              </>
            ) : (
              <Skeleton className="h-4 w-48" />
            )}
          </DialogDescription>

          {/* Navigation Tabs */}
          <div className="flex border-b border-border/70 mt-4 -mb-2">
            <button
              type="button"
              className={cn(
                'px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5',
                activeTab === 'general'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setActiveTab('general')}
            >
              <Info className="h-4 w-4" />
              General Info
            </button>

            {canEdit && (
              <>
                <button
                  type="button"
                  className={cn(
                    'px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5',
                    activeTab === 'edit'
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setActiveTab('edit')}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <button
                  type="button"
                  className={cn(
                    'px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5',
                    activeTab === 'cosmetics'
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setActiveTab('cosmetics')}
                >
                  <Sparkles className="h-4 w-4" />
                  Cosmetics
                </button>
              </>
            )}
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!profile || !char ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : activeTab === 'general' ? (
            <div className="space-y-6">
              {/* 1. Full Calling Card with Cosmetics */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" /> Calling Card
                </div>
                <CharacterCallingCard
                  name={char.name}
                  title={char.title}
                  ancestry={char.ancestry}
                  characterClass={char.class}
                  lvl={char.lvl}
                  rank={char.rank}
                  system={char.system}
                  websiteLink={char.websiteLink}
                  imageUrl={profile.owner?.imageUrl}
                  cosmetics={char.cosmetics}
                  rankNumber={rankNumber}
                  streak={profile.streaks?.attendanceStreak}
                  isYou={profile.isOwner}
                  onWikiClick={() => {
                    recordWikiVisit()
                      .then(() => syncAndGetAchievements())
                      .catch(console.error)
                  }}
                />
              </div>

              {/* 2. Level & XP Progress Bar */}
              <div className="p-3.5 rounded-lg bg-card/60 border border-border/70 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                    Level Progression
                  </span>
                  <span className="font-mono text-muted-foreground">
                    <strong className="text-foreground">{char.xp}</strong> / 1000 XP
                  </span>
                </div>
                <div className="w-full bg-muted/40 h-2.5 rounded-full overflow-hidden border border-border/50">
                  <div
                    className="h-full transition-all duration-500 ease-out"
                    style={getXPBarStyles(char.lvl, char.xp)}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                  <span>Current: Lvl {char.lvl}</span>
                  <span>Next: Lvl {char.lvl + 1}</span>
                </div>
              </div>

              {/* 3. Commendations Badges Breakdown */}
              <div className="p-3.5 rounded-lg bg-card/60 border border-border/70 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Medal className="h-3.5 w-3.5 text-amber-500" /> Commendations
                  </span>
                  <span className="text-[11px] font-bold text-foreground">
                    Total: {profile.commendations.total}
                  </span>
                </div>
                {profile.commendations.total === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-1">
                    No commendations received yet.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {profile.commendations.roleplay > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 text-xs font-bold border border-purple-500/25">
                        🎭 Roleplay: {profile.commendations.roleplay}
                      </span>
                    )}
                    {profile.commendations.tactics > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-300 text-xs font-bold border border-blue-500/25">
                        ⚔️ Tactics: {profile.commendations.tactics}
                      </span>
                    )}
                    {profile.commendations.clutch > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 text-xs font-bold border border-emerald-500/25">
                        🛡️ Clutch: {profile.commendations.clutch}
                      </span>
                    )}
                    {profile.commendations.heroic > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 text-xs font-bold border border-amber-500/25">
                        🌟 Heroic: {profile.commendations.heroic}
                      </span>
                    )}
                    {profile.commendations.gm > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 text-xs font-bold border border-amber-500/25">
                        👑 GM: {profile.commendations.gm}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Streaks Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg bg-card/60 border border-border/70 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Globe className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      World Streak
                    </div>
                    <div className="text-sm font-bold text-foreground">
                      {profile.streaks?.currentWorldStreak || 0} consecutive{' '}
                      {profile.streaks?.currentWorldName
                        ? `in ${profile.streaks.currentWorldName}`
                        : ''}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Best record: {profile.streaks?.maxWorldStreak || 0} sessions
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-card/60 border border-border/70 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <Flame className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Session Attendance
                    </div>
                    <div className="text-sm font-bold text-foreground">
                      {profile.streaks?.attendanceStreak || 0} sessions
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Total attended: {profile.sessions.length} sessions
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Session History, Quotes & Commendations */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-blue-400" /> Session History ({profile.sessions.length})
                  </span>
                </div>

                {profile.sessions.length === 0 ? (
                  <div className="p-4 rounded-lg bg-muted/20 border border-dashed border-border text-center text-xs text-muted-foreground">
                    This character has not attended any sessions yet.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {profile.sessions.map((sess) => (
                      <div
                        key={sess._id}
                        className="p-3 rounded-lg bg-card/70 border border-border/70 text-xs space-y-2 hover:border-border transition-colors"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-foreground">{sess.worldName}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                              {sess.system}
                            </span>
                            {sess.isGm && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 font-semibold">
                                GM
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            {sess.date && <span>{formatDate(sess.date)}</span>}
                            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px]" asChild>
                              <Link href={`/sessions/${sess._id}`} target="_blank">
                                View <ChevronRight className="h-3 w-3 ml-0.5" />
                              </Link>
                            </Button>
                          </div>
                        </div>

                        {/* Commendations in this session */}
                        {sess.commendations.total > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap text-[10px] pt-1 border-t border-border/30">
                            <span className="text-muted-foreground font-semibold flex items-center gap-1">
                              <Medal className="h-3 w-3 text-amber-500" /> Commendations:
                            </span>
                            {sess.commendations.roleplay > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-300 font-medium">
                                🎭 Roleplay ({sess.commendations.roleplay})
                              </span>
                            )}
                            {sess.commendations.tactics > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-300 font-medium">
                                ⚔️ Tactics ({sess.commendations.tactics})
                              </span>
                            )}
                            {sess.commendations.clutch > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-medium">
                                🛡️ Clutch ({sess.commendations.clutch})
                              </span>
                            )}
                            {sess.commendations.heroic > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 font-medium">
                                🌟 Heroic ({sess.commendations.heroic})
                              </span>
                            )}
                            {sess.commendations.gm > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 font-medium">
                                👑 GM ({sess.commendations.gm})
                              </span>
                            )}
                          </div>
                        )}

                        {/* Quotes in this session */}
                        {sess.quotes.length > 0 && (
                          <div className="space-y-1.5 pt-1 border-t border-border/30">
                            <div className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                              <Quote className="h-3 w-3 text-purple-400" /> Quotes:
                            </div>
                            {sess.quotes.map((qItem, idx) => {
                              const qText = typeof qItem === 'string' ? qItem : qItem.quote
                              const quoter = typeof qItem === 'object' ? qItem.quoterName : undefined
                              return (
                                <div key={idx} className="space-y-0.5">
                                  <blockquote className="pl-2 border-l-2 border-purple-500/50 text-[11px] italic text-muted-foreground">
                                    &ldquo;{qText}&rdquo;
                                  </blockquote>
                                  {quoter && (
                                    <div className="pl-2 text-[9px] text-muted-foreground/80 font-medium">
                                      — quoted by <span className="text-foreground/90 font-semibold">{quoter}</span>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'edit' && canEdit ? (
            /* Edit Form Tab */
            <form id="character-edit-form" onSubmit={handleUpdate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">System</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editedData.system}
                  onChange={(e) =>
                    setEditedData({
                      ...editedData,
                      system: e.target.value as 'PF' | 'DnD',
                    })
                  }
                >
                  <option value="PF">Pathfinder</option>
                  <option value="DnD">Dungeons & Dragons</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Character Name</label>
                <Input
                  value={editedData.name}
                  onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                  placeholder="Character Name"
                  required
                />
              </div>

              {char.title && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium flex items-center justify-between">
                    <span>Title</span>
                    <span className="text-[10px] text-muted-foreground font-normal">(Admin set)</span>
                  </label>
                  <Input
                    value={char.title}
                    disabled
                    className="bg-muted/50 italic text-amber-400/90 font-medium"
                  />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Ancestry</label>
                <Input
                  value={editedData.ancestry}
                  onChange={(e) => setEditedData({ ...editedData, ancestry: e.target.value })}
                  placeholder="Ancestry"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Class</label>
                <Input
                  value={editedData.class}
                  onChange={(e) => setEditedData({ ...editedData, class: e.target.value })}
                  placeholder="Class"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Website Link</label>
                <Input
                  value={editedData.websiteLink}
                  onChange={(e) =>
                    setEditedData({
                      ...editedData,
                      websiteLink: e.target.value,
                    })
                  }
                  placeholder="Website Link"
                />
              </div>
            </form>
          ) : activeTab === 'cosmetics' && canEdit ? (
            /* Cosmetics Tab */
            <CharacterCosmeticsTab
              characterId={char._id}
              characterName={editedData.name}
              title={char.title}
              ancestry={editedData.ancestry}
              characterClass={editedData.class}
              characterLvl={char.lvl}
              characterRank={char.rank}
              cosmetics={editedCosmetics}
              onChangeCosmetics={setEditedCosmetics}
              unlockedAchievementIds={unlockedAchievementIds}
              isAdmin={Boolean(profile.isAdmin)}
            />
          ) : null}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border/50 bg-muted/20 shrink-0 flex items-center justify-between sm:justify-between">
          {activeTab === 'general' ? (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-muted-foreground">
                Player: <strong className="text-foreground">{profile?.owner?.name}</strong>
              </span>
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" size="sm">
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {char?.name}. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form={activeTab === 'edit' ? 'character-edit-form' : undefined}
                  onClick={activeTab === 'cosmetics' ? handleUpdate : undefined}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
