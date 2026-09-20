'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  Minus, 
  Eye, 
  EyeOff, 
  Handshake, 
  Users, 
  X, 
  FolderPlus, 
  Pencil, 
  ArrowUpDown, 
  ArrowDownAZ, 
  ArrowUpZA, 
  ListOrdered, 
  ArrowDown, 
  ArrowUp, 
  ChevronLeft, 
  ChevronRight, 
  Check 
} from 'lucide-react'
import { cn, getLevelBadgeStyle } from '@/lib/utils'
import { Id } from '@/convex/_generated/dataModel'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { resolveCosmeticsStyles } from '@/lib/cosmetics'
import BlazeTextParticles from '@/components/characters/BlazeTextParticles'

interface ReputationCellProps {
  charId: Id<'characters'>
  faction: string
  worldId: Id<'worlds'>
  value: number
  isOwner: boolean
}

function ReputationCell({
  charId,
  faction,
  worldId,
  value,
  isOwner
}: ReputationCellProps) {
  const updateReputation = useMutation(api.worlds.updateReputation)
  const setReputation = useMutation(api.worlds.setReputation)
  const [editValue, setEditValue] = useState(value.toString())
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  const handleManualSet = async () => {
    const newVal = parseInt(editValue)
    if (!isNaN(newVal)) {
      await setReputation({ worldId, characterId: charId, factionName: faction, value: newVal })
      setIsPopoverOpen(false)
    }
  }

  const numberDisplay = (
    <span className={cn(
      "text-xs font-mono min-w-[3ch] text-center font-bold px-1.5 py-0.5 rounded border border-transparent transition-all",
      isOwner ? "cursor-pointer hover:border-primary/30 hover:bg-primary/5" : "cursor-default",
      value > 0 ? "text-green-600 bg-green-500/10 border-green-500/20" :
      value < 0 ? "text-red-600 bg-red-500/10 border-red-500/20" :
      "text-muted-foreground bg-muted/30 border-muted-foreground/10"
    )}>
      {value}
    </span>
  )

  if (!isOwner) {
    return <div className="h-7 flex items-center justify-center">{numberDisplay}</div>
  }

  return (
    <div className="flex items-center justify-center gap-1 group/cell h-7">
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 hover:bg-red-500/15 hover:text-red-500 text-muted-foreground/70 shrink-0"
        onClick={() => updateReputation({ worldId, characterId: charId, factionName: faction, delta: -1 })}
      >
        <Minus className="h-3 w-3" />
      </Button>

      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <button onClick={() => setEditValue(value.toString())}>
            {numberDisplay}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-24 p-2">
          <div className="flex flex-col gap-2">
            <Input
              type="number"
              className="h-7 text-xs text-center px-1"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSet()}
              autoFocus
            />
            <Button size="sm" className="h-6 text-[10px]" onClick={handleManualSet}>Save</Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 hover:bg-green-500/15 hover:text-green-500 text-muted-foreground/70 shrink-0"
        onClick={() => updateReputation({ worldId, characterId: charId, factionName: faction, delta: 1 })}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  )
}

interface ReputationSystemProps {
    worldId: Id<'worlds'>
    worldName: string
    charactersInSession?: Id<'characters'>[]
    titleOverride?: string
}

