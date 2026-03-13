'use client'

import { useParams, notFound } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft, Globe, Calendar, Book, Lock, Shield, User, MapPin, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatDate, formatTime, getLevelBadgeStyle } from '@/lib/utils'
import { useState, useEffect, useMemo } from 'react'
import { getUsernames, UserMetadata } from '@/app/stats/actions'
import { useAuth } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import '@/components/sessions/sessions.css'

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

        {/* Right Column: Bento Grid Placeholders */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="md:col-span-2 min-h-[400px] flex flex-col items-center justify-center bg-muted/5 border-dashed relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="text-muted-foreground text-center z-10 p-8">
              <Globe className="h-16 w-16 mx-auto mb-6 opacity-20 group-hover:opacity-40 transition-opacity" />
              <h3 className="text-2xl font-bold text-foreground mb-2">World Chronicles</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Coming soon: A timeline of major events, campaign highlights, and historical milestones of {world.name}.
              </p>
            </div>
          </Card>
          
          <Card className="min-h-[200px] flex flex-col items-center justify-center bg-muted/5 border-dashed relative group">
            <div className="text-muted-foreground text-center z-10 p-6">
              <MapPin className="h-10 w-10 mx-auto mb-4 opacity-20 group-hover:opacity-40 transition-opacity" />
              <h3 className="text-lg font-bold text-foreground mb-1">Key Locations</h3>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Placeholder</p>
            </div>
          </Card>
          
          <Card className="min-h-[200px] flex flex-col items-center justify-center bg-muted/5 border-dashed relative group">
            <div className="text-muted-foreground text-center z-10 p-6">
              <Shield className="h-10 w-10 mx-auto mb-4 opacity-20 group-hover:opacity-40 transition-opacity" />
              <h3 className="text-lg font-bold text-foreground mb-1">Notable NPCs</h3>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Placeholder</p>
            </div>
          </Card>

          <Card className="md:col-span-2 min-h-[150px] flex flex-col items-center justify-center bg-muted/5 border-dashed relative group">
            <div className="text-muted-foreground text-center z-10 p-4">
              <User className="h-8 w-8 mx-auto mb-3 opacity-20 group-hover:opacity-40 transition-opacity" />
              <h3 className="text-md font-bold text-foreground mb-1">Lore & Mythology</h3>
              <p className="text-xs text-muted-foreground">Deep dive into the myths and legends of {world.name}.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

