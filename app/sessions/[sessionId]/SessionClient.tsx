'use client'

import { useParams, useRouter, notFound } from 'next/navigation'
import { useQuery, useMutation, useAction, Authenticated, Unauthenticated } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { Id, Doc } from '@/convex/_generated/dataModel'
import Link from 'next/link'
import { Book, Calendar, ChevronLeft, Lock as LockIcon, Shield, MapPin, Clock, Unlock, Globe } from 'lucide-react'
import { useAuth, SignInButton } from '@clerk/nextjs'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatDate, formatTime as formatTimeUtil } from '@/lib/utils'
import { fireJoinParticles, fireGoldParticles } from '@/lib/particles'
import { toast } from 'sonner'
import { track } from '@vercel/analytics'
import { getUsernames, UserMetadata } from '@/app/stats/actions'
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
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'

// Sub-components
import AttendingCharactersList from '@/components/sessions/details/AttendingCharactersList'
import InterestedPlayersList from '@/components/sessions/details/InterestedPlayersList'
import SessionManagement from '@/components/sessions/details/SessionManagement'
import SessionJoinForm from '@/components/sessions/details/SessionJoinForm'

interface SessionWithGM extends Doc<'sessions'> {
    attendingCharacters: Doc<'characters'>[];
    isOwner: boolean;
    gmCharacterData?: Doc<'characters'> | null;
    worldName: string;
    interestedPlayers?: { userId: string; username: string }[];
}

