'use client'

import { useParams, notFound } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  ChevronLeft, Globe, Calendar, Book, Lock, Shield, User, MapPin, Users, 
  Plus, Minus, Eye, EyeOff, Settings, Trash2, ChevronDown, Check, Info, 
  Layers, ChevronRight, LayoutGrid, Handshake, Scroll
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

function WorldDescription({ worldId, initialDescription, isOwner }: { worldId: Id<'worlds'>, initialDescription: string, isOwner: boolean }) {
  const [isEditing, setIsEditing] = useState(false)
  const [description, setDescription] = useState(initialDescription)
  const updateDescription = useMutation(api.worlds.updateWorldDescription)

  const handleSave = async () => {
    await updateDescription({ worldId, description })
    setIsEditing(false)
  }

  return (
    <Card className="md:col-span-2 min-h-[300px] flex flex-col bg-card/50 relative group">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Scroll className="h-5 w-5 text-primary" />
          World Overview
        </CardTitle>
        {isOwner && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Settings className="h-4 w-4" />
            {isEditing ? "Cancel" : "Edit Description"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-6 max-w-none flex-grow">
        {isEditing ? (
          <div className="space-y-4 h-full flex flex-col">
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
          <div className="min-h-[200px] text-sm leading-relaxed space-y-4 [&>h1]:text-2xl [&>h1]:font-bold [&>h2]:text-xl [&>h2]:font-bold [&>h3]:text-lg [&>h3]:font-bold [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-6 [&>ol]:list-decimal [&>ol]:pl-6 [&>blockquote]:border-l-4 [&>blockquote]:pl-4 [&>blockquote]:italic">
            {description ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {description}
              </ReactMarkdown>
            ) : (
              <p className="text-muted-foreground italic">No description has been provided for this world yet.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ReputationSystem({ worldId, worldName, userCharacterIds }: { worldId: Id<'worlds'>, worldName: string, userCharacterIds: Set<Id<'characters'>> }) {
  const data = useQuery(api.worlds.getReputationData, { worldName })
  const sessions = useQuery(api.worlds.getSessionsByWorld, { worldId })
  
  const addFaction = useMutation(api.worlds.addFaction)
  const removeFaction = useMutation(api.worlds.removeFaction)
  const addFactionGroup = useMutation(api.worlds.addFactionGroup)
  const removeFactionGroup = useMutation(api.worlds.removeFactionGroup)
  const updateReputation = useMutation(api.worlds.updateReputation)
  const toggleVisibility = useMutation(api.worlds.toggleReputationVisibility)
  
  const [sessionFilter, setSessionFilter] = useState<string>('all')
  const [newFactionName, setNewFactionName] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedFactionsForGroup, setSelectedFactionsForGroup] = useState<string[]>([])
  const [isManageFactionsOpen, setIsManageFactionsOpen] = useState(false)

  const unlockedSessions = useMemo(() => sessions?.filter(s => !s.locked) ?? [], [sessions])

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

  const { factions, factionGroups, reputations, isOwner, isVisible } = data || { factions: [], factionGroups: [], reputations: [], isOwner: false, isVisible: false }

  const getRepValue = (charId: Id<'characters'>, faction: string) => {
    return reputations.find(r => r.characterId === charId && r.factionName === faction)?.value ?? 0
  }

  const sortedCharacters = useMemo(() => {
    if (!charactersRaw || factions.length === 0) return charactersRaw || []
    
    return [...charactersRaw].map(char => {
      let total = 0
      factions.forEach(f => {
        total += getRepValue(char._id, f)
      })
      const average = total / factions.length
      return { ...char, overallAverage: average }
    }).sort((a, b) => b.overallAverage - a.overallAverage)
  }, [charactersRaw, factions, reputations])

  const handleAddFaction = async () => {
    if (!newFactionName.trim()) return
    await addFaction({ worldId, name: newFactionName.trim() })
    setNewFactionName('')
  }

  const handleAddGroup = async () => {
    if (!newGroupName.trim() || selectedFactionsForGroup.length === 0) return
    await addFactionGroup({ worldId, name: newGroupName.trim(), factions: selectedFactionsForGroup })
    setNewGroupName('')
    setSelectedFactionsForGroup([])
  }

  const toggleFactionForGroup = (faction: string) => {
    setSelectedFactionsForGroup(prev => 
      prev.includes(faction) ? prev.filter(f => f !== faction) : [...prev, faction]
    )
  }

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

              <Popover open={isManageFactionsOpen} onOpenChange={setIsManageFactionsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Manage
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 overflow-hidden" align="end">
                  <div className="p-4 bg-muted/50 border-b">
                    <h4 className="font-bold leading-none">Reputation Settings</h4>
                  </div>
                  <div className="p-4 space-y-6 max-h-[400px] overflow-auto">
                    {/* Factions Section */}
                    <div className="space-y-3">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <LayoutGrid className="h-3 w-3" /> Factions
                      </h5>
                      <div className="space-y-1.5">
                        {factions.map(f => (
                          <div key={f} className="flex items-center justify-between bg-muted/30 p-2 rounded-md group">
                            <span className="text-sm font-medium">{f}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeFaction({ worldId, name: f })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Input 
                          placeholder="New faction..." 
                          className="h-8 text-xs"
                          value={newFactionName}
                          onChange={(e) => setNewFactionName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddFaction()}
                        />
                        <Button size="sm" className="h-8 px-3" onClick={handleAddFaction}>Add</Button>
                      </div>
                    </div>

                    {/* Groups Section */}
                    <div className="space-y-3 border-t pt-6">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Layers className="h-3 w-3" /> Faction Groups
                      </h5>
                      <div className="space-y-1.5">
                        {factionGroups.map(g => (
                          <div key={g.name} className="flex flex-col bg-muted/30 p-2 rounded-md group">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold">{g.name}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeFactionGroup({ worldId, name: g.name })}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 italic">
                              {g.factions.join(', ')}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3 pt-2">
                        <Input 
                          placeholder="Group name..." 
                          className="h-8 text-xs"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-2 max-h-[100px] overflow-auto p-2 border rounded-md bg-background">
                          {factions.map(f => (
                            <div key={f} className="flex items-center gap-2">
                              <Checkbox 
                                id={`group-fact-${f}`} 
                                checked={selectedFactionsForGroup.includes(f)}
                                onCheckedChange={() => toggleFactionForGroup(f)}
                              />
                              <label htmlFor={`group-fact-${f}`} className="text-[10px] truncate cursor-pointer">{f}</label>
                            </div>
                          ))}
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full h-8" 
                          disabled={!newGroupName.trim() || selectedFactionsForGroup.length === 0}
                          onClick={handleAddGroup}
                        >
                          Create Group
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}

          <select 
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
          >
            <option value="all">All Participants</option>
            {unlockedSessions.map(s => (
              <option key={s._id} value={s._id}>
                Session: {formatDate(s.date)} {formatTime(s.date)}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 overflow-auto">
        {!isOwner && !isVisible ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-50 space-y-4">
            <Lock className="h-12 w-12" />
            <div className="text-center">
              <h3 className="font-bold text-lg">Reputation is Private</h3>
              <p className="text-sm">Only the world director can see reputation scores.</p>
            </div>
          </div>
        ) : factions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
            <Info className="h-12 w-12 opacity-20" />
            <div className="text-center">
              <h3 className="font-bold">No Factions Defined</h3>
              <p className="text-sm">Add factions using the settings button above.</p>
            </div>
          </div>
        ) : (
          <div className="min-w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left p-4 font-bold border-b border-border/50 sticky left-0 bg-background z-20">Character</th>
                  <th className="p-4 font-bold border-b border-border/50 text-center bg-primary/5">Overall</th>
                  {factionGroups.map(g => (
                    <th key={g.name} className="p-4 font-bold border-b border-border/50 text-center bg-muted/50">{g.name}</th>
                  ))}
                  {factions.map(f => (
                    <th key={f} className="p-4 font-bold border-b border-border/50 text-center">{f}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {charactersRaw === undefined ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td className="p-4 border-b border-border/50"><Skeleton className="h-6 w-32" /></td>
                      <td className="p-4 border-b border-border/50 bg-primary/5"><Skeleton className="h-6 w-12 mx-auto" /></td>
                      {factionGroups.map(g => (
                        <td key={g.name} className="p-4 border-b border-border/50 bg-muted/50"><Skeleton className="h-6 w-12 mx-auto" /></td>
                      ))}
                      {factions.map(f => (
                        <td key={f} className="p-4 border-b border-border/50"><Skeleton className="h-6 w-12 mx-auto" /></td>
                      ))}
                    </tr>
                  ))
                ) : sortedCharacters.length === 0 ? (
                  <tr>
                    <td colSpan={1 + 1 + factionGroups.length + factions.length} className="p-8 text-center text-muted-foreground italic">
                      No characters found for this filter.
                    </td>
                  </tr>
                ) : (
                  sortedCharacters.map(char => {
                    const overallAvg = (char as any).overallAverage || 0
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
                        {factionGroups.map(g => {
                          let groupTotal = 0
                          g.factions.forEach(f => {
                            groupTotal += getRepValue(char._id, f)
                          })
                          const groupAvg = groupTotal / g.factions.length
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
                        {factions.map(f => {
                          const val = getRepValue(char._id, f)
                          return (
                            <td key={f} className={cn(
                              "p-4 border-b border-border/50 text-center",
                              isUserCharacter && "bg-purple-50/30 dark:bg-purple-900/5"
                            )}>
                              <div className="flex items-center justify-center gap-3">
                                {isOwner && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 rounded-full"
                                    onClick={() => updateReputation({ worldId, characterId: char._id, factionName: f, delta: -1 })}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                )}
                                <span className={cn(
                                  "text-sm font-bold min-w-[1.5rem]",
                                  val > 0 ? "text-green-500" : val < 0 ? "text-red-500" : "text-muted-foreground"
                                )}>
                                  {val > 0 ? `+${val}` : val}
                                </span>
                                {isOwner && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 rounded-full"
                                    onClick={() => updateReputation({ worldId, characterId: char._id, factionName: f, delta: 1 })}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })
                )
}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function WorldPage() {
  const params = useParams()
  const worldName = decodeURIComponent(params.worldname as string)
  const { userId } = useAuth()
  
  const world = useQuery(api.worlds.getWorldByName, { name: worldName })
  const sessions = useQuery(api.worlds.getSessionsByWorld, world?._id ? { worldId: world._id } : 'skip')
  const isGM = useQuery(api.sessions.isGameMasterQuery)
  const userCharacters = useQuery(api.characters.listCharacters)
  
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [userMetadata, setUserMetadata] = useState<Record<string, UserMetadata>>({})

  useEffect(() => {
    if (world) {
      getUsernames([world.owner]).then(setUserMetadata)
    }
  }, [world])

  const userCharacterIds = useMemo(() => new Set(userCharacters?.map(c => c._id) ?? []), [userCharacters])

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

  const filteredSessions = sessions?.filter(s => activeTab === 'past' ? s.locked : !s.locked) || []

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center mb-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="sm:px-3 sm:w-auto w-9 px-0">
            <ChevronLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Back to Home</span>
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Title and Sessions */}
        <div className="lg:col-span-4 space-y-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold flex items-center gap-4">
              {world.name}
              <a 
                href={`https://void.tarragon.be/World-Notes/${world.name.replace(/\s+/g, '-')}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-primary transition-colors"
                title="View Wiki"
              >
                <Book className="h-8 w-8" />
              </a>
            </h1>
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
                      const hasJoined = !session.locked && session.characters.some(id => userCharacterIds.has(id))
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
                                    : isGM && hasJoined 
                                        ? "session-admin-joined" 
                                        : hasJoined 
                                            ? "session-joined" 
                                            : "session-default"
                            )}
                          >
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
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
                                  {session.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                                  {session.characters.length >= session.maxPlayers && (
                                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800 uppercase tracking-wider">
                                      Full
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                                  {formatDate(session.date)}
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between mt-1">
                                <div className="text-sm font-semibold flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatTime(session.date)}
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {session.characters.length} / {session.maxPlayers}
                                  </div>
                                  {activeTab === 'past' && (
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-6 w-8 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        window.open(`https://void.tarragon.be/Session-Reports/${new Date(session.date).toISOString().slice(0, 10)}-${world.name.replace(/\s+/g, '-')}`, '_blank');
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
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Bento Grid */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          <WorldDescription 
            worldId={world._id} 
            initialDescription={world.description || ''} 
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

