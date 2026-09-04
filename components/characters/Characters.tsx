'use client'

import { useQuery, useMutation } from 'convex/react'
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
  Lock,
  Palette,
  Type,
  Frame,
  Paintbrush,
  Circle,
} from 'lucide-react'
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
import { FormEvent, useState, useMemo } from 'react'
import { Doc } from '@/convex/_generated/dataModel'
import Sessions from '@/components/sessions/Sessions'
import CreateCharacter from './CreateCharacter'
import AdminCharacterList from './AdminCharacterList'
import AdminUserList from './AdminUserList'
import { Skeleton } from '@/components/ui/skeleton'
import { getLevelBadgeStyle, CharacterRankIcon, getXPBarStyles, cn } from '@/lib/utils'
import { track } from '@vercel/analytics'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  resolveCosmeticsStyles,
  FONT_OPTIONS,
  COLOR_OPTIONS,
  BORDER_SHAPE_OPTIONS,
  PROFILE_BORDER_OPTIONS,
  BG_COLOR_OPTIONS,
  CharacterCosmetics,
  CosmeticOption,
  ACHIEVEMENT_INFO,
} from '@/lib/cosmetics'

export default function Characters({ filters }: { filters?: { pf: boolean; dnd: boolean } }) {
  const charactersRaw = useQuery(api.characters.listCharacters)
  const updateCharacter = useMutation(api.characters.updateCharacter)
  const deleteCharacter = useMutation(api.characters.deleteCharacter)

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

  const [selectedCharacter, setSelectedCharacter] = useState<Doc<'characters'> | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'cosmetics'>('general')

  const [editedCharacterData, setEditedCharacterData] = useState({
    name: '',
    ancestry: '',
    class: '',
    websiteLink: '',
    system: 'PF' as 'PF' | 'DnD',
  })

  const [editedCosmetics, setEditedCosmetics] = useState<CharacterCosmetics>({
    nameFont: 'default',
    subtitleFont: 'default',
    nameColor: '',
    subtitleColor: '',
    borderShape: 'default',
    borderColor: '',
    profileBorder: 'default',
    bgColor: 'default',
  })

  const [showCreateWorldDialog, setShowCreateWorldDialog] = useState(false)
  const [newWorldName, setNewWorldName] = useState('')
  const [showRenameWorldDialog, setShowRenameWorldDialog] = useState(false)
  const [renameWorldName, setRenameWorldName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const world = useQuery(api.worlds.getWorldByOwner)
  const createWorld = useMutation(api.worlds.createWorld)
  const renameWorld = useMutation(api.worlds.renameWorld)

  const isGM = useQuery(api.sessions.isGameMasterQuery)

  function getOptionLockStatus(opt: CosmeticOption) {
    if (opt.unlockedByDefault) return { isUnlocked: true, label: '', badgeLabel: '', isHidden: false, title: '' }
    if (!opt.requiredAchievementId) return { isUnlocked: true, label: '', badgeLabel: '', isHidden: false, title: '' }
    const isUnlocked = unlockedAchievementIds.includes(opt.requiredAchievementId)
    const info = ACHIEVEMENT_INFO[opt.requiredAchievementId]
    const isHidden = info?.category === 'hidden'
    const title = info?.title || opt.requiredAchievementId
    const label = isUnlocked
      ? ''
      : isHidden
        ? 'Locked (Secret Achievement)'
        : `Requires achievement: ${title}`
    const badgeLabel = isUnlocked
      ? ''
      : isHidden
        ? 'Locked'
        : `Requires: ${title}`

    return { isUnlocked, isHidden, label, badgeLabel, title }
  }

  function handleSelectOption(category: keyof CharacterCosmetics, opt: CosmeticOption) {
    const { isUnlocked, isHidden, title } = getOptionLockStatus(opt)
    if (!isUnlocked) {
      if (isHidden) {
        toast.error('Locked cosmetic! Unlocked by a secret achievement.')
      } else {
        toast.error(`Locked cosmetic! Requires achievement: "${title}"`)
      }
      return
    }
    setEditedCosmetics((prev) => ({
      ...prev,
      [category]: opt.id,
    }))
  }

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

  async function handleUpdateCharacter(event: FormEvent) {
    event.preventDefault()
    if (!selectedCharacter) return
    setIsSubmitting(true)
    try {
      await updateCharacter({
        characterId: selectedCharacter._id,
        ...editedCharacterData,
        cosmetics: editedCosmetics,
      })
      track('character_updated', { name: editedCharacterData.name })
      toast.success('Character updated successfully!')
      setIsDetailsDialogOpen(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update character')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteCharacter() {
    if (!selectedCharacter) return
    const name = selectedCharacter.name
    await deleteCharacter({ characterId: selectedCharacter._id })
    track('character_deleted', { name })
    setIsDetailsDialogOpen(false)
  }

  function openDetailsDialog(character: Doc<'characters'>) {
    setSelectedCharacter(character)
    setEditedCharacterData({
      name: character.name,
      ancestry: character.ancestry ?? '',
      class: character.class ?? '',
      websiteLink: character.websiteLink ?? '',
      system: (character.system as 'PF' | 'DnD') ?? 'PF',
    })
    setEditedCosmetics({
      nameFont: character.cosmetics?.nameFont || 'default',
      subtitleFont: character.cosmetics?.subtitleFont || 'default',
      nameColor: character.cosmetics?.nameColor || '',
      subtitleColor: character.cosmetics?.subtitleColor || '',
      borderShape: character.cosmetics?.borderShape || 'default',
      borderColor: character.cosmetics?.borderColor || '',
      profileBorder: character.cosmetics?.profileBorder || 'default',
      bgColor: character.cosmetics?.bgColor || 'default',
    })
    setActiveTab('general')
    track('character_details_expanded', { name: character.name })
    setIsDetailsDialogOpen(true)
  }

  // Color Swatch Swatcher Row Helper
  const renderColorSwatches = (colorKey: 'nameColor' | 'subtitleColor') => (
    <div className="flex flex-wrap gap-2.5 items-center">
      {/* Auto / Default Color Swatch */}
      <button
        type="button"
        onClick={() => setEditedCosmetics((prev) => ({ ...prev, [colorKey]: '' }))}
        title="Default Theme Color"
        className={cn(
          'w-8 h-8 rounded-full border flex items-center justify-center transition-all relative',
          editedCosmetics[colorKey] === '' || !editedCosmetics[colorKey]
            ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-background scale-110 border-purple-500 font-bold'
            : 'border-border hover:border-muted-foreground bg-muted/40'
        )}
      >
        <span className="text-[10px] font-bold text-muted-foreground">Auto</span>
      </button>

      {/* Preset Color Swatches */}
      {COLOR_OPTIONS.filter((c) => c.id !== 'default').map((opt) => {
        const { isUnlocked, label } = getOptionLockStatus(opt)
        const isSelected = editedCosmetics[colorKey] === opt.value

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => handleSelectOption(colorKey, opt)}
            title={!isUnlocked ? label : opt.name}
            className={cn(
              'w-8 h-8 rounded-full transition-all flex items-center justify-center relative border',
              isSelected
                ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-background scale-110 border-white dark:border-slate-900'
                : isUnlocked
                  ? 'border-transparent hover:scale-105 shadow-sm'
                  : 'opacity-40 grayscale cursor-not-allowed border-border/40'
            )}
            style={{ backgroundColor: opt.value }}
          >
            {!isUnlocked && <Lock className="h-3 w-3 text-white drop-shadow" />}
          </button>
        )
      })}

      {/* Custom Hex Color Picker Swatch */}
      <label
        title="Custom Color Picker"
        className="w-8 h-8 rounded-full border border-dashed border-border hover:border-purple-500 flex items-center justify-center cursor-pointer relative transition-all"
        style={
          editedCosmetics[colorKey] &&
          !COLOR_OPTIONS.some((c) => c.value === editedCosmetics[colorKey])
            ? { backgroundColor: editedCosmetics[colorKey] }
            : {}
        }
      >
        <Input
          type="color"
          value={editedCosmetics[colorKey] || '#a855f7'}
          onChange={(e) => setEditedCosmetics((prev) => ({ ...prev, [colorKey]: e.target.value }))}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        />
        {(!editedCosmetics[colorKey] ||
          COLOR_OPTIONS.some((c) => c.value === editedCosmetics[colorKey])) && (
          <Paintbrush className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </label>
    </div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="flex flex-col">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Your Characters</CardTitle>
            <div className="flex items-center gap-2">
              <AdminUserList />
              <AdminCharacterList />
            </div>
          </CardHeader>
          <CardContent>
            {characters === undefined ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : !characters || characters.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-lg border border-dashed border-border/50">
                <Shield className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No heroes yet.</p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  Create your first character to begin your journey.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {characters.map((character) => {
                  const cosmetics = resolveCosmeticsStyles(character.cosmetics)
                  return (
                    <li
                      key={character._id}
                      className={cn(
                        'flex flex-col cursor-pointer hover:bg-muted/50 p-3 rounded-md transition-colors border border-transparent',
                        cosmetics.cardClassName
                      )}
                      style={cosmetics.cardStyle}
                      onClick={() => openDetailsDialog(character)}
                    >
                      <div className="flex justify-between items-center w-full">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn('font-medium', cosmetics.nameClassName)}
                              style={cosmetics.nameStyle}
                            >
                              {character.name}
                            </span>
                            <a
                              href={`https://void.tarragon.be/Player-Characters/${character.name.replace(/\s+/g, '-')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-purple-500"
                            >
                              <Book size={16} />
                            </a>
                          </div>
                          <span
                            className={cosmetics.subtitleClassName}
                            style={cosmetics.subtitleStyle}
                          >
                            {character.ancestry} {character.class}
                          </span>
                          {character.websiteLink && (
                            <a
                              href={character.websiteLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-blue-500 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {character.websiteLink}
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
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
                href="https://void.tarragon.be/_META/_getting_started"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('help_getting_started_clicked')}
              >
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <CircleHelp className="h-5 w-5" />
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* World Management Actions */}
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

      {selectedCharacter && (
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedCharacter.name}</span>
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <CharacterRankIcon rank={selectedCharacter.rank} />
                {selectedCharacter.system && (
                  <img
                    src={selectedCharacter.system === 'PF' ? '/PFVoid.svg' : '/DnDVoid.svg'}
                    alt={selectedCharacter.system}
                    className="h-4 w-4"
                  />
                )}
                <span
                  className="inline-flex align-middle justify-center w-14 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
                  style={getLevelBadgeStyle(selectedCharacter.lvl)}
                >
                  Lvl {selectedCharacter.lvl}
                </span>
                <span>{selectedCharacter.xp} XP</span>
              </DialogDescription>
            </DialogHeader>

            {/* Navigation Tabs */}
            <div className="flex border-b border-border mb-4">
              <button
                type="button"
                className={cn(
                  'px-4 py-2 text-sm font-semibold border-b-2 transition-colors',
                  activeTab === 'general'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
                onClick={() => setActiveTab('general')}
              >
                General Info
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
                Cosmetics & Calling Card
              </button>
            </div>

            <form onSubmit={handleUpdateCharacter} className="flex flex-col gap-4">
              {activeTab === 'general' ? (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">System</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={editedCharacterData.system}
                      onChange={(e) =>
                        setEditedCharacterData({
                          ...editedCharacterData,
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
                      value={editedCharacterData.name}
                      onChange={(e) =>
                        setEditedCharacterData({ ...editedCharacterData, name: e.target.value })
                      }
                      placeholder="Character Name"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Ancestry</label>
                    <Input
                      value={editedCharacterData.ancestry}
                      onChange={(e) =>
                        setEditedCharacterData({ ...editedCharacterData, ancestry: e.target.value })
                      }
                      placeholder="Ancestry"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Class</label>
                    <Input
                      value={editedCharacterData.class}
                      onChange={(e) =>
                        setEditedCharacterData({ ...editedCharacterData, class: e.target.value })
                      }
                      placeholder="Class"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Website Link</label>
                    <Input
                      value={editedCharacterData.websiteLink}
                      onChange={(e) =>
                        setEditedCharacterData({
                          ...editedCharacterData,
                          websiteLink: e.target.value,
                        })
                      }
                      placeholder="Website Link"
                    />
                  </div>
                </>
              ) : (
                /* SINGLE COLUMN LIST CUSTOMIZER */
                <div className="flex flex-col gap-6">
                  {/* Live Calling Card Preview with "YOU" badge */}
                  <div className="p-4 rounded-xl bg-muted/30 border border-dashed border-border/70 space-y-2">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                        Calling Card Live Preview
                      </span>
                      <span className="text-[10px] bg-purple-500/20 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-full font-bold">
                        Attending List Style
                      </span>
                    </div>

                    {(() => {
                      const prev = resolveCosmeticsStyles(editedCosmetics)
                      return (
                        <div
                          className={cn(
                            'flex items-center justify-between p-4 rounded-lg transition-all gap-3 border',
                            prev.cardClassName || 'bg-muted/20 border-border'
                          )}
                          style={prev.cardStyle}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold text-xs shrink-0',
                                prev.profileRingClassName
                              )}
                            >
                              {editedCharacterData.name.charAt(0) || 'C'}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold flex items-center gap-2 flex-wrap">
                                <span className={prev.nameClassName} style={prev.nameStyle}>
                                  {editedCharacterData.name || 'Character Name'}
                                </span>
                                <span className="text-[10px] bg-purple-200 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold shrink-0">
                                  You
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                <span
                                  className={prev.subtitleClassName}
                                  style={prev.subtitleStyle}
                                >
                                  {editedCharacterData.ancestry || 'Ancestry'}{' '}
                                  {editedCharacterData.class || 'Class'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <CharacterRankIcon rank={selectedCharacter.rank} />
                            <span
                              className="inline-flex align-middle justify-center w-14 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
                              style={getLevelBadgeStyle(selectedCharacter.lvl)}
                            >
                              Lvl {selectedCharacter.lvl}
                            </span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* 1. Name Font */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold flex items-center gap-1.5">
                      <Type className="h-4 w-4 text-purple-500" />
                      Name Font
                    </label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
                      value={editedCosmetics.nameFont || 'default'}
                      onChange={(e) => {
                        const opt = FONT_OPTIONS.find((f) => f.id === e.target.value)
                        if (opt) handleSelectOption('nameFont', opt)
                      }}
                    >
                      {FONT_OPTIONS.map((f) => {
                        const { isUnlocked, isHidden, title } = getOptionLockStatus(f)
                        return (
                          <option key={f.id} value={f.id} disabled={!isUnlocked}>
                            {isUnlocked
                              ? f.name
                              : isHidden
                                ? `🔒 ${f.name} (Secret Achievement)`
                                : `🔒 ${f.name} (Requires: ${title})`}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  {/* 2. Subtitle Font */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold flex items-center gap-1.5">
                      <Type className="h-4 w-4 text-purple-400" />
                      Subtitle Font
                    </label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
                      value={editedCosmetics.subtitleFont || 'default'}
                      onChange={(e) => {
                        const opt = FONT_OPTIONS.find((f) => f.id === e.target.value)
                        if (opt) handleSelectOption('subtitleFont', opt)
                      }}
                    >
                      {FONT_OPTIONS.map((f) => {
                        const { isUnlocked, isHidden, title } = getOptionLockStatus(f)
                        return (
                          <option key={f.id} value={f.id} disabled={!isUnlocked}>
                            {isUnlocked
                              ? f.name
                              : isHidden
                                ? `🔒 ${f.name} (Secret Achievement)`
                                : `🔒 ${f.name} (Requires: ${title})`}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  {/* 3. Name Color Swatches Row */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold flex items-center gap-1.5">
                      <Palette className="h-4 w-4 text-purple-500" />
                      Name Color
                    </label>
                    {renderColorSwatches('nameColor')}
                  </div>

                  {/* 4. Subtitle Color Swatches Row */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold flex items-center gap-1.5">
                      <Palette className="h-4 w-4 text-purple-400" />
                      Subtitle Color
                    </label>
                    {renderColorSwatches('subtitleColor')}
                  </div>

                  {/* 5. Card Border Effect & Shape - Single Column List */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold flex items-center gap-1.5">
                      <Frame className="h-4 w-4 text-amber-500" />
                      Card Border Effect & Shape
                    </label>
                    <div className="flex flex-col gap-2">
                      {BORDER_SHAPE_OPTIONS.map((opt) => {
                        const { isUnlocked, label, badgeLabel } = getOptionLockStatus(opt)
                        const isSelected = editedCosmetics.borderShape === opt.id

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectOption('borderShape', opt)}
                            title={!isUnlocked ? label : opt.name}
                            className={cn(
                              'w-full p-3 rounded-lg text-left text-xs transition-all flex items-center justify-between',
                              opt.value,
                              isSelected
                                ? 'bg-purple-500/15 border-purple-500 font-bold ring-1 ring-purple-500 text-foreground'
                                : isUnlocked
                                  ? 'bg-card hover:bg-muted/40 text-foreground'
                                  : 'bg-muted/20 text-muted-foreground opacity-50 grayscale cursor-not-allowed'
                            )}
                          >
                            <span className="font-semibold">{opt.name}</span>
                            {!isUnlocked && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                                <Lock className="h-3 w-3" />
                                {badgeLabel}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Custom Card Border Color */}
                  <div className="flex items-center gap-2 pt-1">
                    <label className="text-xs text-muted-foreground font-medium shrink-0">
                      Custom Card Border Color:
                    </label>
                    <Input
                      type="color"
                      value={editedCosmetics.borderColor || '#3b82f6'}
                      onChange={(e) =>
                        setEditedCosmetics((prev) => ({
                          ...prev,
                          borderColor: e.target.value,
                        }))
                      }
                      className="h-8 w-12 p-0.5 cursor-pointer"
                    />
                    {editedCosmetics.borderColor && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-[10px]"
                        onClick={() => setEditedCosmetics((prev) => ({ ...prev, borderColor: '' }))}
                      >
                        Clear Color
                      </Button>
                    )}
                  </div>

                  {/* 6. Profile Avatar Ring - Single Column List */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold flex items-center gap-1.5">
                      <Circle className="h-4 w-4 text-emerald-500" />
                      Profile Avatar Ring
                    </label>
                    <div className="flex flex-col gap-2">
                      {PROFILE_BORDER_OPTIONS.map((opt) => {
                        const { isUnlocked, label, badgeLabel } = getOptionLockStatus(opt)
                        const isSelected = editedCosmetics.profileBorder === opt.id

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectOption('profileBorder', opt)}
                            title={!isUnlocked ? label : opt.name}
                            className={cn(
                              'w-full p-2.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between',
                              isSelected
                                ? 'border-purple-500 bg-purple-500/10 font-bold ring-1 ring-purple-500'
                                : isUnlocked
                                  ? 'border-border bg-card hover:bg-muted/40'
                                  : 'border-border/40 bg-muted/20 opacity-50 grayscale cursor-not-allowed'
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={cn(
                                  'w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center font-bold text-[10px]',
                                  opt.value
                                )}
                              >
                                C
                              </div>
                              <span className="font-semibold">{opt.name}</span>
                            </div>
                            {!isUnlocked && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                                <Lock className="h-3 w-3" />
                                {badgeLabel}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 7. Card Background Color / Tint - Single Column List */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold flex items-center gap-1.5">
                      <Paintbrush className="h-4 w-4 text-blue-500" />
                      Card Background Tint
                    </label>
                    <div className="flex flex-col gap-2">
                      {BG_COLOR_OPTIONS.map((opt) => {
                        const { isUnlocked, label, badgeLabel } = getOptionLockStatus(opt)
                        const isSelected = editedCosmetics.bgColor === opt.id

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectOption('bgColor', opt)}
                            title={!isUnlocked ? label : opt.name}
                            className={cn(
                              'w-full p-3 rounded-lg text-left text-xs transition-all flex items-center justify-between border',
                              isSelected
                                ? 'border-2 border-purple-500 ring-1 ring-purple-500 font-bold text-foreground'
                                : isUnlocked
                                  ? 'border-border hover:border-muted-foreground'
                                  : 'border-border/40 opacity-50 grayscale cursor-not-allowed'
                            )}
                            style={{
                              backgroundColor: opt.value ? opt.value : 'transparent',
                            }}
                          >
                            <span className="font-semibold">{opt.name}</span>
                            {!isUnlocked && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                                <Lock className="h-3 w-3" />
                                {badgeLabel}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter className="mt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete {selectedCharacter.name}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteCharacter}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Character'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
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
    </div>
  )
}
