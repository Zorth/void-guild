'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { FormEvent, useMemo, useState } from 'react'
import { Doc } from '@/convex/_generated/dataModel'
import { Search, Shield, User, Skull, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

export default function AdminCharacterList() {
  // All hooks must be called unconditionally at the top level
  const isAdmin = useQuery(api.sessions.isAdminQuery)
  const allCharacters = useQuery(api.characters.listAllCharacters, !!isAdmin ? undefined : "skip")
  const allWorlds = useQuery(api.worlds.getAllWorlds, !!isAdmin ? undefined : "skip")
  const adminUpdateCharacter = useMutation(api.characters.adminUpdateCharacter)

  const sortedWorlds = useMemo(() => {
    if (!allWorlds) return []
    return [...allWorlds].sort((a, b) => a.name.localeCompare(b.name))
  }, [allWorlds])

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCharacter, setSelectedCharacter] = useState<Doc<'characters'> | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [errors, setErrors] = useState<{ name?: string }>({})
  const [editData, setEditData] = useState({
    name: '',
    title: '',
    lvl: 1,
    xp: 0,
    ancestry: '',
    class: '',
    websiteLink: '',
    originWorld: '',
    rank: 'none' as 'none' | 'journeyman' | 'guildmaster',
    system: 'PF' as 'PF' | 'DnD',
    isDead: false,
  })

  // Structured search criteria
  const filteredCharacters = useMemo(() => {
    if (!allCharacters) return []
    const trimmed = searchQuery.trim()
    if (!trimmed) return allCharacters

    // Parse search query into name search and field filters (class, ancestry, player)
    const criteria = {
      nameTerms: [] as string[],
      classTerms: [] as string[],
      ancestryTerms: [] as string[],
      playerTerms: [] as string[],
    }

    const regex = /(?:(\w+):(?:"([^"]*)"|'([^']*)'|([^\s]+)))|(?:"([^"]*)"|'([^']*)'|([^\s]+))/g
    let match: RegExpExecArray | null

    while ((match = regex.exec(trimmed)) !== null) {
      const key = match[1]?.toLowerCase()
      const filterValue = (match[2] ?? match[3] ?? match[4])?.trim()
      const freeText = (match[5] ?? match[6] ?? match[7])?.trim()

      if (key && filterValue) {
        if (key === 'class' || key === 'cls') {
          criteria.classTerms.push(filterValue.toLowerCase())
        } else if (key === 'ancestry' || key === 'race') {
          criteria.ancestryTerms.push(filterValue.toLowerCase())
        } else if (key === 'player' || key === 'user' || key === 'owner') {
          criteria.playerTerms.push(filterValue.toLowerCase())
        } else if (key === 'name') {
          criteria.nameTerms.push(filterValue.toLowerCase())
        } else {
          criteria.nameTerms.push(`${key}:${filterValue}`.toLowerCase())
        }
      } else if (freeText) {
        criteria.nameTerms.push(freeText.toLowerCase())
      }
    }

    const matches = allCharacters.filter((char: any) => {
      const charName = (char.name || '').toLowerCase()
      const charClass = (char.class || '').toLowerCase()
      const charAncestry = (char.ancestry || '').toLowerCase()
      const ownerName = (char.ownerName || '').toLowerCase()
      const ownerUsername = (char.ownerUsername || '').toLowerCase()
      const ownerEmail = (char.ownerEmail || '').toLowerCase()

      // Default: match character name
      if (criteria.nameTerms.length > 0) {
        const matchesName = criteria.nameTerms.every((term) => charName.includes(term))
        if (!matchesName) return false
      }

      // class:<class>
      if (criteria.classTerms.length > 0) {
        const matchesClass = criteria.classTerms.every((term) => charClass.includes(term))
        if (!matchesClass) return false
      }

      // ancestry:<ancestry>
      if (criteria.ancestryTerms.length > 0) {
        const matchesAncestry = criteria.ancestryTerms.every((term) => charAncestry.includes(term))
        if (!matchesAncestry) return false
      }

      // player:<player>
      if (criteria.playerTerms.length > 0) {
        const matchesPlayer = criteria.playerTerms.every(
          (term) =>
            ownerName.includes(term) ||
            ownerUsername.includes(term) ||
            ownerEmail.includes(term)
        )
        if (!matchesPlayer) return false
      }

      return true
    })

    // Sort matching characters: best match first
    return matches.sort((a: any, b: any) => {
      const nameA = (a.name || '').toLowerCase()
      const nameB = (b.name || '').toLowerCase()

      let scoreA = 0
      let scoreB = 0

      for (const term of criteria.nameTerms) {
        if (nameA === term) scoreA += 100
        else if (nameA.startsWith(term)) scoreA += 50
        else if (nameA.includes(` ${term}`) || nameA.includes(`-${term}`)) scoreA += 30
        else scoreA += 10

        if (nameB === term) scoreB += 100
        else if (nameB.startsWith(term)) scoreB += 50
        else if (nameB.includes(` ${term}`) || nameB.includes(`-${term}`)) scoreB += 30
        else scoreB += 10
      }

      const ownerA = (a.ownerName || '').toLowerCase()
      const ownerB = (b.ownerName || '').toLowerCase()
      for (const term of criteria.playerTerms) {
        if (ownerA === term) scoreA += 50
        else if (ownerA.startsWith(term)) scoreA += 25

        if (ownerB === term) scoreB += 50
        else if (ownerB.startsWith(term)) scoreB += 25
      }

      if (scoreB !== scoreA) {
        return scoreB - scoreA
      }

      return (a.name || '').localeCompare(b.name || '')
    })
  }, [allCharacters, searchQuery])

  if (isAdmin === undefined) {
    return <Skeleton className="h-9 w-40" />
  }

  if (!isAdmin) {
    return null
  }

  function openEditDialog(character: Doc<'characters'>) {
    setSelectedCharacter(character)
    setErrors({})
    setEditData({
      name: character.name,
      title: character.title ?? '',
      lvl: character.lvl,
      xp: character.xp,
      ancestry: character.ancestry ?? '',
      class: character.class ?? '',
      websiteLink: character.websiteLink ?? '',
      originWorld: character.originWorld ?? '',
      rank: (character.rank as any) ?? 'none',
      system: (character.system as 'PF' | 'DnD') ?? 'PF',
      isDead: Boolean(character.isDead),
    })
    setIsEditDialogOpen(true)
  }

  async function handleAdminUpdate(event: FormEvent) {
    event.preventDefault()
    if (!selectedCharacter) return

    if (!editData.name.trim()) {
      setErrors({ name: 'Character name is required' })
      return
    }

    try {
      await adminUpdateCharacter({
        characterId: selectedCharacter._id,
        ...editData,
      })
      toast.success(
        selectedCharacter.isDead && !editData.isDead
          ? 'Character resurrected successfully!'
          : 'Character updated successfully'
      )
      setIsEditDialogOpen(false)
      setErrors({})
    } catch (err: any) {
      const message = err.message || 'Failed to update character'
      setErrors({ name: message })
      toast.error(message)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Shield className="h-4 w-4" /> All Characters (Admin)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>All Characters</DialogTitle>
          <DialogDescription>
            Admin view: Edit any character&apos;s details, including level and XP.
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="pt-2 pb-1 space-y-1.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder='Search name, or use class:<class> ancestry:<ancestry> player:<player>...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground px-1">
            <span>Filters:</span>
            <button
              type="button"
              onClick={() => setSearchQuery((prev) => (prev ? `${prev} class:` : 'class:'))}
              className="bg-muted hover:bg-muted/80 text-foreground/80 px-1.5 py-0.5 rounded font-mono transition-colors"
            >
              class:
            </button>
            <button
              type="button"
              onClick={() => setSearchQuery((prev) => (prev ? `${prev} ancestry:` : 'ancestry:'))}
              className="bg-muted hover:bg-muted/80 text-foreground/80 px-1.5 py-0.5 rounded font-mono transition-colors"
            >
              ancestry:
            </button>
            <button
              type="button"
              onClick={() => setSearchQuery((prev) => (prev ? `${prev} player:` : 'player:'))}
              className="bg-muted hover:bg-muted/80 text-foreground/80 px-1.5 py-0.5 rounded font-mono transition-colors"
            >
              player:
            </button>
            <span className="text-muted-foreground/60 italic ml-1">
              (supports quotes e.g. player:&quot;Hubbe P.&quot;)
            </span>
          </div>
        </div>
        
        <div className="overflow-auto flex-grow py-2">
          <div className="space-y-3">
            {allCharacters === undefined ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : filteredCharacters.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No characters found matching &quot;{searchQuery}&quot;
              </div>
            ) : filteredCharacters.map((char: any) => (
              <Card key={char._id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openEditDialog(char)}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                        <p className="font-bold">{char.name}</p>
                        {char.rank === 'guildmaster' && <span className="text-xs text-amber-500 font-bold uppercase tracking-wider">GM</span>}
                        {char.rank === 'journeyman' && <span className="text-xs text-purple-500 font-bold uppercase tracking-wider">JRN</span>}
                        {char.isDead && (
                          <span className="text-xs text-rose-500 font-bold uppercase tracking-wider flex items-center gap-1 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30">
                            <Skull className="h-3 w-3" /> Deceased
                          </span>
                        )}
                    </div>
                    {char.title && (
                      <p className="text-xs text-amber-400/90 italic font-medium">{char.title}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{char.ancestry} {char.class}</p>
                    {char.ownerName && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground/80">
                        <User className="h-3 w-3 inline text-muted-foreground" />
                        <span className="font-medium text-foreground/80">{char.ownerName}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <p className="text-sm font-semibold">Lvl {char.lvl}</p>
                    <p className="text-[10px] text-muted-foreground">{char.xp} XP</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {selectedCharacter && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Character: {selectedCharacter.name}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdminUpdate} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-start gap-4">
                  <label className="text-right text-sm pt-2">Name</label>
                  <div className="col-span-3 space-y-1">
                    <Input
                      className={errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
                      value={editData.name}
                      onChange={(e) => {
                        setEditData({ ...editData, name: e.target.value })
                        if (errors.name) setErrors({ ...errors, name: undefined })
                      }}
                    />
                    {errors.name && (
                      <p className="text-[11px] text-destructive font-medium">{errors.name}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">Title</label>
                  <Input
                    className="col-span-3"
                    placeholder="Title (Admin set)"
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">System</label>
                  <select
                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={editData.system}
                    onChange={(e) => setEditData({ ...editData, system: e.target.value as any })}
                  >
                    <option value="PF">Pathfinder</option>
                    <option value="DnD">Dungeons & Dragons</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">Rank</label>
                  <select
                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={editData.rank}
                    onChange={(e) => setEditData({ ...editData, rank: e.target.value as any })}
                  >
                    <option value="none">None</option>
                    <option value="journeyman">Journeyman</option>
                    <option value="guildmaster">Guildmaster</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">Status</label>
                  <select
                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={editData.isDead ? 'dead' : 'alive'}
                    onChange={(e) => setEditData({ ...editData, isDead: e.target.value === 'dead' })}
                  >
                    <option value="alive">Alive</option>
                    <option value="dead">Deceased (Dead)</option>
                  </select>
                </div>
                {selectedCharacter.isDead && !editData.isDead && (
                  <div className="grid grid-cols-4 items-center gap-4 -mt-2">
                    <div />
                    <p className="col-span-3 text-xs text-emerald-400 font-medium flex items-center gap-1.5 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                      <span>✨</span>
                      <span>Resurrecting this character will restore them to life and re-enable them in the player&apos;s active characters list.</span>
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">Level</label>
                  <Input
                    className="col-span-3"
                    type="number"
                    value={editData.lvl}
                    onChange={(e) => setEditData({ ...editData, lvl: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">XP</label>
                  <Input
                    className="col-span-3"
                    type="number"
                    value={editData.xp}
                    onChange={(e) => setEditData({ ...editData, xp: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">Ancestry</label>
                  <Input
                    className="col-span-3"
                    value={editData.ancestry}
                    onChange={(e) => setEditData({ ...editData, ancestry: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">Class</label>
                  <Input
                    className="col-span-3"
                    value={editData.class}
                    onChange={(e) => setEditData({ ...editData, class: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">Home World</label>
                  <select
                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={editData.originWorld}
                    onChange={(e) => setEditData({ ...editData, originWorld: e.target.value })}
                  >
                    <option value="">Not specified</option>
                    {sortedWorlds.map((w) => (
                      <option key={w._id} value={w.name}>
                        {w.name}
                      </option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">Website</label>
                  <Input
                    className="col-span-3"
                    value={editData.websiteLink}
                    onChange={(e) => setEditData({ ...editData, websiteLink: e.target.value })}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Save Changes</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}
