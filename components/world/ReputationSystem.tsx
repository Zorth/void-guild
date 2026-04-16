'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Minus, Eye, EyeOff, Settings, Handshake, Users } from 'lucide-react'
import { cn, getLevelBadgeStyle } from '@/lib/utils'
import { Id, Doc } from '@/convex/_generated/dataModel'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

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
    return <div className="h-7 flex items-center">{numberDisplay}</div>
  }

  return (
    <div className="flex items-center gap-1 group/cell h-7">
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-5 w-5 hover:bg-red-500/10 hover:text-red-600 opacity-0 group-hover/cell:opacity-100 transition-opacity shrink-0"
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
        className="h-5 w-5 hover:bg-green-500/10 hover:text-green-600 opacity-0 group-hover/cell:opacity-100 transition-opacity shrink-0"
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
    const sessions = useQuery(api.worlds.getSessionsByWorld, { worldId })
    const toggleVisibility = useMutation(api.worlds.toggleReputationVisibility)
    
    const [groupFilter, setGroupFilter] = useState<string>('all')

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

    const getRepValue = (charId: Id<'characters'>, faction: string) => {
        return reputations.find(r => r.characterId === charId && r.factionName === faction)?.value ?? 0
    }

    const sortedCharacters = useMemo(() => {
        if (!charactersRaw) return []
        return [...charactersRaw].sort((a, b) => {
            if (b.lvl !== a.lvl) return b.lvl - a.lvl
            return a.name.localeCompare(b.name)
        })
    }, [charactersRaw])

    if (data !== undefined && !isOwner && !isVisible) return null
    if (!data || !sessions) return null

    const activeGroup = factionGroups.find(g => g.name === groupFilter)
    const displayedFactions = groupFilter === 'all' ? factions : (activeGroup?.factions || [])

    return (
        <Card className="flex flex-col bg-card/50 relative group border-border/40 gap-0 py-0 overflow-hidden mt-8 w-full max-w-full">
            <CardHeader className="flex flex-row items-center justify-between px-6 py-2 border-b border-border/50 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Handshake className="h-4 w-4 text-primary" />
                    {titleOverride || "World Reputation"}
                </CardTitle>
                <div className="flex items-center gap-2">
                    {isOwner && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="gap-2 transition-opacity h-7 px-2 text-muted-foreground hover:text-primary"
                            onClick={() => toggleVisibility({ worldId })}
                        >
                            {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            <span className="text-xs">{isVisible ? "Public" : "Private"}</span>
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="px-0 py-0 relative w-full overflow-hidden">
                <div className="bg-muted/30 px-6 py-2 border-b border-border/50 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Factions:</span>
                        <div className="flex items-center gap-1">
                            <Button 
                                variant={groupFilter === 'all' ? "secondary" : "ghost"} 
                                size="sm" 
                                className="h-6 px-2 text-[10px] font-bold"
                                onClick={() => setGroupFilter('all')}
                            >
                                All
                            </Button>
                            {factionGroups.map(group => (
                                <Button 
                                    key={group.name}
                                    variant={groupFilter === group.name ? "secondary" : "ghost"} 
                                    size="sm" 
                                    className="h-6 px-2 text-[10px] font-bold"
                                    onClick={() => setGroupFilter(group.name)}
                                >
                                    {group.name}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar w-full">
                    <table className="w-full text-left border-collapse min-w-[400px]">
                        <thead>
                            <tr className="border-b border-border/40 bg-muted/20">
                                <th className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground sticky left-0 bg-background z-20 border-r border-border/40 min-w-[140px]">Character</th>
                                {displayedFactions.map(faction => (
                                    <th key={faction} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground min-w-[100px]">
                                        {faction}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedCharacters.length > 0 ? (
                                sortedCharacters.map(char => (
                                    <tr key={char._id} className="border-b border-border/30 hover:bg-primary/5 transition-colors group/row">
                                        <td className="px-6 py-3 sticky left-0 bg-background z-10 border-r border-border/40 min-w-0">
                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                <div className="flex items-center flex-wrap gap-2 min-w-0">
                                                    <span className="font-bold text-sm tracking-tight break-words">{char.name}</span>
                                                    <span 
                                                        className="inline-flex items-center justify-center rounded-full w-4 h-4 text-[8px] font-bold shrink-0"
                                                        style={getLevelBadgeStyle(char.lvl)}
                                                    >
                                                        {char.lvl}
                                                    </span>
                                                </div>
                                                <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-medium whitespace-normal">{char.class}</span>
                                            </div>
                                        </td>
                                        {displayedFactions.map(faction => (
                                            <td key={faction} className="px-4 py-3 align-middle">
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
                                ))
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
