'use client'

import { useQuery, useMutation } from 'convex/react'
import { useUser } from '@clerk/nextjs'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Book,
  CircleHelp,
  Globe,
  Shield,
  Handshake,
  Medal,
  Sparkles,
  Coins,
  Skull,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { FormEvent, useState, useMemo } from 'react'
import { Doc, Id } from '@/convex/_generated/dataModel'
import Sessions from '@/components/sessions/Sessions'
import CreateCharacter from './CreateCharacter'
import AdminCharacterList from './AdminCharacterList'
import AdminUserList from './AdminUserList'
import CharacterDetailsDialog from './CharacterDetailsDialog'
import ProfileAvatarWithBadge from './ProfileAvatarWithBadge'
import { renderCosmeticLetters } from './CosmeticText'
import { MembershipBadge } from './MembershipBadge'
import InSyncPlasmaEffect from './InSyncPlasmaEffect'
import QuestBeaconBorderEffect from './QuestBeaconBorderEffect'
import BlazeTextParticles from './BlazeTextParticles'
import VoidNebulaEffect from './VoidNebulaEffect'
import InfernoFireEffect from './InfernoFireEffect'
import TintParticlesEffect from './TintParticlesEffect'
import FallingCoinsEffect from './FallingCoinsEffect'
import ArcaneRunesEffect from './ArcaneRunesEffect'
import PhantomSmokeEffect from './PhantomSmokeEffect'
import WorldStreakBackgroundEffect from './WorldStreakBackgroundEffect'
import { Skeleton } from '@/components/ui/skeleton'
import { getLevelBadgeStyle, CharacterRankIcon, getXPBarStyles, cn, getCharacterWikiUrl } from '@/lib/utils'
import { track } from '@vercel/analytics'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  resolveCosmeticsStyles,
} from '@/lib/cosmetics'

