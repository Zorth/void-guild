'use client'

import { useParams, notFound, useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  ChevronLeft, Globe, Calendar, Book, Lock, Shield, MapPin, Users, 
  Plus, Settings, Pencil, Map
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatDate, formatTime, getLevelBadgeStyle } from '@/lib/utils'
import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Id } from '@/convex/_generated/dataModel'
import { UserMetadata } from '@/app/stats/actions'
import { useAuth, UserButton } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ThemeToggle } from '@/components/ThemeToggle'
import '@/components/sessions/sessions.css'
import QuestList from '@/components/quests/QuestList'
import ReputationSystem from '@/components/world/ReputationSystem'
import WorldCalendar from '@/components/world/WorldCalendar'

function WorldDescription({ 
  worldId, 
  initialDescription, 
  isOwner,
  hasMap,
  onAddMap
}: { 
  worldId: any, 
  initialDescription: string, 
  isOwner: boolean,
  hasMap: boolean,
  onAddMap: () => void
}) {
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
          <Shield className="h-4 w-4 text-primary" />
          World Overview
        </CardTitle>
        <div className="flex items-center gap-2">
          {isOwner && !hasMap && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 transition-opacity h-7 px-2 text-muted-foreground hover:text-primary"
              onClick={onAddMap}
            >
              <Map className="h-3.5 w-3.5" />
              Add Map
            </Button>
          )}
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
        </div>
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