export default function SessionClient() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const router = useRouter()

  const { userId } = useAuth()
  const session = useQuery(api.sessions.getSession, { sessionId }) as SessionWithGM | undefined | null
  const xpGainsPreview = useQuery(api.sessions.previewXPGains, session?._id ? { sessionId: session._id } : "skip")
  const userCharacters = useQuery(api.characters.listCharacters)
  const joinSession = useMutation(api.sessions.joinSession)
  const leaveSession = useMutation(api.sessions.leaveSession)
  const lockSession = useMutation(api.sessions.lockSession)
  const unlockSession = useMutation(api.sessions.unlockSession)
  const forceLockSession = useMutation(api.sessions.forceLockSession)
  const forceUnlockSession = useMutation(api.sessions.forceUnlockSession)
  const adminAddCharacterToSession = useMutation(api.sessions.adminAddCharacterToSession)
  const expressInterest = useMutation(api.sessions.expressInterest)
  const withdrawInterest = useMutation(api.sessions.withdrawInterest)
  const sendNotification = useAction(api.discord.sendSessionNotification)

  const isAdmin = useQuery(api.sessions.isAdminQuery)
  const allCharacters = useQuery(api.characters.listAllCharacters, isAdmin ? undefined : "skip")

  const [selectedCharacterId, setSelectedCharacterId] = useState<Id<'characters'> | ''>('')
  const [selectedAdminCharacterId, setSelectedAdminCharacterId] = useState<Id<'characters'> | ''>('')
  const [userMetadata, setUserMetadata] = useState<Record<string, UserMetadata>>({})
  const [isJoining, setIsJoining] = useState(false)
  const [isExpressingInterest, setIsExpressingInterest] = useState(false)
  const [leavingCharacterId, setLeavingCharacterId] = useState<string | null>(null)
  const [optimisticInterestedPlayers, setOptimisticInterestedPlayers] = useState<{ userId: string; username: string }[] | null>(null)

  useEffect(() => {
    if (session?.interestedPlayers) {
      setOptimisticInterestedPlayers(null)
    }
  }, [session?.interestedPlayers])

  const currentInterestedPlayers = optimisticInterestedPlayers ?? session?.interestedPlayers ?? []

  useEffect(() => {
    if (session) {
        const userIds = new Set<string>();
        if (session.attendingCharacters) {
            session.attendingCharacters.forEach(c => userIds.add(c.userId));
        }
        if (session.interestedPlayers) {
            session.interestedPlayers.forEach(p => userIds.add(p.userId));
        }
        if (userIds.size > 0) {
            getUsernames(Array.from(userIds)).then(setUserMetadata);
        }
    }
  }, [session?.attendingCharacters, session?.interestedPlayers])

  const isLoading = session === undefined || 
                    isAdmin === undefined || 
                    (isAdmin && allCharacters === undefined);

  if (isLoading) {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="flex justify-between items-center mb-6">
                <Skeleton className="h-9 w-32" />
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-24" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="space-y-4 flex-grow">
                                    <Skeleton className="h-9 w-64" />
                                    <Skeleton className="h-6 w-48" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-72" />
                                        <Skeleton className="h-4 w-60" />
                                    </div>
                                </div>
                                <Skeleton className="h-7 w-20 rounded-full" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-7 w-48 mb-4" />
                            <div className="space-y-3">
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="space-y-8">
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-7 w-32" />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
  }

  if (session === null) {
    notFound()
    return null
  }

  const userCharacterIds = new Set(userCharacters?.map(c => c._id) ?? [])
  const hasUserCharacterInSession = (userCharacters ?? []).some(userChar =>
    session.attendingCharacters.some(sessionChar => sessionChar._id === userChar._id)
  )

  const handleJoin = async (event: React.MouseEvent) => {
    if (!selectedCharacterId) return
    setIsJoining(true)
    fireJoinParticles(event.clientX, event.clientY);
    try {
        await joinSession({
            sessionId: session._id,
            characterId: selectedCharacterId as Id<'characters'>,
        })
        track('session_joined', { worldName: session.worldName })
        setSelectedCharacterId('')
    } catch (e) {
        alert(e instanceof Error ? e.message : 'Failed to join session')
    } finally {
        setIsJoining(false)
    }
  }

  const handleLeave = async (characterId: Id<'characters'>) => {
    setLeavingCharacterId(characterId)
    try {
        await leaveSession({ sessionId: session._id, characterId })
    } catch (e) {
        alert(e instanceof Error ? e.message : 'Failed to leave session')
    } finally {
        setLeavingCharacterId(null)
    }
  }

  const handleLock = async () => {
    try { 
        await lockSession({ sessionId: session._id }) 
        fireGoldParticles(window.innerWidth / 2, window.innerHeight / 2);
        toast.success("Thank you, Voidmaster!", {
            description: "Running a session means a lot to us. Your work and effort are very much appreciated!",
            duration: 8000,
            icon: '🏆'
        });
    }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed to lock session') }
  }

  const handleUnlock = async () => {
    try { await unlockSession({ sessionId: session._id }) }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed to unlock session') }
  }

  const handleForceLock = async () => {
    try { 
        await forceLockSession({ sessionId: session._id }) 
        fireGoldParticles(window.innerWidth / 2, window.innerHeight / 2);
        toast.success("Thank you, Voidmaster!", {
            description: "Running a session means a lot to us. Your work and effort are very much appreciated!",
            duration: 8000,
            icon: '🏆'
        });
    }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed to force close session') }
  }

  const handleForceUnlock = async () => {
    try { await forceUnlockSession({ sessionId: session._id }) }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed to force unlock session') }
  }

  const handleAdminAddCharacter = async () => {
    if (!selectedAdminCharacterId) return
    try {
        await adminAddCharacterToSession({
            sessionId: session._id,
            characterId: selectedAdminCharacterId as Id<'characters'>,
        })
        setSelectedAdminCharacterId('')
    } catch (e) {
        alert(e instanceof Error ? e.message : 'Failed to add character as admin')
    }
  }

  const handleExpressInterest = async () => {
    if (!session || !userId) return
    
    // Optimistic Update
    const userDisplay = userCharacters?.[0]?.name || 'You'
    setOptimisticInterestedPlayers([...currentInterestedPlayers, { userId, username: userDisplay }])
    
    setIsExpressingInterest(true)
    try { 
        await expressInterest({ sessionId: session._id }) 
        track('session_interest_expressed', { worldName: session.worldName })
    }
    catch (e) { 
        setOptimisticInterestedPlayers(null)
        alert(e instanceof Error ? e.message : 'Failed to express interest') 
    }
    finally { setIsExpressingInterest(false) }
  }

  const handleWithdrawInterest = async () => {
    if (!session || !userId) return

    // Optimistic Update
    setOptimisticInterestedPlayers(currentInterestedPlayers.filter(p => p.userId !== userId))

    setIsExpressingInterest(true)
    try { await withdrawInterest({ sessionId: session._id }) }
    catch (e) { 
        setOptimisticInterestedPlayers(null)
        alert(e instanceof Error ? e.message : 'Failed to withdraw interest') 
    }
    finally { setIsExpressingInterest(false) }
  }

  const handleSendToDiscord = async (type: 'new' | 'remind' | 'cancel') => {
    try {
      await sendNotification({ sessionId: session._id, type })
      toast.success(`Discord ${type} notification sent!`)
    } catch (error) {
      console.error('Failed to send to Discord:', error)
      toast.error('Failed to send session details to Discord.')
    }
  }

  const availableCharacters = (userCharacters ?? []).filter(char => 
    !session.characters.includes(char._id) && char.system === session.system
  )
  const adminAvailableCharacters = allCharacters?.filter(char => 
    !session.characters.includes(char._id) && char.system === session.system
  ) ?? []
  const isFull = session.characters.length >= session.maxPlayers

  const getGoogleCalendarLink = () => {
    if (!session.date) return null
    const start = new Date(session.date).toISOString().replace(/-|:|\.\d+/g, '')
    const end = new Date(session.date + 4 * 3600000).toISOString().replace(/-|:|\.\d+/g, '')
    const title = encodeURIComponent(`Void Guild: ${session.worldName}`)
    const details = encodeURIComponent(`Session for world "${session.worldName}".\n\nLevel: ${session.level ?? 'TBD'}\nPlayers joined: ${session.attendingCharacters.length}/${session.maxPlayers}\nLink: ${window.location.origin}/sessions/${session._id}`)
    const location = encodeURIComponent(session.location || '')
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`
  }

  const calendarLink = getGoogleCalendarLink()

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" size="sm" className="sm:px-3 sm:w-auto w-9 px-0" asChild>
          <Link href="/">
            <ChevronLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
        </Button>
        <div className="flex gap-2">
            {calendarLink && (
                <Button variant="outline" size="sm" asChild className="sm:px-3 sm:w-auto w-9 px-0">
                    <a href={calendarLink} target="_blank" rel="noopener noreferrer">
                        <Calendar className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Add to Calendar</span>
                    </a>
                </Button>
            )}
            {isAdmin && session.locked && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="sm:px-3 sm:w-auto w-9 px-0">
                            <Unlock className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Unlock Session</span>
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to unlock the session?</AlertDialogTitle>
                            <AlertDialogDescription className="text-destructive font-bold">
                                This will undo XP given to characters in this session.
                                WARNING: This will break XP values if this isn&apos;t the latest session for these characters.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-wrap justify-end">
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleUnlock} variant="destructive">
                                Unlock (Revert XP)
                            </AlertDialogAction>
                            <AlertDialogAction onClick={handleForceUnlock} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                Force Unlock (Keep XP)
                            </AlertDialogAction>
                        </AlertDialogFooter>                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card className={session.locked ? "border-amber-200 bg-amber-50/10" : session.planning ? "border-purple-200 bg-purple-50/10" : ""}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="space-y-4 flex-grow">
                  <div>
                    <CardTitle className="text-3xl font-bold flex flex-wrap items-center gap-3">
                        <span>{session.worldName}</span>
                        <div className="flex items-center gap-2 shrink-0">
                            {session.locked && <LockIcon className="h-5 w-5 text-amber-500" />}
                            {session.planning && <div className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest font-black shadow-sm">Planning</div>}
                            <a 
                                href={`https://void.tarragon.be/Session-Reports/${session.date ? new Date(session.date).toISOString().slice(0, 10) : 'TBD'}-${session.worldName.replace(/\s+/g, '-')}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-purple-500"
                                onClick={() => track('session_report_viewed', { worldName: session.worldName })}
                            >
                                <Book size={20} />
                            </a>
                            <Link 
                                href={`/world/${encodeURIComponent(session.worldName)}`}
                                className="text-muted-foreground hover:text-purple-500"
                                title="View World Details"
                            >
                                <Globe size={20} />
                            </Link>
                        </div>
                    </CardTitle>
                    <div className="text-lg text-muted-foreground mt-1">
                        {session.date ? (
                            <>{formatDate(new Date(session.date))} at {formatTimeUtil(new Date(session.date))}</>
                        ) : (
                            <span className="italic">Date and Time TBD</span>
                        )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {session.date ? (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4 shrink-0" />
                                <span>Please arrive between {formatTimeUtil(new Date(session.date))} and {formatTimeUtil(new Date(session.date + 30 * 60 * 1000))}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground ml-6 italic">Session starts 30 minutes after.</p>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 shrink-0" />
                            <span>Arrival time will be announced once a date is set.</span>
                        </div>
                    )}
                    {session.location && (
                        <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <a href={session.location} target="_blank" rel="noopener noreferrer">
                                View session location on Google Maps
                            </a>
                        </div>
                    )}
                  </div>

                  <div className="mt-2 flex gap-2 flex-wrap items-center">
                    <div className="flex items-center gap-2 bg-secondary px-2 py-0.5 rounded-md whitespace-nowrap">
                        <span className="text-sm font-medium">
                            Session Level {session.level ?? 'TBD'}
                        </span>
                        {session.system && (
                            <img 
                                src={session.system === 'PF' ? '/PFVoid.svg' : '/DnDVoid.svg'} 
                                alt={session.system} 
                                className="h-4 w-4"
                            />
                        )}
                    </div>
                    {session.isOwner && session.gmCharacterData && (
                        <span className="text-sm font-medium px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md flex items-center gap-1 whitespace-nowrap">
                            <Shield className="h-3 w-3" /> GM: {session.gmCharacterData.name}
                            {session.gmCharacterData.system && (
                                <img 
                                    src={session.gmCharacterData.system === 'PF' ? '/PFVoid.svg' : '/DnDVoid.svg'} 
                                    alt={session.gmCharacterData.system} 
                                    className="h-3.5 w-3.5 ml-0.5"
                                />
                            )}
                        </span>
                    )}
                  </div>
                </div>
                <div className="bg-muted px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap self-start">
                    {session.attendingCharacters.length} / {session.maxPlayers} Players
                </div>
              </div>
              {session.locked && (
                <div className="mt-4 p-3 bg-amber-100/50 border border-amber-200 rounded-md text-sm text-amber-700 font-medium flex items-center gap-2">
                    <LockIcon className="h-4 w-4" /> 
                    <span>This session has ended. Participating characters have been awarded XP.</span>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <h3 className="text-xl font-semibold mb-4 flex items-center justify-between">
                Attending Characters
                {isAdmin && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="ml-2 h-7 w-7 p-0">
                        +
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Admin: Add Character</DialogTitle>
                        <DialogDescription>Select a character to add to this session.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        {session.locked ? (
                          <p className="text-sm text-muted-foreground italic text-center p-4 bg-muted/30 rounded-md">This session has ended.</p>
                        ) : isFull ? (
                          <p className="text-sm text-destructive italic text-center p-4 bg-destructive/5 rounded-md">This session is full, cannot add more.</p>
                        ) : allCharacters && allCharacters.length > 0 ? (
                          <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                              <label htmlFor="admin-character-select" className="text-sm font-medium">Select Character</label>
                              <select
                                id="admin-character-select"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={selectedAdminCharacterId}
                                onChange={(e) => setSelectedAdminCharacterId(e.target.value as Id<'characters'>)}
                              >
                                <option value="">-- Choose a character --</option>
                                {adminAvailableCharacters.map((char) => (
                                  <option key={char._id} value={char._id}>{char.name} (Lvl {char.lvl})</option>
                                ))}
                              </select>
                            </div>
                            <Button className="w-full" disabled={!selectedAdminCharacterId} onClick={handleAdminAddCharacter}>Add Character (Admin)</Button>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic text-center p-4 bg-muted/10 rounded-md">No characters available to add.</p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </h3>
              <AttendingCharactersList 
                characters={session.attendingCharacters}
                userCharacterIds={userCharacterIds}
                sessionLocked={session.locked}
                sessionPlanning={session.planning}
                isSessionOwner={session.isOwner}
                onLeave={handleLeave}
                userMetadata={userMetadata}
                leavingCharacterId={leavingCharacterId}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold mb-4">Interested Players</CardTitle>
            </CardHeader>
            <CardContent>
              <InterestedPlayersList 
                interestedPlayers={currentInterestedPlayers} 
                userMetadata={userMetadata}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {(session.isOwner || isAdmin) && !session.locked && (
            <SessionManagement 
                session={session}
                isAdmin={isAdmin}
                onSendToDiscord={handleSendToDiscord}
                onLock={handleLock}
                onForceLock={handleForceLock}
                xpGainsPreview={xpGainsPreview || []}
            />
          )}

          {userId !== session.owner ? (
            <>
              <Authenticated>
                {!hasUserCharacterInSession && (
                    <Card className={session.planning ? "border-purple-200 bg-purple-50/20" : ""}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Interested?
                            {session.planning && <div className="text-[8px] bg-purple-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-widest font-black">Planning</div>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {session.locked ? (
                        <div className="text-sm text-muted-foreground italic text-center p-4 bg-muted/30 rounded-md">
                            This session has ended.
                        </div>
                        ) : (
                        <div className="space-y-4">
                            {session.planning ? (
                                <div className="text-sm text-purple-700 dark:text-purple-300 italic text-center p-4 bg-purple-500/10 rounded-md">
                                    This session is in <b>planning</b>. Let the Voidmaster know you&apos;re interested to help them pick a date!
                                </div>
                            ) : isFull && !currentInterestedPlayers?.some(p => p.userId === userId) && (
                                <div className="text-sm text-destructive italic text-center p-4 bg-destructive/5 rounded-md">
                                    This session is currently full, but you can still express interest.
                                </div>
                            )}
                            {currentInterestedPlayers?.some(p => p.userId === userId) ? (
                            <Button className="w-full" variant="outline" onClick={handleWithdrawInterest} disabled={isExpressingInterest}>
                                {isExpressingInterest ? 'Updating...' : 'Not anymore :('}
                            </Button>
                            ) : (
                            <Button className="w-full" onClick={handleExpressInterest} disabled={isExpressingInterest} variant={session.planning ? "default" : "outline"}>
                                {isExpressingInterest ? 'Updating...' : 'Yes! :)'}
                            </Button>
                            )}
                        </div>                            )}
                            </CardContent>
                            </Card>
                            )}

                            <SessionJoinForm 
                            sessionLocked={session.locked}
                            sessionPlanning={session.planning}
                            isFull={isFull}
                            availableCharacters={availableCharacters}
                            userCharactersCount={userCharacters?.length ?? 0}
                            selectedCharacterId={selectedCharacterId}
                            hasUserCharacterInSession={hasUserCharacterInSession}
                            onCharacterSelect={(id) => setSelectedCharacterId(id)}
                            onJoin={handleJoin}
                            isJoining={isJoining}
                            />              </Authenticated>

              <Unauthenticated>
                <Card>
                    <CardHeader>
                        <CardTitle>Join the Void</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Sign in to join this session, express interest, or manage your characters.
                        </p>
                        <SignInButton mode="modal">
                            <Button className="w-full">Sign In / Sign Up</Button>
                        </SignInButton>
                    </CardContent>
                </Card>
              </Unauthenticated>
            </>
          ) : null}
        </div>
      </div>
      <div className="text-center mt-8 text-sm text-muted-foreground">
        Thank you for playing with us!<br/>
        We encourage tipping your <b className="text-primary">Voidmaster</b> for their hard work.
      </div>
    </div>
  )
}