export default function Characters({ filters }: { filters?: { pf: boolean; dnd: boolean } }) {
  const { user } = useUser()
  const isCurrentUserMember = Boolean(
    user?.publicMetadata?.isMember === true ||
    String(user?.publicMetadata?.isMember).toLowerCase() === 'true' ||
    user?.publicMetadata?.role === 'member' ||
    user?.publicMetadata?.role === 'dragon' ||
    user?.publicMetadata?.role === 'admin' ||
    user?.publicMetadata?.admin === true ||
    String(user?.publicMetadata?.admin).toLowerCase() === 'true'
  )

  const charactersRaw = useQuery(api.characters.listCharacters)
  const characterRanks = useQuery(api.characters.getCharacterLeaderboardRanks)
  const updateCharacter = useMutation(api.characters.updateCharacter)
  const deleteCharacter = useMutation(api.characters.deleteCharacter)
  const recordWikiVisit = useMutation(api.users.recordWikiVisit)
  const syncAndGetAchievements = useMutation(api.achievements.syncAndGetAchievements)

  const allWorlds = useQuery(api.worlds.getAllWorlds)
  const blackVoidNotifications = useQuery(api.blackVoid.getUserBlackVoidNotifications)
  const isAdmin = useQuery(api.sessions.isAdminQuery)
  const userCommendations = useQuery(api.commendations.getUserCharactersCommendations)
  const unlockedAchievementIds = useQuery(api.achievements.getUserUnlockedAchievementIds) || []

  const characters = useMemo(() => {
    if (!charactersRaw) return charactersRaw
    if (!filters) return charactersRaw
    return charactersRaw.filter((char) => {
      if (char.system === 'PF' && !filters.pf) return false
      if (char.system === 'DnD' && !filters.dnd) return false
      return true
    })
  }, [charactersRaw, filters])

  const livingCharacters = useMemo(() => {
    if (!characters) return characters
    return characters.filter((char) => !char.isDead)
  }, [characters])

  const deadCharacters = useMemo(() => {
    if (!characters) return []
    return characters.filter((char) => Boolean(char.isDead))
  }, [characters])

  const totalDeadCharacters = useMemo(() => {
    if (!charactersRaw) return []
    return charactersRaw.filter((char) => Boolean(char.isDead))
  }, [charactersRaw])

  const [selectedCharacterId, setSelectedCharacterId] = useState<Id<'characters'> | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [isDeadModalOpen, setIsDeadModalOpen] = useState(false)

  const [showCreateWorldDialog, setShowCreateWorldDialog] = useState(false)
  const [newWorldName, setNewWorldName] = useState('')
  const [showRenameWorldDialog, setShowRenameWorldDialog] = useState(false)
  const [renameWorldName, setRenameWorldName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const world = useQuery(api.worlds.getWorldByOwner)
  const createWorld = useMutation(api.worlds.createWorld)
  const renameWorld = useMutation(api.worlds.renameWorld)

  const isGM = useQuery(api.sessions.isGameMasterQuery)

  async function handleCreateWorld(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      await createWorld({ name: newWorldName })
      track('world_created', { name: newWorldName })
      setNewWorldName('')
      setShowCreateWorldDialog(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRenameWorld(event: FormEvent) {
    event.preventDefault()
    if (!world) return
    setIsSubmitting(true)
    try {
      await renameWorld({ worldId: world._id, newName: renameWorldName })
      track('world_renamed', { oldName: world.name, newName: renameWorldName })
      setRenameWorldName('')
      setShowRenameWorldDialog(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  function openDetailsDialog(character: Doc<'characters'>) {
    setSelectedCharacterId(character._id)
    track('character_details_expanded', { name: character.name })
    setIsDetailsDialogOpen(true)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      <div className="flex flex-col">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle>Your Characters</CardTitle>
              {totalDeadCharacters.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 border-rose-500/30 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  onClick={() => setIsDeadModalOpen(true)}
                >
                  <Skull className="h-3.5 w-3.5" />
                  <span>Dead Characters ({totalDeadCharacters.length})</span>
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <AdminUserList />
              <AdminCharacterList />
            </div>
          </CardHeader>
          <CardContent>
            {livingCharacters === undefined ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : !livingCharacters || livingCharacters.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-lg border border-dashed border-border/50">
                <Shield className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No heroes yet.</p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  Create your first character to begin your journey.
                </p>
              </div>
            ) : (
              <ul className="space-y-2 w-full">
                {livingCharacters.map((character) => {
                  const cosmetics = resolveCosmeticsStyles(character.cosmetics)
                  const isSpecialBorder =
                    cosmetics.cardClassName.includes('-card-border') ||
                    cosmetics.cardClassName.includes('rainbow-border') ||
                    cosmetics.cardClassName.includes('void-rotating-border') ||
                    cosmetics.cardClassName.includes('in-sync-border') ||
                    cosmetics.cardClassName.includes('world-streak-border')
                  const isCharMember = Boolean((character as any).isMember || isCurrentUserMember)
                  const isWorldBg = Boolean(character.cosmetics?.bgColor?.startsWith('world_bg_'))
                  const isWorldBorder = Boolean(character.cosmetics?.borderShape?.startsWith('world_border_'))
                  const bgWorldId = isWorldBg ? character.cosmetics?.bgColor?.replace('world_bg_', '') : null
                  const bgWorld = isWorldBg && allWorlds ? allWorlds.find((w) => w._id === bgWorldId) : null
                  const borderWorldId = isWorldBorder ? character.cosmetics?.borderShape?.replace('world_border_', '') : null
                  const borderWorld = isWorldBorder && allWorlds ? allWorlds.find((w) => w._id === borderWorldId) : null

                  return (
                    <li
                      key={character._id}
                      className={cn(
                        'w-full flex flex-col cursor-pointer p-3 rounded-md transition-all relative overflow-visible',
                        isSpecialBorder ? 'hover:brightness-110' : 'hover:bg-muted/50 border border-transparent',
                        cosmetics.cardClassName
                      )}
                      style={cosmetics.cardStyle}
                      onClick={() => openDetailsDialog(character)}
                    >
                      {cosmetics.cardClassName.includes('in-sync') && <InSyncPlasmaEffect />}
                      {cosmetics.cardClassName.includes('quest-beacon') && <QuestBeaconBorderEffect />}
                      {(cosmetics.cardClassName.includes('void-nebula') || character.cosmetics?.bgColor === 'void_nebula' || character.cosmetics?.bgColor === 'void-nebula-bg') && (
                        <VoidNebulaEffect />
                      )}
                      {(cosmetics.cardClassName.includes('blaze-inferno') || character.cosmetics?.bgColor === 'blaze_inferno_bg' || character.cosmetics?.bgColor === 'blaze-inferno-bg') && (
                        <InfernoFireEffect />
                      )}
                      {(cosmetics.cardClassName.includes('cyan-particle') || character.cosmetics?.bgColor === 'cyan_particles' || character.cosmetics?.bgColor === 'cyan-particle-bg') && (
                        <TintParticlesEffect variant="cyan" />
                      )}
                      {(cosmetics.cardClassName.includes('crimson-particle') || character.cosmetics?.bgColor === 'crimson_particles' || character.cosmetics?.bgColor === 'crimson-particle-bg') && (
                        <TintParticlesEffect variant="crimson" />
                      )}
                      {(cosmetics.cardClassName.includes('gold-bg-tint') || character.cosmetics?.bgColor === 'gold_tint' || character.cosmetics?.bgColor === 'gold-bg-tint') && (
                        <TintParticlesEffect variant="gold" />
                      )}
                      {(cosmetics.cardClassName.includes('silver-bg-tint') || character.cosmetics?.bgColor === 'silver_tint' || character.cosmetics?.bgColor === 'silver-bg-tint') && (
                        <TintParticlesEffect variant="silver" />
                      )}
                      {(cosmetics.cardClassName.includes('gold-coins') || character.cosmetics?.bgColor === 'gold_coins_bg' || character.cosmetics?.bgColor === 'gold-coins-bg') && (
                        <FallingCoinsEffect />
                      )}
                      {(cosmetics.cardClassName.includes('arcane-runes') || character.cosmetics?.bgColor === 'arcane_runes_bg' || character.cosmetics?.bgColor === 'arcane-runes-bg') && (
                        <ArcaneRunesEffect />
                      )}
                      {(cosmetics.cardClassName.includes('phantom-smoke') || character.cosmetics?.bgColor === 'phantom_smoke_bg' || character.cosmetics?.bgColor === 'phantom-smoke-bg') && (
                        <PhantomSmokeEffect />
                      )}
                      {isWorldBg && <WorldStreakBackgroundEffect emblemUrl={bgWorld?.emblemUrl} />}

                      {isWorldBorder && borderWorld?.emblemUrl && (
                        <div
                          className="absolute -bottom-2.5 -right-2.5 z-20 pointer-events-none select-none"
                          title={borderWorld.name ? `${borderWorld.name} Sigil` : 'World Sigil'}
                        >
                          <img
                            src={borderWorld.emblemUrl}
                            alt={borderWorld.name || 'World Sigil'}
                            className="w-11 h-11 sm:w-12 sm:h-12 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                          />
                        </div>
                      )}
                      <div className="flex justify-between items-center w-full relative z-10 min-w-0">
                        <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                          {isCharMember && character.cosmetics?.avatarUrl && (
                            <ProfileAvatarWithBadge
                              imageUrl={character.cosmetics.avatarUrl}
                              name={character.name}
                              cosmetics={character.cosmetics}
                              profileRingClassName={cosmetics.profileRingClassName}
                              rankNumber={characterRanks?.[character._id]}
                              size="md"
                            />
                          )}
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={cn('font-medium relative truncate', cosmetics.nameClassName)}
                                style={cosmetics.nameStyle}
                              >
                                {cosmetics.nameClassName?.includes('blaze-fire-text') && <BlazeTextParticles />}
                                {renderCosmeticLetters(character.name, cosmetics.nameClassName)}
                              </span>
                              {isCharMember && <MembershipBadge />}
                              <a
                                href={getCharacterWikiUrl(character.name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  recordWikiVisit().then(() => syncAndGetAchievements()).catch(console.error)
                                }}
                                className="text-muted-foreground hover:text-purple-500 shrink-0"
                              >
                                <Book size={16} />
                              </a>
                            </div>
                            {character.title && (
                              <span className={cn('relative truncate text-xs', cosmetics.titleClassName)} style={cosmetics.titleStyle}>
                                {cosmetics.titleClassName?.includes('blaze-fire-text') && <BlazeTextParticles />}
                                {renderCosmeticLetters(character.title, cosmetics.titleClassName)}
                              </span>
                            )}
                            <span
                              className={cn('relative truncate text-xs', cosmetics.subtitleClassName)}
                              style={cosmetics.subtitleStyle}
                            >
                              {cosmetics.subtitleClassName?.includes('blaze-fire-text') && <BlazeTextParticles />}
                              {renderCosmeticLetters(`${character.ancestry || ''} ${character.class || ''}`.trim(), cosmetics.subtitleClassName)}
                            </span>
                            {character.websiteLink && (
                              <a
                                href={character.websiteLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-blue-500 hover:underline truncate max-w-full block break-all"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {character.websiteLink}
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1">
                              <CharacterRankIcon rank={character.rank} />
                              {character.system && (
                                <img
                                  src={character.system === 'PF' ? '/PFVoid.svg' : '/DnDVoid.svg'}
                                  alt={character.system}
                                  className="h-4 w-4 mx-0.5"
                                />
                              )}
                              <span
                                className="inline-flex align-middle justify-center w-14 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
                                style={getLevelBadgeStyle(character.lvl)}
                              >
                                Lvl {character.lvl}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {character.xp} XP
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-muted/30 h-1 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full transition-all duration-500 ease-out"
                          style={getXPBarStyles(character.lvl, character.xp)}
                        />
                      </div>
                      {(() => {
                        const comms = userCommendations?.[character._id]
                        if (!comms || comms.total === 0) return null
                        return (
                          <div className="flex items-center gap-1.5 flex-wrap text-[10px] mt-2 pt-1.5 border-t border-border/30">
                            <span className="text-muted-foreground font-semibold flex items-center gap-1">
                              <Medal className="h-3 w-3 text-amber-500 shrink-0" /> Commendations (
                              {comms.total}):
                            </span>
                            {comms.roleplay > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 font-bold border border-purple-500/25">
                                🎭 Roleplay: {comms.roleplay}
                              </span>
                            )}
                            {comms.tactics > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-300 font-bold border border-blue-500/25">
                                ⚔️ Tactics: {comms.tactics}
                              </span>
                            )}
                            {comms.clutch > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-bold border border-emerald-500/25">
                                🛡️ Clutch: {comms.clutch}
                              </span>
                            )}
                            {comms.heroic > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 font-bold border border-amber-500/25">
                                🌟 Heroic: {comms.heroic}
                              </span>
                            )}
                            {comms.gm > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 font-bold border border-amber-500/25">
                                👑 GM: {comms.gm}
                              </span>
                            )}
                          </div>
                        )
                      })()}
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="flex items-center gap-2 mt-4">
              <CreateCharacter />
              <a
                href="https://void.tarragon.be/notes/getting-started"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  recordWikiVisit().then(() => syncAndGetAchievements()).catch(console.error)
                }}
              >
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <CircleHelp className="h-5 w-5" />
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* World & Market Management Actions */}
        <div className="flex flex-col gap-3 mt-6 w-full">
          <Link href="/world" className="w-full">
            <Button
              variant="default"
              className="w-full flex items-center justify-center gap-3 h-12 text-md font-bold shadow-md hover:shadow-lg transition-all rounded-xl"
            >
              <Globe className="h-5 w-5" />
              Browse Worlds
            </Button>
          </Link>
          <Link href="/black-void" className="w-full">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-3 h-12 text-md font-bold border-2 border-purple-500/50 text-purple-300 hover:bg-purple-500/10 hover:border-purple-500 shadow-md hover:shadow-lg transition-all rounded-xl relative"
            >
              <Coins className="h-5 w-5 text-purple-400" />
              <span>The Black Void</span>
              {blackVoidNotifications?.hasAnyPendingAction && (
                <span className="relative flex h-2.5 w-2.5 ml-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
              )}
            </Button>
          </Link>

          {isGM && (
            <div className="w-full">
              {world === undefined ? (
                <Skeleton className="h-12 w-full rounded-xl" />
              ) : world === null ? (
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-3 h-12 text-md font-semibold rounded-xl border-2 border-dashed"
                  onClick={() => setShowCreateWorldDialog(true)}
                >
                  Create Your World
                </Button>
              ) : (
                <Link href={`/world/${encodeURIComponent(world.name)}`} className="w-full">
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-3 h-12 text-md font-bold border-2 border-amber-500/50 hover:bg-amber-500/10 hover:border-amber-500 transition-all rounded-xl"
                  >
                    <Handshake className="h-5 w-5 text-amber-500" />
                    Your World: {world.name}
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      <Sessions filters={filters} />

      <CharacterDetailsDialog
        characterId={selectedCharacterId}
        isOpen={isDetailsDialogOpen}
        onClose={() => {
          setIsDetailsDialogOpen(false)
          setSelectedCharacterId(null)
        }}
      />
      {/* Create World Dialog */}
      {isGM && (
        <Dialog open={showCreateWorldDialog} onOpenChange={setShowCreateWorldDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New World</DialogTitle>
              <DialogDescription>Enter a name for your new world.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateWorld} className="flex flex-col gap-4">
              <Input
                value={newWorldName}
                onChange={(e) => setNewWorldName(e.target.value)}
                placeholder="World Name"
                required
              />
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting || !newWorldName}>
                  {isSubmitting ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Dead Characters Dialog */}
      <Dialog open={isDeadModalOpen} onOpenChange={setIsDeadModalOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <Skull className="h-5 w-5" /> Dead Characters
            </DialogTitle>
            <DialogDescription>
              Fallen heroes who met their end in the Void. They remain honored in memory and on the leaderboards.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-grow py-2 space-y-2 pr-1">
            {totalDeadCharacters.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-6">
                You have no fallen heroes.
              </p>
            ) : (
              totalDeadCharacters.map((character) => {
                const cosmetics = resolveCosmeticsStyles(character.cosmetics)
                const isCharMember = Boolean((character as any).isMember || isCurrentUserMember)

                return (
                  <div
                    key={character._id}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-md transition-all cursor-pointer border border-border/50 hover:bg-muted/40 relative overflow-hidden',
                      cosmetics.cardClassName
                    )}
                    style={cosmetics.cardStyle}
                    onClick={() => {
                      setIsDeadModalOpen(false)
                      openDetailsDialog(character)
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                      {isCharMember && character.cosmetics?.avatarUrl && (
                        <ProfileAvatarWithBadge
                          imageUrl={character.cosmetics.avatarUrl}
                          name={character.name}
                          cosmetics={character.cosmetics}
                          profileRingClassName={cosmetics.profileRingClassName}
                          rankNumber={characterRanks?.[character._id]}
                          size="md"
                        />
                      )}
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={cn('font-medium relative truncate', cosmetics.nameClassName)}
                            style={cosmetics.nameStyle}
                          >
                            {character.name}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                            <Skull className="h-2.5 w-2.5" /> Deceased
                          </span>
                        </div>
                        {character.title && (
                          <span className="text-xs text-muted-foreground truncate italic">
                            {character.title}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground truncate">
                          {character.ancestry} {character.class}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <CharacterRankIcon rank={character.rank} />
                      {character.system && (
                        <img
                          src={character.system === 'PF' ? '/PFVoid.svg' : '/DnDVoid.svg'}
                          alt={character.system}
                          className="h-4 w-4 mx-0.5"
                        />
                      )}
                      <span
                        className="inline-flex align-middle justify-center w-14 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
                        style={getLevelBadgeStyle(character.lvl)}
                      >
                        Lvl {character.lvl}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeadModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