function WorldMap({ 
  worldId, 
  initialMapUrl, 
  isOwner,
  isEditing,
  setIsEditing
}: { 
  worldId: any, 
  initialMapUrl?: string, 
  isOwner: boolean,
  isEditing: boolean,
  setIsEditing: (val: boolean) => void
}) {
  const [mapUrl, setMapUrl] = useState(initialMapUrl || '')
  const updateMap = useMutation(api.worlds.updateWorldMap)

  useEffect(() => {
    setMapUrl(initialMapUrl || '')
  }, [initialMapUrl])

  const handleSave = async () => {
    await updateMap({ worldId, mapEmbed: mapUrl })
    setIsEditing(false)
  }

  if (!initialMapUrl && !isEditing) return null;

  return (
    <Card className="md:col-span-2 flex flex-col bg-card/50 relative group border-border/40 gap-0 py-0 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between px-6 py-2 border-b border-border/50 pb-2">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Map className="h-4 w-4 text-primary" />
          World Map
        </CardTitle>
        <div className="flex items-center gap-2">
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
        </div>
      </CardHeader>
      <CardContent className="px-6 py-4">
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Google Maps Embed URL</span>
            </div>
            <Input 
              className="text-xs bg-muted/30"
              value={mapUrl}
              onChange={(e) => setMapUrl(e.target.value)}
              placeholder="Paste Google Maps embed URL here..."
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={handleSave}>Save Map</Button>
            </div>
          </div>
        ) : (
          <div className="aspect-video w-full rounded-md overflow-hidden border border-border/50">
            <iframe 
              src={initialMapUrl} 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen={true} 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
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
  const updateSessionInGameDate = useMutation(api.sessions.updateInGameDate)
  
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [pfFilter, setPfFilter] = useState(true)
  const [dndFilter, setDndFilter] = useState(true)
  const [sessionsLimit, setSessionsLimit] = useState(5)
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingMap, setIsEditingMap] = useState(false)
  const [newName, setNewName] = useState('')
  const [viewMode, setViewMode] = useState<'reputation' | 'calendar'>('reputation')

  const userIds = useMemo(() => {
    if (!world) return [];
    return [world.owner];
  }, [world]);

  const usersMetadataRaw = useQuery(api.users.getUsersByIds, { userIds });

  const userMetadata = useMemo(() => {
    if (!usersMetadataRaw) return {};
    const map: Record<string, UserMetadata> = {};
    usersMetadataRaw.forEach(user => {
        map[user.userId] = {
            name: user.name || user.username || `User ${user.userId.slice(-4)}`,
            imageUrl: user.imageUrl,
            extraSessionsPlayed: user.extraSessionsPlayed,
            extraSessionsRan: user.extraSessionsRan,
        };
    });
    return map;
  }, [usersMetadataRaw]);

  const isOwner = world ? userId === world.owner : false
  const repVisible = world?.reputationVisible ?? false
  const calVisible = world?.calendarVisible ?? false
  
  // Only show switcher if user is owner OR both systems are public
  const showSwitcher = isOwner || (repVisible && calVisible)
  
  // Determine which system to actually display
  const effectiveViewMode = useMemo(() => {
    if (isOwner) return viewMode;
    if (repVisible && calVisible) return viewMode;
    if (repVisible) return 'reputation';
    if (calVisible) return 'calendar';
    return null;
  }, [isOwner, viewMode, repVisible, calVisible]);

  useEffect(() => {
    if (world) {
      setNewName(world.name)
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
        router.push(`/world/${encodedNewName}`)
    } catch (e) {
        alert(e instanceof Error ? e.message : 'Failed to rename world')
    }
  }

  const handleDropSession = async (sessionId: string, year: number, month: number, day: number) => {
    try {
        await updateSessionInGameDate({
            sessionId: sessionId as Id<'sessions'>,
            inGameDate: { year, month, day }
        });
        toast.success("Session in-game date updated!");
    } catch (e) {
        toast.error("Failed to update session date.");
    }
  }

  const userCharacterIds = useMemo(() => new Set(userCharacters?.map(c => c._id) ?? []), [userCharacters])

  const allFilteredSessions = useMemo(() => {
    if (!sessions) return []
    const filtered = sessions.filter(s => {
        const matchesTab = activeTab === 'past' ? s.locked : !s.locked;
        if (!matchesTab) return false;
        if (s.system === 'PF' && !pfFilter) return false;
        if (s.system === 'DnD' && !dndFilter) return false;
        return true;
    })
    return filtered.sort((a, b) => {
        if (activeTab === 'past') return (b.date || 0) - (a.date || 0)
        if (a.date && b.date) return a.date - b.date
        if (a.date) return -1
        if (b.date) return 1
        return 0
    })
  }, [sessions, activeTab, pfFilter, dndFilter])

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
        <Button variant="ghost" size="sm" className="sm:px-3 sm:w-auto w-9 px-0" asChild>
          <Link href="/">
            <ChevronLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
        </Button>

        <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center bg-muted/30 p-1 rounded-md gap-1 mr-2">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setPfFilter(!pfFilter)}
                    className={cn(
                        "h-9 w-9 p-0 transition-all duration-300",
                        pfFilter ? "opacity-100 scale-110 brightness-110 shadow-sm" : "opacity-30 grayscale scale-95"
                    )}
                >
                    <img src="/PFVoid.svg" alt="Pathfinder" className="h-6 w-6" />
                </Button>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setDndFilter(!dndFilter)}
                    className={cn(
                        "h-9 w-9 p-0 transition-all duration-300",
                        dndFilter ? "opacity-100 scale-110 brightness-110 shadow-sm" : "opacity-30 grayscale scale-95"
                    )}
                >
                    <img src="/DnDVoid.svg" alt="D&D" className="h-6 w-6" />
                </Button>
            </div>
            <ThemeToggle />
            <UserButton />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
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
                                >
                                    <Book className="h-8 w-8" />
                                </a>
                                {userId === world.owner && (
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                                        onClick={() => setIsEditingName(true)}
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
                          draggable={userId === session.owner}
                          onDragStart={(e: any) => {
                            if (userId === session.owner) {
                                e.dataTransfer.setData('sessionId', session._id);
                                e.dataTransfer.effectAllowed = 'move';
                            }
                          }}
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

          <div className="hidden lg:block">
            <QuestList worldId={world._id} worldOwner={world.owner} filters={{ pf: pfFilter, dnd: dndFilter }} />
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-8">
          <WorldDescription 
            worldId={world._id} 
            initialDescription={world.description || ''} 
            isOwner={userId === world.owner} 
            hasMap={!!world.mapEmbed}
            onAddMap={() => setIsEditingMap(true)}
          />
          <WorldMap 
            worldId={world._id} 
            initialMapUrl={world.mapEmbed} 
            isOwner={userId === world.owner} 
            isEditing={isEditingMap}
            setIsEditing={setIsEditingMap}
          />

          {showSwitcher && (
            <div className="flex justify-center -mb-4 relative z-10">
              <div className="bg-muted p-1 rounded-full border border-border/50 flex gap-1 shadow-sm">
                <Button 
                  variant={viewMode === 'reputation' ? "secondary" : "ghost"} 
                  size="sm" 
                  className="rounded-full h-8 px-4 text-xs font-bold gap-2"
                  onClick={() => setViewMode('reputation')}
                >
                  <Users className="h-3.5 w-3.5" />
                  Reputation
                </Button>
                <Button 
                  variant={viewMode === 'calendar' ? "secondary" : "ghost"} 
                  size="sm" 
                  className="rounded-full h-8 px-4 text-xs font-bold gap-2"
                  onClick={() => setViewMode('calendar')}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Calendar
                </Button>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {effectiveViewMode === 'reputation' ? (
              <motion.div
                key="reputation"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <ReputationSystem
                  worldId={world._id}
                  worldName={world.name}
                />
              </motion.div>
            ) : effectiveViewMode === 'calendar' ? (
              <motion.div
                key="calendar"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <WorldCalendar 
                  worldId={world._id}
                  worldName={world.name}
                  calendarJSON={world.calendar}
                  isOwner={userId === world.owner}
                  isVisible={world.calendarVisible ?? false}
                  sessions={sessions || []}
                  onDropSession={handleDropSession}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="lg:hidden">
          <QuestList worldId={world._id} worldOwner={world.owner} filters={{ pf: pfFilter, dnd: dndFilter }} />
        </div>
      </div>
    </div>
  )
}