export default function ReputationSystem({
    worldId,
    worldName,
    charactersInSession,
    titleOverride
}: ReputationSystemProps) {
    const data = useQuery(api.worlds.getReputationData, { worldName })
    const sessions = useQuery(api.worlds.getSessionsByWorld, charactersInSession ? "skip" : (worldId ? { worldId } : "skip"))
    const toggleVisibility = useMutation(api.worlds.toggleReputationVisibility)
    const addFaction = useMutation(api.worlds.addFaction)
    const removeFaction = useMutation(api.worlds.removeFaction)
    const renameFaction = useMutation(api.worlds.renameFaction)
    const addFactionGroup = useMutation(api.worlds.addFactionGroup)
    const removeFactionGroup = useMutation(api.worlds.removeFactionGroup)
    const editFactionGroup = useMutation(api.worlds.editFactionGroup)
    const reorderFactions = useMutation(api.worlds.reorderFactions)

    const [groupFilter, setGroupFilter] = useState<string>('all')

    // Add Faction popover state
    const [addFactionOpen, setAddFactionOpen] = useState(false)
    const [newFactionName, setNewFactionName] = useState('')

    // Rename Faction popover state
    const [editingFactionName, setEditingFactionName] = useState<string | null>(null)
    const [newNameForFaction, setNewNameForFaction] = useState('')

    // Add Group popover state
    const [addGroupOpen, setAddGroupOpen] = useState(false)
    const [newGroupName, setNewGroupName] = useState('')
    const [newGroupFactions, setNewGroupFactions] = useState<string[]>([])

    // Edit Group popover state
    const [editingGroupName, setEditingGroupName] = useState<string | null>(null)
    const [editGroupName, setEditGroupName] = useState('')
    const [editGroupFactions, setEditGroupFactions] = useState<string[]>([])

    // Faction Sorting state
    const [factionSort, setFactionSort] = useState<'manual' | 'alpha-asc' | 'alpha-desc'>('manual')
    const [factionSortOpen, setFactionSortOpen] = useState(false)

    // Character Sorting state
    type CharacterSort =
        | { type: 'level'; direction: 'desc' | 'asc' }
        | { type: 'alphabetical'; direction: 'asc' | 'desc' }
        | { type: 'faction'; faction: string; direction: 'desc' | 'asc' }

    const [characterSort, setCharacterSort] = useState<CharacterSort>({ type: 'level', direction: 'desc' })

    const characterIds = useMemo(() => {
        if (charactersInSession) return charactersInSession
        if (!sessions) return []

        const ids = new Set<Id<'characters'>>()
        sessions.forEach(s => s.characters.forEach(id => ids.add(id)))
        return Array.from(ids)
    }, [sessions, charactersInSession])

    const charactersRaw = useQuery(api.characters.getCharactersByIds, characterIds.length > 0 ? { ids: characterIds } : 'skip')

    const factions = (data?.factions || []) as string[]
    const factionGroups = (data?.factionGroups || []) as { name: string, factions: string[] }[]
    const reputations = (data?.reputations || []) as any[]
    const isOwner = data?.isOwner ?? false
    const isVisible = data?.isVisible ?? false

    const repMap = useMemo(() => {
        const map = new Map<string, number>()
        reputations.forEach(r => {
            map.set(`${r.characterId}:${r.factionName}`, r.value)
        })
        return map
    }, [reputations])

    const activeGroup = factionGroups.find(g => g.name === groupFilter)
    const rawDisplayedFactions = groupFilter === 'all' ? factions : (activeGroup?.factions || [])

    const displayedFactions = useMemo(() => {
        if (factionSort === 'alpha-asc') {
            return [...rawDisplayedFactions].sort((a, b) => a.localeCompare(b))
        }
        if (factionSort === 'alpha-desc') {
            return [...rawDisplayedFactions].sort((a, b) => b.localeCompare(a))
        }
        return rawDisplayedFactions
    }, [rawDisplayedFactions, factionSort])

    const getRepValue = (charId: Id<'characters'>, faction: string) => {
        return repMap.get(`${charId}:${faction}`) ?? 0
    }

    const sortedCharacters = useMemo(() => {
        if (!charactersRaw) return []
        return [...charactersRaw].sort((a, b) => {
            if (characterSort.type === 'level') {
                const diff = characterSort.direction === 'desc' ? b.lvl - a.lvl : a.lvl - b.lvl
                if (diff !== 0) return diff
                return a.name.localeCompare(b.name)
            }
            if (characterSort.type === 'alphabetical') {
                const diff = characterSort.direction === 'asc'
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name)
                if (diff !== 0) return diff
                return b.lvl - a.lvl
            }
            if (characterSort.type === 'faction') {
                const repA = getRepValue(a._id, characterSort.faction)
                const repB = getRepValue(b._id, characterSort.faction)
                const diff = characterSort.direction === 'desc' ? repB - repA : repA - repB
                if (diff !== 0) return diff
                if (b.lvl !== a.lvl) return b.lvl - a.lvl
                return a.name.localeCompare(b.name)
            }
            return 0
        })
    }, [charactersRaw, characterSort, repMap])

    const handleAddFaction = async () => {
        const name = newFactionName.trim()
        if (!name) return
        if (factions.includes(name)) {
            toast.error('Faction already exists.')
            return
        }
        try {
            await addFaction({ worldId, name })
            setNewFactionName('')
            setAddFactionOpen(false)
            toast.success(`Faction "${name}" added.`)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to add faction.')
        }
    }

    const handleRenameFaction = async (oldName: string) => {
        const trimmed = newNameForFaction.trim()
        if (!trimmed) {
            toast.error('Faction name cannot be empty.')
            return
        }
        if (trimmed === oldName) {
            setEditingFactionName(null)
            return
        }
        if (factions.includes(trimmed)) {
            toast.error('A faction with this name already exists.')
            return
        }
        try {
            await renameFaction({ worldId, oldName, newName: trimmed })
            if (characterSort.type === 'faction' && characterSort.faction === oldName) {
                setCharacterSort({ type: 'faction', faction: trimmed, direction: characterSort.direction })
            }
            setEditingFactionName(null)
            toast.success(`Faction renamed to "${trimmed}".`)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to rename faction.')
        }
    }

    const handleRemoveFaction = async (name: string) => {
        if (!confirm(`Remove faction "${name}" and all its reputation data?`)) return
        try {
            await removeFaction({ worldId, name })
            if (characterSort.type === 'faction' && characterSort.faction === name) {
                setCharacterSort({ type: 'level', direction: 'desc' })
            }
            toast.success(`Faction "${name}" removed.`)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to remove faction.')
        }
    }

    const handleMoveFaction = async (faction: string, direction: 'left' | 'right') => {
        const idx = factions.indexOf(faction)
        if (idx === -1) return
        const targetIdx = direction === 'left' ? idx - 1 : idx + 1
        if (targetIdx < 0 || targetIdx >= factions.length) return

        const newFactions = [...factions]
        const [moved] = newFactions.splice(idx, 1)
        newFactions.splice(targetIdx, 0, moved)

        try {
            await reorderFactions({ worldId, factions: newFactions })
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to reorder factions.')
        }
    }

    const handleAddGroup = async () => {
        const name = newGroupName.trim()
        if (!name) return
        if (factionGroups.some(g => g.name === name)) {
            toast.error('Group already exists.')
            return
        }
        try {
            await addFactionGroup({ worldId, name, factions: newGroupFactions })
            setNewGroupName('')
            setNewGroupFactions([])
            setAddGroupOpen(false)
            toast.success(`Group "${name}" created.`)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to create group.')
        }
    }

    const handleSaveEditGroup = async (oldName: string) => {
        const trimmed = editGroupName.trim()
        if (!trimmed) {
            toast.error('Group name cannot be empty.')
            return
        }
        if (trimmed !== oldName && factionGroups.some(g => g.name === trimmed)) {
            toast.error('A group with this name already exists.')
            return
        }
        try {
            await editFactionGroup({
                worldId,
                oldName,
                newName: trimmed,
                factions: editGroupFactions,
            })
            if (groupFilter === oldName) {
                setGroupFilter(trimmed)
            }
            setEditingGroupName(null)
            toast.success(`Group "${trimmed}" updated.`)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to update group.')
        }
    }

    const handleRemoveGroup = async (name: string) => {
        try {
            await removeFactionGroup({ worldId, name })
            if (groupFilter === name) setGroupFilter('all')
            toast.success(`Group "${name}" removed.`)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to remove group.')
        }
    }

    if (data !== undefined && !isOwner && !isVisible) return null
    if (!data || !sessions) return null

    return (
        <Card className="flex flex-col bg-card/50 relative group border-border/40 gap-0 py-0 overflow-hidden mt-8">
            <CardHeader className="flex flex-row items-center justify-between px-6 py-2 border-b border-border/50 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Handshake className="h-4 w-4 text-primary" />
                    {titleOverride || "World Reputation"}
                </CardTitle>
                <div className="flex items-center gap-2">
                    {isOwner && (
                        <>
                            {/* Add Faction */}
                            <Popover open={addFactionOpen} onOpenChange={setAddFactionOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-1.5 h-7 px-2 text-muted-foreground hover:text-primary"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        <span className="text-xs">Add Faction</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-52 p-3" align="end">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">New Faction</span>
                                        <Input
                                            className="h-7 text-xs"
                                            placeholder="Faction name…"
                                            value={newFactionName}
                                            onChange={(e) => setNewFactionName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddFaction()}
                                            autoFocus
                                        />
                                        <Button size="sm" className="h-7 text-xs" onClick={handleAddFaction}>
                                            Add
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {/* Add Group */}
                            <Popover open={addGroupOpen} onOpenChange={(open) => {
                                setAddGroupOpen(open)
                                if (!open) { setNewGroupName(''); setNewGroupFactions([]) }
                            }}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-1.5 h-7 px-2 text-muted-foreground hover:text-primary"
                                    >
                                        <FolderPlus className="h-3.5 w-3.5" />
                                        <span className="text-xs">Add Group</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-60 p-3" align="end">
                                    <div className="flex flex-col gap-3">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">New Group</span>
                                        <Input
                                            className="h-7 text-xs"
                                            placeholder="Group name…"
                                            value={newGroupName}
                                            onChange={(e) => setNewGroupName(e.target.value)}
                                        />
                                        {factions.length > 0 && (
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Include Factions</span>
                                                {factions.map(f => (
                                                    <label key={f} className="flex items-center gap-2 cursor-pointer text-xs">
                                                        <Checkbox
                                                            checked={newGroupFactions.includes(f)}
                                                            onCheckedChange={(checked) => {
                                                                setNewGroupFactions(prev =>
                                                                    checked ? [...prev, f] : prev.filter(x => x !== f)
                                                                )
                                                            }}
                                                        />
                                                        {f}
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                        <Button size="sm" className="h-7 text-xs" onClick={handleAddGroup}>
                                            Create Group
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {/* Visibility toggle */}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2 transition-opacity h-7 px-2 text-muted-foreground hover:text-primary"
                                onClick={() => toggleVisibility({ worldId })}
                            >
                                {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                <span className="text-xs">{isVisible ? "Public" : "Private"}</span>
                            </Button>
                        </>
                    )}
                </div>
            </CardHeader>
            <CardContent className="px-0 py-0 relative">
                <div className="bg-muted/30 px-6 py-2 border-b border-border/50 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">Factions:</span>
                        <div className="flex items-center flex-wrap gap-1">
                            <Button
                                variant={groupFilter === 'all' ? "secondary" : "ghost"}
                                size="sm"
                                className="h-6 px-2 text-[10px] font-bold"
                                onClick={() => setGroupFilter('all')}
                            >
                                All
                            </Button>
                            {factionGroups.map(group => (
                                <div key={group.name} className="flex items-center bg-muted/40 rounded border border-border/30 px-0.5">
                                    <Button
                                        variant={groupFilter === group.name ? "secondary" : "ghost"}
                                        size="sm"
                                        className="h-6 px-2 text-[10px] font-bold"
                                        onClick={() => setGroupFilter(group.name)}
                                    >
                                        {group.name}
                                    </Button>
                                    {isOwner && (
                                        <div className="flex items-center gap-0.5 pr-0.5">
                                            {/* Edit Group Popover */}
                                            <Popover
                                                open={editingGroupName === group.name}
                                                onOpenChange={(open) => {
                                                    if (open) {
                                                        setEditingGroupName(group.name)
                                                        setEditGroupName(group.name)
                                                        setEditGroupFactions([...group.factions])
                                                    } else {
                                                        setEditingGroupName(null)
                                                    }
                                                }}
                                            >
                                                <PopoverTrigger asChild>
                                                    <button
                                                        className="h-4 w-4 flex items-center justify-center text-muted-foreground/50 hover:text-primary transition-colors rounded"
                                                        title={`Edit group "${group.name}"`}
                                                    >
                                                        <Pencil className="h-2.5 w-2.5" />
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-64 p-3" align="start">
                                                    <div className="flex flex-col gap-3">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Edit Group</span>
                                                        <Input
                                                            className="h-7 text-xs"
                                                            placeholder="Group name…"
                                                            value={editGroupName}
                                                            onChange={(e) => setEditGroupName(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEditGroup(group.name)}
                                                        />
                                                        {factions.length > 0 && (
                                                            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Included Factions</span>
                                                                {factions.map(f => (
                                                                    <label key={f} className="flex items-center gap-2 cursor-pointer text-xs">
                                                                        <Checkbox
                                                                            checked={editGroupFactions.includes(f)}
                                                                            onCheckedChange={(checked) => {
                                                                                setEditGroupFactions(prev =>
                                                                                    checked ? [...prev, f] : prev.filter(x => x !== f)
                                                                                )
                                                                            }}
                                                                        />
                                                                        <span className="truncate">{f}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <div className="flex justify-end gap-1.5 mt-1">
                                                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditingGroupName(null)}>
                                                                Cancel
                                                            </Button>
                                                            <Button size="sm" className="h-6 px-2 text-xs" onClick={() => handleSaveEditGroup(group.name)}>
                                                                Save
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>

                                            {/* Remove Group Button */}
                                            <button
                                                className="h-4 w-4 flex items-center justify-center text-muted-foreground/50 hover:text-destructive transition-colors rounded"
                                                title={`Remove group "${group.name}"`}
                                                onClick={() => handleRemoveGroup(group.name)}
                                            >
                                                <X className="h-2.5 w-2.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Sort controls & indicators */}
                    <div className="flex items-center gap-2 ml-auto shrink-0">
                        {/* Character sort indicator / quick reset */}
                        {(characterSort.type !== 'level' || characterSort.direction !== 'desc') && (
                            <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 rounded px-2 py-0.5 text-[10px] text-primary">
                                <span className="font-semibold">Sort:</span>
                                <span className="truncate max-w-[120px]">
                                    {characterSort.type === 'level'
                                        ? `Level (${characterSort.direction === 'desc' ? 'High to Low' : 'Low to High'})`
                                        : characterSort.type === 'alphabetical'
                                        ? `Name (${characterSort.direction === 'asc' ? 'A-Z' : 'Z-A'})`
                                        : `${characterSort.faction} (${characterSort.direction === 'desc' ? 'High to Low' : 'Low to High'})`}
                                </span>
                                <button
                                    onClick={() => setCharacterSort({ type: 'level', direction: 'desc' })}
                                    className="hover:text-primary-foreground hover:bg-primary/20 rounded p-0.5 ml-0.5 transition-colors"
                                    title="Reset to default (Level High to Low)"
                                >
                                    <X className="h-2.5 w-2.5" />
                                </button>
                            </div>
                        )}

                        {/* Faction Sort Mode Icon / Popover */}
                        <Popover open={factionSortOpen} onOpenChange={setFactionSortOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 px-2 gap-1 text-[10px] font-bold border-border/50 bg-background/50 hover:bg-muted"
                                    title="Sort Factions"
                                >
                                    {factionSort === 'manual' ? (
                                        <ListOrdered className="h-3 w-3 text-primary" />
                                    ) : factionSort === 'alpha-asc' ? (
                                        <ArrowDownAZ className="h-3 w-3 text-primary" />
                                    ) : (
                                        <ArrowUpZA className="h-3 w-3 text-primary" />
                                    )}
                                    <span className="hidden sm:inline">
                                        {factionSort === 'manual' ? "Manual" : factionSort === 'alpha-asc' ? "Factions: A-Z" : "Factions: Z-A"}
                                    </span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-44 p-1.5" align="end">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">Sort Factions</span>
                                    <Button
                                        variant={factionSort === 'manual' ? "secondary" : "ghost"}
                                        size="sm"
                                        className="h-7 justify-start gap-2 text-xs font-normal"
                                        onClick={() => { setFactionSort('manual'); setFactionSortOpen(false) }}
                                    >
                                        <ListOrdered className="h-3.5 w-3.5 text-primary" />
                                        <span>Manual Order</span>
                                        {factionSort === 'manual' && <Check className="h-3 w-3 ml-auto text-primary" />}
                                    </Button>
                                    <Button
                                        variant={factionSort === 'alpha-asc' ? "secondary" : "ghost"}
                                        size="sm"
                                        className="h-7 justify-start gap-2 text-xs font-normal"
                                        onClick={() => { setFactionSort('alpha-asc'); setFactionSortOpen(false) }}
                                    >
                                        <ArrowDownAZ className="h-3.5 w-3.5 text-primary" />
                                        <span>Alphabetical (A-Z)</span>
                                        {factionSort === 'alpha-asc' && <Check className="h-3 w-3 ml-auto text-primary" />}
                                    </Button>
                                    <Button
                                        variant={factionSort === 'alpha-desc' ? "secondary" : "ghost"}
                                        size="sm"
                                        className="h-7 justify-start gap-2 text-xs font-normal"
                                        onClick={() => { setFactionSort('alpha-desc'); setFactionSortOpen(false) }}
                                    >
                                        <ArrowUpZA className="h-3.5 w-3.5 text-primary" />
                                        <span>Alphabetical (Z-A)</span>
                                        {factionSort === 'alpha-desc' && <Check className="h-3 w-3 ml-auto text-primary" />}
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <div className="overflow-auto custom-scrollbar max-h-[400px]">
                    <table className="w-full text-left border-collapse min-w-max relative">
                        <thead className="sticky top-0 z-30 shadow-sm">
                            <tr className="border-b border-border/40 bg-muted">
                                <th className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground sticky left-0 bg-muted z-40 backdrop-blur-sm border-r border-border/40 w-[160px] min-w-[140px]">
                                    <div className="flex items-center justify-between gap-1">
                                        <button
                                            className="flex items-center gap-1 hover:text-foreground transition-colors group cursor-pointer"
                                            onClick={() => {
                                                if (characterSort.type === 'level') {
                                                    setCharacterSort({
                                                        type: 'level',
                                                        direction: characterSort.direction === 'desc' ? 'asc' : 'desc'
                                                    })
                                                } else {
                                                    setCharacterSort({ type: 'level', direction: 'desc' })
                                                }
                                            }}
                                            title="Sort by Level"
                                        >
                                            <span>Character</span>
                                            {characterSort.type === 'level' ? (
                                                characterSort.direction === 'desc' ? (
                                                    <ArrowDown className="h-3 w-3 text-primary shrink-0" />
                                                ) : (
                                                    <ArrowUp className="h-3 w-3 text-primary shrink-0" />
                                                )
                                            ) : (
                                                <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
                                            )}
                                        </button>
                                        <button
                                            className={cn(
                                                "p-1 rounded text-[10px] hover:bg-muted-foreground/15 transition-colors",
                                                characterSort.type === 'alphabetical' ? "text-primary font-bold bg-primary/10" : "text-muted-foreground/70 hover:text-foreground"
                                            )}
                                            onClick={() => {
                                                if (characterSort.type === 'alphabetical') {
                                                    setCharacterSort({
                                                        type: 'alphabetical',
                                                        direction: characterSort.direction === 'asc' ? 'desc' : 'asc'
                                                    })
                                                } else {
                                                    setCharacterSort({ type: 'alphabetical', direction: 'asc' })
                                                }
                                            }}
                                            title="Sort by Name (A-Z)"
                                        >
                                            {characterSort.type === 'alphabetical' && characterSort.direction === 'desc' ? (
                                                <ArrowUpZA className="h-3.5 w-3.5" />
                                            ) : (
                                                <ArrowDownAZ className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </th>
                                {displayedFactions.map((faction, idx) => {
                                    const isFactionSorted = characterSort.type === 'faction' && characterSort.faction === faction
                                    const canMoveLeft = isOwner && factionSort === 'manual' && groupFilter === 'all' && idx > 0
                                    const canMoveRight = isOwner && factionSort === 'manual' && groupFilter === 'all' && idx < displayedFactions.length - 1

                                    return (
                                        <th key={faction} className="px-2 py-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground text-center min-w-[100px] max-w-[160px] bg-muted">
                                            <div className="flex items-center justify-center gap-1 group/th">
                                                {/* Move Left button */}
                                                {canMoveLeft && (
                                                    <button
                                                        className="h-3.5 w-3.5 flex items-center justify-center text-muted-foreground/40 hover:text-foreground transition-colors shrink-0 rounded opacity-0 group-hover/th:opacity-100"
                                                        title={`Move "${faction}" left`}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleMoveFaction(faction, 'left')
                                                        }}
                                                    >
                                                        <ChevronLeft className="h-2.5 w-2.5" />
                                                    </button>
                                                )}

                                                {/* Clickable sort by faction reputation */}
                                                <button
                                                    className={cn(
                                                        "flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer truncate max-w-[90px]",
                                                        isFactionSorted ? "text-primary font-bold" : ""
                                                    )}
                                                    title={`Sort by ${faction} reputation`}
                                                    onClick={() => {
                                                        if (isFactionSorted) {
                                                            setCharacterSort({
                                                                type: 'faction',
                                                                faction,
                                                                direction: characterSort.direction === 'desc' ? 'asc' : 'desc'
                                                            })
                                                        } else {
                                                            setCharacterSort({ type: 'faction', faction, direction: 'desc' })
                                                        }
                                                    }}
                                                >
                                                    <span className="truncate">{faction}</span>
                                                    {isFactionSorted ? (
                                                        characterSort.direction === 'desc' ? (
                                                            <ArrowDown className="h-3 w-3 text-primary shrink-0" />
                                                        ) : (
                                                            <ArrowUp className="h-3 w-3 text-primary shrink-0" />
                                                        )
                                                    ) : (
                                                        <ArrowUpDown className="h-2.5 w-2.5 opacity-0 group-hover/th:opacity-60 transition-opacity shrink-0" />
                                                    )}
                                                </button>

                                                {/* Move Right button */}
                                                {canMoveRight && (
                                                    <button
                                                        className="h-3.5 w-3.5 flex items-center justify-center text-muted-foreground/40 hover:text-foreground transition-colors shrink-0 rounded opacity-0 group-hover/th:opacity-100"
                                                        title={`Move "${faction}" right`}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleMoveFaction(faction, 'right')
                                                        }}
                                                    >
                                                        <ChevronRight className="h-2.5 w-2.5" />
                                                    </button>
                                                )}

                                                {/* Faction owner actions: Rename & Delete */}
                                                {isOwner && (
                                                    <div className="flex items-center gap-0.5 shrink-0 ml-0.5">
                                                        {/* Rename Faction Popover */}
                                                        <Popover
                                                            open={editingFactionName === faction}
                                                            onOpenChange={(open) => {
                                                                if (open) {
                                                                    setEditingFactionName(faction)
                                                                    setNewNameForFaction(faction)
                                                                } else {
                                                                    setEditingFactionName(null)
                                                                }
                                                            }}
                                                        >
                                                            <PopoverTrigger asChild>
                                                                <button
                                                                    className="h-3.5 w-3.5 flex items-center justify-center text-muted-foreground/40 hover:text-primary transition-colors shrink-0 rounded"
                                                                    title={`Rename faction "${faction}"`}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <Pencil className="h-2.5 w-2.5" />
                                                                </button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-56 p-3" align="center" onClick={(e) => e.stopPropagation()}>
                                                                <div className="flex flex-col gap-2">
                                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rename Faction</span>
                                                                    <Input
                                                                        className="h-7 text-xs"
                                                                        value={newNameForFaction}
                                                                        onChange={(e) => setNewNameForFaction(e.target.value)}
                                                                        onKeyDown={(e) => e.key === 'Enter' && handleRenameFaction(faction)}
                                                                        autoFocus
                                                                    />
                                                                    <div className="flex justify-end gap-1.5 mt-1">
                                                                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditingFactionName(null)}>
                                                                            Cancel
                                                                        </Button>
                                                                        <Button size="sm" className="h-6 px-2 text-xs" onClick={() => handleRenameFaction(faction)}>
                                                                            Save
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>

                                                        {groupFilter === 'all' && (
                                                            <button
                                                                className="h-3.5 w-3.5 flex items-center justify-center text-muted-foreground/40 hover:text-destructive transition-colors shrink-0 rounded"
                                                                title={`Remove faction "${faction}"`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleRemoveFaction(faction)
                                                                }}
                                                            >
                                                                <X className="h-2.5 w-2.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </th>
                                    )
                                })}
                            </tr>
                        </thead>
                        <tbody className="relative z-10">
                            {sortedCharacters.length > 0 ? (
                                sortedCharacters.map(char => {
                                    const cosmetics = resolveCosmeticsStyles(char.cosmetics)
                                    return (
                                     <tr key={char._id} className="border-b border-border/30 hover:bg-primary/5 transition-colors">
                                         <td className="px-4 py-2.5 sticky left-0 bg-card z-20 backdrop-blur-sm border-r border-border/40 w-[160px] min-w-[140px]">
                                             <div className="flex flex-col gap-0.5 min-w-0">
                                                 <div className="flex items-center flex-wrap gap-2 min-w-0">
                                                     <span className={cn("font-bold text-sm tracking-tight break-words relative", cosmetics.nameClassName)} style={cosmetics.nameStyle}>
                                                         {cosmetics.nameClassName?.includes('blaze-fire-text') && <BlazeTextParticles />}
                                                         {char.name}
                                                     </span>
                                                     <span
                                                         className="inline-flex items-center justify-center rounded-full w-4 h-4 text-[8px] font-bold shrink-0"
                                                         style={getLevelBadgeStyle(char.lvl)}
                                                     >
                                                         {char.lvl}
                                                     </span>
                                                 </div>
                                                 {char.title && (
                                                     <span className={cn("text-[9px] whitespace-normal relative", cosmetics.titleClassName)} style={cosmetics.titleStyle}>
                                                         {cosmetics.titleClassName?.includes('blaze-fire-text') && <BlazeTextParticles />}
                                                         {char.title}
                                                     </span>
                                                 )}
                                                 <span className={cn("text-[9px] text-muted-foreground uppercase tracking-widest font-medium whitespace-normal relative", cosmetics.subtitleClassName)} style={cosmetics.subtitleStyle}>
                                                     {cosmetics.subtitleClassName?.includes('blaze-fire-text') && <BlazeTextParticles />}
                                                     {char.class}
                                                 </span>
                                             </div>
                                         </td>
                                        {displayedFactions.map(faction => (
                                            <td key={faction} className="px-2 py-2.5 align-middle bg-card/50 text-center">
                                                <ReputationCell
                                                    charId={char._id}
                                                    faction={faction}
                                                    worldId={worldId}
                                                    value={getRepValue(char._id, faction)}
                                                    isOwner={isOwner}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                    )
                                })
                            ) : (
                                <tr>
                                    <td colSpan={displayedFactions.length + 1} className="px-6 py-8 text-center text-sm text-muted-foreground italic">
                                        No characters found for this filter.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
