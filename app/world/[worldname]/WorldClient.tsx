'use client'

import { useParams, notFound, useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  ChevronLeft, Globe, Calendar, Book, Lock, Shield, User, MapPin, Users, 
  Plus, Minus, Eye, EyeOff, Settings, Trash2, ChevronDown, Check, Info, 
  Layers, ChevronRight, LayoutGrid, Handshake, Scroll, Pencil, X, Filter, Map
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatDate, formatTime, getLevelBadgeStyle } from '@/lib/utils'
import { useState, useEffect, useMemo } from 'react'
import { getUsernames, UserMetadata } from '@/app/stats/actions'
import { useAuth } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import '@/components/sessions/sessions.css'
import { Id } from '@/convex/_generated/dataModel'
import QuestList from '@/components/quests/QuestList'

function WorldDescription({ worldId, initialDescription, isOwner }: { worldId: Id<'worlds'>, initialDescription: string, isOwner: boolean }) {
  const [isEditing, setIsEditing] = useState(false)
  const [description, setDescription] = useState(initialDescription)
  const updateDescription = useMutation(api.worlds.updateWorldDescription)

  const handleSave = async () => {
    await updateDescription({ worldId, description })
    setIsEditing(false)
  }

  return (
    <Card className="md:col-span-2 flex flex-col bg-card/50 relative group border-border/40 gap-0 py-0 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between px-6 py-2 border-b border-border/50 pb-2">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Scroll className="h-4 w-4 text-primary" />
          World Overview
        </CardTitle>
        {isOwner && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 transition-opacity h-7 px-2"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Settings className="h-3.5 w-3.5" />
            {isEditing ? "Cancel" : "Edit"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="px-6 pt-3 pb-6 max-w-none">
        {isEditing ? (
          <div className="space-y-3 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Supports Markdown</span>
            </div>
            <Textarea 
              className="min-h-[250px] font-mono text-xs flex-grow bg-muted/30"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter world description in Markdown..."
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
        ) : (
          <div className="text-sm leading-relaxed [&_>_*:first-child]:mt-0 [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mt-6 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mt-5 [&>h3]:text-lg [&>h3]:font-bold [&>h3]:mt-4 [&>p]:mt-3 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mt-3 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mt-3 [&>blockquote]:border-l-4 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:mt-3 [&_a]:text-purple-600 dark:[&_a]:text-purple-400 [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-purple-600/30 dark:[&_a]:decoration-purple-400/30 hover:[&_a]:text-purple-500 dark:hover:[&_a]:text-purple-300">
            {description ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {description}
              </ReactMarkdown>
            ) : (
              <p className="text-muted-foreground italic mt-0">No description has been provided for this world yet.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ReputationCell({ 
  worldId, 
  charId, 
  faction, 
  value, 
  isOwner 
}: { 
  worldId: Id<'worlds'>, 
  charId: Id<'characters'>, 
  faction: string, 
  value: number, 
  isOwner: boolean 
}) {
  const updateReputation = useMutation(api.worlds.updateReputation)
  const setReputation = useMutation(api.worlds.setReputation)
  const [localValue, setLocalValue] = useState(value.toString())

  useEffect(() => {
    setLocalValue(value.toString())
  }, [value])

  const handleBlur = async () => {
    const newVal = parseInt(localValue)
    if (!isNaN(newVal) && newVal !== value) {
      await setReputation({ worldId, characterId: charId, factionName: faction, value: newVal })
    } else {
      setLocalValue(value.toString())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setLocalValue(value.toString());
      (e.target as HTMLInputElement).blur();
    }
  }

  return (
    <div className="flex items-center justify-center gap-3">
      {isOwner && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 rounded-full shrink-0"
          onClick={() => updateReputation({ worldId, characterId: charId, factionName: faction, delta: -1 })}
        >
          <Minus className="h-3 w-3" />
        </Button>
      )}
      
      {isOwner ? (
        <div className="relative w-12 flex justify-center">
          <Input
            className={cn(
              "h-7 w-12 text-center p-0 font-bold border-none bg-transparent focus-visible:ring-1 focus-visible:ring-primary/30 transition-all tabular-nums",
              value > 0 ? "text-green-500" : value < 0 ? "text-red-500" : "text-muted-foreground"
            )}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        </div>
      ) : (
        <span className={cn(
          "text-sm font-bold min-w-[1.5rem] tabular-nums",
          value > 0 ? "text-green-500" : value < 0 ? "text-red-500" : "text-muted-foreground"
        )}>
          {value > 0 ? `+${value}` : value}
        </span>
      )}

      {isOwner && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 rounded-full shrink-0"
          onClick={() => updateReputation({ worldId, characterId: charId, factionName: faction, delta: 1 })}
        >
          <Plus className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}

function ReputationSystem({ worldId, worldName, userCharacterIds }: { worldId: Id<'worlds'>, worldName: string, userCharacterIds: Set<Id<'characters'>> }) {
  const data = useQuery(api.worlds.getReputationData, { worldName })
  const sessions = useQuery(api.worlds.getSessionsByWorld, { worldId })
  
  const addFaction = useMutation(api.worlds.addFaction)
  const removeFaction = useMutation(api.worlds.removeFaction)
  const renameFaction = useMutation(api.worlds.renameFaction)
  const addFactionGroup = useMutation(api.worlds.addFactionGroup)
  const removeFactionGroup = useMutation(api.worlds.removeFactionGroup)
  const renameFactionGroup = useMutation(api.worlds.renameFactionGroup)
  const updateFactionGroupMembers = useMutation(api.worlds.updateFactionGroupMembers)
  const updateReputation = useMutation(api.worlds.updateReputation)
  const toggleVisibility = useMutation(api.worlds.toggleReputationVisibility)
  
  const [sessionFilter, setSessionFilter] = useState<string>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [addMode, setAddMode] = useState<'choice' | 'group' | 'standalone'>('choice')
  const [newFactionName, setNewFactionName] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [subFactions, setSubFactions] = useState<string[]>([])
  const [currentSubFactionInput, setCurrentSubFactionInput] = useState('')
  const [selectedFactionsForGroup, setSelectedFactionsForGroup] = useState<string[]>([])
  const [isManageFactionsOpen, setIsManageFactionsOpen] = useState(false)
  const [editingFaction, setEditingFaction] = useState<string | null>(null)
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const unlockedSessions = useMemo(() => {
    if (!sessions) return []
    return sessions.filter(s => !s.locked).sort((a, b) => {
        if (a.date && b.date) return a.date - b.date
        if (a.date) return -1
        if (b.date) return 1
        return 0
    })
  }, [sessions])

  const characterIds = useMemo(() => {
    if (!sessions) return []
    if (sessionFilter === 'all') {
      const ids = new Set<Id<'characters'>>()
      sessions.forEach(s => s.characters.forEach(id => ids.add(id)))
      return Array.from(ids)
    }
    const targetSession = sessions.find(s => s._id === sessionFilter)
    return targetSession?.characters ?? []
  }, [sessions, sessionFilter])

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
    
    return [...charactersRaw].sort((a, b) => a.name.localeCompare(b.name))
  }, [charactersRaw])

  // Move the early return here, after all hooks (useQuery, useMemo, etc.) have been called.
  if (data !== undefined && !isOwner && !isVisible) return null

  const handleAddFaction = async () => {
    if (!newFactionName.trim()) return
    await addFaction({ worldId, name: newFactionName.trim() })
    setNewFactionName('')
    setAddMode('choice')
    setIsManageFactionsOpen(false)
  }

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return
    
    for (const sub of subFactions) {
      if (!factions.includes(sub)) {
        await addFaction({ worldId, name: sub })
      }
    }

    const allGroupFactions = [...selectedFactionsForGroup, ...subFactions]
    await addFactionGroup({ worldId, name: newGroupName.trim(), factions: allGroupFactions })
    
    setNewGroupName('')
    setSelectedFactionsForGroup([])
    setSubFactions([])
    setAddMode('choice')
    setIsManageFactionsOpen(false)
  }

  const activeGroup = factionGroups.find(g => g.name === groupFilter)
  const displayedFactions = groupFilter === 'all' ? factions : (activeGroup?.factions || [])

  if (data === undefined || sessions === undefined) return <Skeleton className="h-[400px] w-full" />

  return (
    <Card className="md:col-span-2 min-h-[400px] flex flex-col h-full bg-card/50">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/50">
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Handshake className="h-6 w-6 text-primary" />
            World Reputation
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isVisible ? "Public: Everyone can view reputation scores." : "Private: Only you can view reputation scores."}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:ml-auto w-full sm:w-auto">
          {isOwner && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                className={cn("gap-2", isVisible ? "text-green-500" : "text-amber-500")}
                onClick={() => toggleVisibility({ worldId })}
              >
                {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {isVisible ? "Public" : "Private"}
              </Button>

              <Popover open={isManageFactionsOpen} onOpenChange={(open) => {
                setIsManageFactionsOpen(open)
                if (!open) setAddMode('choice')
              }}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Faction
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 overflow-hidden" align="end">
                  <div className="p-4 bg-muted/50 border-b flex items-center justify-between">
                    <h4 className="font-bold leading-none">
                      {addMode === 'choice' && "Choose Type"}
                      {addMode === 'group' && "New Faction Group"}
                      {addMode === 'standalone' && "New Standalone Faction"}
                    </h4>
                    {addMode !== 'choice' && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAddMode('choice')}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="p-4 space-y-4">
                    {addMode === 'choice' && (
                      <div className="grid grid-cols-1 gap-2">
                        <Button variant="outline" className="h-auto py-4 flex-col gap-1 items-start whitespace-normal" onClick={() => setAddMode('group')}>
                          <span className="font-bold">Faction Group</span>
                          <span className="text-[10px] text-muted-foreground text-left leading-tight">A collection of factions with an aggregated reputation score.</span>
                        </Button>
                        <Button variant="outline" className="h-auto py-4 flex-col gap-1 items-start whitespace-normal" onClick={() => setAddMode('standalone')}>
                          <span className="font-bold">Standalone Faction</span>
                          <span className="text-[10px] text-muted-foreground text-left leading-tight">A single organization without any sub-factions.</span>
                        </Button>
                      </div>
                    )}

                    {addMode === 'standalone' && (
                      <div className="space-y-3">
                        <Input 
                          placeholder="Faction name (e.g. Iron Shields)" 
                          value={newFactionName}
                          onChange={(e) => setNewFactionName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddFaction()}
                          autoFocus
                        />
                        <Button className="w-full" onClick={handleAddFaction}>Create Faction</Button>
                      </div>
                    )}

                    {addMode === 'group' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">Group Identity</label>
                          <Input 
                            placeholder="Group name (e.g. The Merchant Guilds)" 
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            autoFocus
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">Add Sub-Factions</label>
                          <div className="flex gap-2">
                            <Input 
                              placeholder="New sub-faction name..." 
                              className="text-xs"
                              value={currentSubFactionInput}
                              onChange={(e) => setCurrentSubFactionInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && currentSubFactionInput.trim()) {
                                  setSubFactions([...subFactions, currentSubFactionInput.trim()])
                                  setCurrentSubFactionInput('')
                                }
                              }}
                            />
                            <Button size="sm" onClick={() => {
                              if (currentSubFactionInput.trim()) {
                                setSubFactions([...subFactions, currentSubFactionInput.trim()])
                                setCurrentSubFactionInput('')
                              }
                            }}>Add</Button>
                          </div>
                          
                          {subFactions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {subFactions.map(s => (
                                <span key={s} className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                                  {s}
                                  <X className="h-2 w-2 cursor-pointer" onClick={() => setSubFactions(subFactions.filter(f => f !== s))} />
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {factions.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Include Existing Factions</label>
                            <select 
                              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              value=""
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val && !selectedFactionsForGroup.includes(val)) {
                                  setSelectedFactionsForGroup([...selectedFactionsForGroup, val]);
                                }
                              }}
                            >
                              <option value="">-- Choose existing faction --</option>
                              {factions
                                .filter(f => !selectedFactionsForGroup.includes(f) && !subFactions.includes(f))
                                .map(f => (
                                  <option key={f} value={f}>{f}</option>
                                ))
                              }
                            </select>
                            
                            {selectedFactionsForGroup.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {selectedFactionsForGroup.map(s => (
                                  <span key={s} className="bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 border border-border/50">
                                    {s}
                                    <X className="h-2.5 w-2.5 cursor-pointer hover:text-destructive transition-colors" onClick={() => setSelectedFactionsForGroup(selectedFactionsForGroup.filter(f => f !== s))} />
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <Button className="w-full h-10 font-bold" disabled={!newGroupName.trim()} onClick={handleAddGroup}>
                          Create Group & Factions
                        </Button>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}

          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={cn("gap-2", groupFilter !== 'all' && "border-primary text-primary bg-primary/5")}
                  title="Filter Factions"
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {groupFilter === 'all' ? "All Factions" : groupFilter}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="end">
                <div className="space-y-1">
                  <Button 
                    variant={groupFilter === 'all' ? "secondary" : "ghost"} 
                    className="w-full justify-start font-normal text-xs h-8"
                    onClick={() => setGroupFilter('all')}
                  >
                    All Factions
                  </Button>
                  {factionGroups.map(g => (
                    <Button 
                      key={g.name}
                      variant={groupFilter === g.name ? "secondary" : "ghost"} 
                      className="w-full justify-start font-normal text-xs h-8"
                      onClick={() => setGroupFilter(g.name)}
                    >
                      <Layers className="h-3 w-3 mr-2 opacity-50" />
                      {g.name}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={cn("gap-2", sessionFilter !== 'all' && "border-primary text-primary bg-primary/5")}
                  title="Filter by Session"
                >
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {sessionFilter === 'all' ? "All Participants" : 
                      (() => {
                        const s = unlockedSessions.find(x => x._id === sessionFilter);
                        return s ? (s.date ? formatDate(s.date) : "Planning") : "Select Session";
                      })()
                    }
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <div className="space-y-1">
                  <Button 
                    variant={sessionFilter === 'all' ? "secondary" : "ghost"} 
                    className="w-full justify-start font-normal text-xs h-8"
                    onClick={() => setSessionFilter('all')}
                  >
                    All Participants
                  </Button>
                  {unlockedSessions.map(s => (
                    <Button 
                      key={s._id}
                      variant={sessionFilter === s._id ? "secondary" : "ghost"} 
                      className="w-full justify-start font-normal text-xs h-8"
                      onClick={() => setSessionFilter(s._id)}
                    >
                      <Calendar className="h-3 w-3 mr-2 opacity-50" />
                      {s.date ? `${formatDate(s.date)} ${formatTime(s.date)}` : `Planning: ${worldName}`}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 overflow-auto">
        <div className="min-w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left p-4 font-bold border-b border-border/50 sticky left-0 bg-background z-20 min-w-[180px]">Character</th>
                  
                  {groupFilter === 'all' && (
                    <th className="p-4 font-bold border-b border-border/50 text-center bg-primary/5 min-w-[100px]">Overall</th>
                  )}

                  {factionGroups.filter(g => groupFilter === 'all' || g.name === groupFilter).map(g => (
                    <th key={g.name} className="p-4 font-bold border-b border-border/50 text-center bg-muted/50 min-w-[120px]">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1.5 group/header">
                          {editingGroup === g.name ? (
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-7 text-xs w-[100px] bg-background"
                              autoFocus
                              onBlur={async () => {
                                if (editValue && editValue !== g.name) {
                                  await renameFactionGroup({ worldId, oldName: g.name, newName: editValue })
                                }
                                setEditingGroup(null)
                              }}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  if (editValue && editValue !== g.name) {
                                    await renameFactionGroup({ worldId, oldName: g.name, newName: editValue })
                                  }
                                  setEditingGroup(null)
                                } else if (e.key === 'Escape') {
                                  setEditingGroup(null)
                                }
                              }}
                            />
                          ) : (
                            <span 
                              className={cn("truncate max-w-[100px]", isOwner && "cursor-text hover:text-primary transition-colors")}
                              onClick={() => {
                                if (isOwner) {
                                  setEditingGroup(g.name)
                                  setEditValue(g.name)
                                }
                              }}
                              title={isOwner ? "Click to rename group" : undefined}
                            >
                              {g.name}
                            </span>
                          )}
                          {isOwner && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-5 w-5 transition-opacity">
                                  <Settings className="h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-4">
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Manage Members</label>
                                    <div className="space-y-1.5 max-h-[150px] overflow-auto border rounded-md p-2 bg-background">
                                      {factions.map(f => (
                                        <div key={f} className="flex items-center gap-2">
                                          <Checkbox 
                                            id={`edit-group-${g.name}-${f}`}
                                            checked={g.factions.includes(f)}
                                            onCheckedChange={async (checked) => {
                                              const newFactions = checked 
                                                ? [...g.factions, f]
                                                : g.factions.filter(x => x !== f)
                                              await updateFactionGroupMembers({ worldId, name: g.name, factions: newFactions })
                                            }}
                                          />
                                          <label htmlFor={`edit-group-${g.name}-${f}`} className="text-[10px] truncate cursor-pointer">{f}</label>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <Button variant="destructive" size="sm" className="w-full gap-2 h-8" onClick={() => removeFactionGroup({ worldId, name: g.name })}>
                                    <Trash2 className="h-3 w-3" /> Delete Group
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                        <span className="text-[9px] uppercase tracking-tighter text-muted-foreground opacity-60">Avg Score</span>
                      </div>
                    </th>
                  ))}

                  {displayedFactions.map(f => (
                    <th key={f} className="p-4 font-bold border-b border-border/50 text-center min-w-[120px]">
                      <div className="flex items-center justify-center gap-1 group/header">
                        {editingFaction === f ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-7 text-xs w-[100px] bg-background"
                            autoFocus
                            onBlur={async () => {
                              if (editValue && editValue !== f) {
                                await renameFaction({ worldId, oldName: f, newName: editValue })
                              }
                              setEditingFaction(null)
                            }}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                if (editValue && editValue !== f) {
                                  await renameFaction({ worldId, oldName: f, newName: editValue })
                                }
                                setEditingFaction(null)
                              } else if (e.key === 'Escape') {
                                setEditingFaction(null)
                              }
                            }}
                          />
                        ) : (
                          <span 
                            className={cn("truncate max-w-[100px]", isOwner && "cursor-text hover:text-primary transition-colors")}
                            onClick={() => {
                              if (isOwner) {
                                setEditingFaction(f)
                                setEditValue(f)
                              }
                            }}
                            title={isOwner ? "Click to rename faction" : undefined}
                          >
                            {f}
                          </span>
                        )}
                        {isOwner && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5 transition-opacity">
                                <Settings className="h-3 w-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-4" align="center">
                              <Button variant="destructive" size="sm" className="w-full gap-2 h-8" onClick={() => removeFaction({ worldId, name: f })}>
                                <Trash2 className="h-3 w-3" /> Delete Faction
                              </Button>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {charactersRaw === undefined ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td className="p-4 border-b border-border/50"><Skeleton className="h-6 w-32" /></td>
                      {groupFilter === 'all' && (
                        <td className="p-4 border-b border-border/50 bg-primary/5"><Skeleton className="h-6 w-12 mx-auto" /></td>
                      )}
                      {factionGroups.filter(g => groupFilter === 'all' || g.name === groupFilter).map(g => (
                        <td key={g.name} className="p-4 border-b border-border/50 bg-muted/50"><Skeleton className="h-6 w-12 mx-auto" /></td>
                      ))}
                      {displayedFactions.map(f => (
                        <td key={f} className="p-4 border-b border-border/50"><Skeleton className="h-6 w-12 mx-auto" /></td>
                      ))}
                    </tr>
                  ))
                ) : sortedCharacters.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-muted-foreground italic">
                      No characters found for this filter.
                    </td>
                  </tr>
                ) : (
                  sortedCharacters.map(char => {
                    let totalRep = 0
                    factions.forEach(f => {
                      totalRep += getRepValue(char._id, f)
                    })
                    const overallAvg = factions.length > 0 ? totalRep / factions.length : 0
                    const isUserCharacter = userCharacterIds.has(char._id)

                    return (
                      <tr 
                        key={char._id} 
                        className={cn(
                          "transition-colors group",
                          isUserCharacter ? "bg-purple-50/50 dark:bg-purple-900/10" : "hover:bg-muted/20"
                        )}
                      >
                        <td className={cn(
                          "p-4 border-b border-border/50 font-bold sticky left-0 z-10 transition-colors",
                          isUserCharacter 
                            ? "bg-[#fdfaff] dark:bg-[#1a1025] text-purple-700 dark:text-purple-300 border-l-4 border-l-[#D8B4FE]" 
                            : "bg-background group-hover:bg-muted/20"
                        )}>
                          <div className="flex items-center gap-2">
                            {char.name}
                            {isUserCharacter && (
                              <span className="text-[8px] bg-purple-200 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1 py-0.5 rounded-full uppercase tracking-wider font-bold">You</span>
                            )}
                          </div>
                        </td>
                        
                        {groupFilter === 'all' && (
                          <td className={cn(
                            "p-4 border-b border-border/50 text-center bg-primary/5",
                            isUserCharacter && "bg-purple-100/20 dark:bg-purple-800/10"
                          )}>
                            <span className={cn(
                              "text-sm font-bold",
                              overallAvg > 0 ? "text-green-500" : overallAvg < 0 ? "text-red-500" : "text-muted-foreground"
                            )}>
                              {overallAvg > 0 ? `+${overallAvg.toFixed(1)}` : overallAvg.toFixed(1)}
                            </span>
                          </td>
                        )}

                        {factionGroups.filter(g => groupFilter === 'all' || g.name === groupFilter).map(g => {
                          let groupTotal = 0
                          g.factions.forEach(f => {
                            groupTotal += getRepValue(char._id, f)
                          })
                          const groupAvg = g.factions.length > 0 ? groupTotal / g.factions.length : 0
                          return (
                            <td key={g.name} className={cn(
                              "p-4 border-b border-border/50 text-center bg-muted/50",
                              isUserCharacter && "bg-purple-100/30 dark:bg-purple-800/20"
                            )}>
                              <span className={cn(
                                "text-sm font-bold",
                                groupAvg > 0 ? "text-green-500" : groupAvg < 0 ? "text-red-500" : "text-muted-foreground"
                              )}>
                                {groupAvg > 0 ? `+${groupAvg.toFixed(1)}` : groupAvg.toFixed(1)}
                              </span>
                            </td>
                          )
                        })}

                        {displayedFactions.map(f => {
                          const val = getRepValue(char._id, f)
                          return (
                            <td key={f} className={cn(
                              "p-4 border-b border-border/50 text-center",
                              isUserCharacter && "bg-purple-50/30 dark:bg-purple-900/5"
                            )}>
                              <ReputationCell
                                worldId={worldId}
                                charId={char._id}
                                faction={f}
                                value={val}
                                isOwner={isOwner}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
      </CardContent>
    </Card>
  )
}

export default function WorldClient() {
  const params = useParams()
  const worldName = decodeURIComponent(params.worldname as string)
  const { userId } = useAuth()
  const router = useRouter()
  
  const world = useQuery(api.worlds.getWorldByName, { name: worldName })
  const sessions = useQuery(api.worlds.getSessionsByWorld, world?._id ? { worldId: world._id } : 'skip')
  const isGM = useQuery(api.sessions.isGameMasterQuery)
  const userCharacters = useQuery(api.characters.listCharacters)
  const renameWorld = useMutation(api.worlds.renameWorld)
  
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [userMetadata, setUserMetadata] = useState<Record<string, UserMetadata>>({})
  const [sessionsLimit, setSessionsLimit] = useState(5)
  const [isEditingName, setIsEditingName] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    if (world) {
      setNewName(world.name)
      getUsernames([world.owner]).then(setUserMetadata)
    }
  }, [world])

  const handleRenameWorld = async () => {
    if (!world || !newName.trim() || newName === world.name) {
        setIsEditingName(false)
        return
    }
    try {
        const encodedNewName = encodeURIComponent(newName.trim())
        await renameWorld({ worldId: world._id, newName: newName.trim() })
        setIsEditingName(false)
        // Redirect to the new world URL
        router.push(`/world/${encodedNewName}`)
    } catch (e) {
        alert(e instanceof Error ? e.message : 'Failed to rename world')
    }
  }

  useEffect(() => {
    setSessionsLimit(5)
  }, [activeTab])

  const userCharacterIds = useMemo(() => new Set(userCharacters?.map(c => c._id) ?? []), [userCharacters])

  const allFilteredSessions = useMemo(() => {
    if (!sessions) return []
    // Upcoming tab includes both scheduled and planning sessions
    const filtered = sessions.filter(s => activeTab === 'past' ? s.locked : !s.locked)
    return filtered.sort((a, b) => {
        if (activeTab === 'past') return (b.date || 0) - (a.date || 0)
        
        // For upcoming: scheduled sessions first (by date), then planning sessions
        if (a.date && b.date) return a.date - b.date
        if (a.date) return -1
        if (b.date) return 1
        return 0
    })
  }, [sessions, activeTab])

  if (world === undefined) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <Skeleton className="h-10 w-32 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-8">
                <Skeleton className="h-20 w-full" />
                <Card>
                    <CardHeader><Skeleton className="h-8 w-32" /></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="md:col-span-2 h-[400px] w-full" />
                <Skeleton className="h-[200px] w-full" />
                <Skeleton className="h-[200px] w-full" />
            </div>
        </div>
      </div>
    )
  }

  if (world === null) {
    notFound()
    return null
  }

  const ownerMetadata = userMetadata[world.owner]
  const ownerName = ownerMetadata?.name || `User ${world.owner.slice(-4)}`

  const filteredSessions = activeTab === 'past' ? allFilteredSessions.slice(0, sessionsLimit) : allFilteredSessions
  const hasMoreSessions = activeTab === 'past' && allFilteredSessions.length > sessionsLimit

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center mb-8">
        <Button variant="ghost" size="sm" className="sm:px-3 sm:w-auto w-9 px-0" asChild>
          <Link href="/">
            <ChevronLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Title and Sessions */}
        <div className="lg:col-span-4 space-y-8">
          <div>
            <div className="flex items-center gap-4 group min-w-0">
                {isEditingName ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
                        <Input 
                            value={newName} 
                            onChange={(e) => setNewName(e.target.value)}
                            className="text-2xl font-bold h-12 flex-grow"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameWorld()
                                if (e.key === 'Escape') setIsEditingName(false)
                            }}
                        />
                        <div className="flex gap-2 shrink-0">
                            <Button size="sm" onClick={handleRenameWorld}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setIsEditingName(false)}>Cancel</Button>
                        </div>
                    </div>
                ) : (
                    <div className="min-w-0 w-full overflow-hidden">
                        <h1 
                            className="font-bold flex flex-wrap items-center gap-x-4 gap-y-2 transition-all duration-300"
                            style={{ 
                                fontSize: `clamp(1.25rem, ${(25 / (world.name.length || 1))}rem, 3.5rem)`,
                                lineHeight: '1.1'
                            }}
                        >
                            <span className="break-words max-w-full">{world.name}</span>
                            <div className="flex items-center gap-2 shrink-0">
                                <a 
                                    href={`https://void.tarragon.be/World-Notes/${world.name.replace(/\s+/g, '-')}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="hover:text-primary transition-colors shrink-0"
                                    title="View Wiki"
                                >
                                    <Book className="h-8 w-8" />
                                </a>
                                {userId === world.owner && (
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                                        onClick={() => setIsEditingName(true)}
                                        title="Rename World"
                                    >
                                        <Pencil className="h-5 w-5" />
                                    </Button>
                                )}
                            </div>
                        </h1>
                    </div>
                )}
            </div>
            <p className="text-xl text-muted-foreground mt-2 italic font-serif">
              Directed by <span className="font-semibold text-foreground not-italic">{ownerName}</span>.
            </p>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
              <CardTitle className="text-xl font-bold">Sessions</CardTitle>
              <div className="flex bg-muted p-1 rounded-md h-9 relative">
                {(['upcoming', 'past'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-3 py-1 text-sm font-medium rounded-sm transition-colors capitalize relative z-10",
                      activeTab === tab 
                        ? "text-foreground" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {activeTab === tab && (
                      <motion.div
                        layoutId="activeTabWorld"
                        className="absolute inset-0 bg-background rounded-sm shadow-sm z-[-1]"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    {tab}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {sessions === undefined ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : filteredSessions.length === 0 ? (
                <p className="text-muted-foreground italic text-center py-8">No {activeTab} sessions found.</p>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.ul 
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {filteredSessions.map((session, i) => {
                      const isPlanning = session.planning || !session.date
                      const hasJoined = !session.locked && !isPlanning && session.characters.some(id => userCharacterIds.has(id))
                      const isOwner = userId === session.owner
                      
                      return (
                        <motion.li 
                          key={session._id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.05, 0.3) }}
                          className="border-b pb-2 last:border-0"
                        >
                          <Link
                            href={`/sessions/${session._id}`}
                            className={cn(
                                "block p-3 rounded-md transition-all relative",
                                isOwner 
                                    ? "session-owner" 
                                    : isPlanning
                                        ? "session-planning"
                                        : isGM && hasJoined 
                                            ? "session-admin-joined" 
                                            : hasJoined 
                                                ? "session-joined" 
                                                : "session-default"
                            )}
                          >
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                  <span 
                                    className="inline-flex items-center justify-center w-20 rounded-full px-2.5 py-0.5 text-xs font-bold"
                                    style={getLevelBadgeStyle(session.level)}
                                  >
                                      Lvl {session.level ?? 'TBD'}
                                  </span>
                                  {session.system && (
                                    <img 
                                        src={session.system === 'PF' ? '/PFVoid.svg' : '/DnDVoid.svg'} 
                                        alt={session.system} 
                                        className="h-5 w-5"
                                    />
                                  )}
                                  {isPlanning && <div className="text-[8px] bg-purple-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-widest font-black shadow-sm">Planning</div>}
                                  {session.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                                  {!isPlanning && session.characters.length >= session.maxPlayers && (
                                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800 uppercase tracking-wider">
                                      Full
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                                  {session.date ? formatDate(session.date) : "Date TBD"}
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between mt-1">
                                <div className="text-sm font-semibold flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {session.date ? formatTime(session.date) : "Planning Phase"}
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {isPlanning 
                                        ? `${(session.interestedPlayers || []).length} interested`
                                        : `${session.characters.length} / ${session.maxPlayers}`
                                    }
                                  </div>
                                  {activeTab === 'past' && session.date && (
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-6 w-8 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        window.open(`https://void.tarragon.be/Session-Reports/${new Date(session.date!).toISOString().slice(0, 10)}-${world.name.replace(/\s+/g, '-')}`, '_blank');
                                      }}
                                    >
                                      <Book className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        </motion.li>
                      )
                    })}
                  </motion.ul>
                </AnimatePresence>
              )}

              {hasMoreSessions && (
                <Button 
                  variant="ghost" 
                  className="w-full mt-4 text-muted-foreground hover:text-primary border-dashed border-2 hover:bg-primary/5"
                  onClick={() => setSessionsLimit(prev => prev + 5)}
                >
                  Load More Past Sessions ({allFilteredSessions.length - sessionsLimit} remaining)
                </Button>
              )}
            </CardContent>
          </Card>

          <QuestList worldId={world._id} worldOwner={world.owner} />
        </div>

        {/* Right Column: Bento Grid */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          <WorldDescription 
            worldId={world._id} 
            initialDescription={world.description || ''} 
            isOwner={userId === world.owner} 
          />
          <WorldMap 
            worldId={world._id} 
            initialMapUrl={world.mapEmbed} 
            isOwner={userId === world.owner} 
          />
          <ReputationSystem 
            worldId={world._id} 
            worldName={world.name} 
            userCharacterIds={userCharacterIds} 
          />
        </div>
      </div>
    </div>
  )
}
