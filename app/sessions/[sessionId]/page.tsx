'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { Id, Doc } from '@/convex/_generated/dataModel'
import Link from 'next/link'
import { Book, Calendar, ChevronLeft, Lock as LockIcon, Shield, MapPin, Clock, Unlock } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatDate, formatTime as formatTimeUtil } from '@/lib/utils'
import { fireJoinParticles, fireGoldParticles } from '@/lib/particles'
import { toast } from 'sonner'
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

export default function SessionDetails() {
  const params = useParams()
  const sessionId = params.sessionId as Id<'sessions'>
  const router = useRouter()

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

  const { userId } = useAuth()
  const isAdmin = useQuery(api.sessions.isAdminQuery)
  const allCharacters = useQuery(api.characters.listAllCharacters, isAdmin ? undefined : "skip")

  const [selectedCharacterId, setSelectedCharacterId] = useState<Id<'characters'> | ''>('')
  const [selectedAdminCharacterId, setSelectedAdminCharacterId] = useState<Id<'characters'> | ''>('')

  useEffect(() => {
    if (session === null) {
      router.push('/')
    }
  }, [session, router])

  if (session === undefined || userCharacters === undefined || userCharacters === null || isAdmin === undefined || (isAdmin && allCharacters === undefined)) {
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

  if (session === null) return null;

  const userCharacterIds = new Set(userCharacters.map(c => c._id))
  const hasUserCharacterInSession = userCharacters.some(userChar =>
    session.attendingCharacters.some(sessionChar => sessionChar._id === userChar._id)
  )

  const handleJoin = async (event: React.MouseEvent) => {
    if (!selectedCharacterId) return
    fireJoinParticles(event.clientX, event.clientY);
    try {
        await joinSession({
            sessionId: session._id,
            characterId: selectedCharacterId as Id<'characters'>,
        })
        setSelectedCharacterId('')
    } catch (e) {
        alert(e instanceof Error ? e.message : 'Failed to join session')
    }
  }

  const handleLeave = async (characterId: Id<'characters'>) => {
    try {
        await leaveSession({ sessionId: session._id, characterId })
    } catch (e) {
        alert(e instanceof Error ? e.message : 'Failed to leave session')
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
    try { await expressInterest({ sessionId: session._id }) }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed to express interest') }
  }

  const handleWithdrawInterest = async () => {
    try { await withdrawInterest({ sessionId: session._id }) }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed to withdraw interest') }
  }

  const handleSendToDiscord = async () => {
    const webhookUrl = process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL
    if (!webhookUrl) {
      alert('Discord Webhook URL is not configured.')
      return
    }
    const sessionTime = new Date(session.date)
    const formattedDate = formatDate(sessionTime)
    const formattedTime = formatTimeUtil(sessionTime)

    const embed = {
      title: `New Session Alert: ${session.worldName}`,
      description: `A new session for "${session.worldName}" has been announced!`,
      color: 5814783,
      fields: [
        { name: 'Date & Time', value: `${formattedDate} at ${formattedTime}`, inline: false },
        { name: 'Level', value: session.level ? `Level ${session.level}` : 'TBD', inline: true },
        { name: 'Players', value: `${session.attendingCharacters.length}/${session.maxPlayers}`, inline: true },
      ],
      timestamp: new Date().toISOString(),
      url: `${window.location.origin}/sessions/${session._id}`,
    }

    if (session.location) {
        embed.fields.push({ name: 'Location', value: `[View on Google Maps](${session.location})`, inline: false })
    }

    if (session.attendingCharacters && session.attendingCharacters.length > 0) {
        embed.fields.push({ name: 'Attending Characters', value: session.attendingCharacters.map(char => char.name).join(', '), inline: false })
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      })
      alert('Session details sent to Discord!')
    } catch (error) {
      console.error('Failed to send to Discord:', error)
      alert('Failed to send session details to Discord.')
    }
  }

  const availableCharacters = userCharacters.filter(char => !session.characters.includes(char._id))
  const adminAvailableCharacters = allCharacters?.filter(char => !session.characters.includes(char._id)) ?? []
  const isFull = session.characters.length >= session.maxPlayers
  const sessionTime = new Date(session.date)
  const arrivalEndTime = new Date(session.date + 30 * 60 * 1000)

  const getGoogleCalendarLink = () => {
    const start = new Date(session.date).toISOString().replace(/-|:|\.\d+/g, '')
    const end = new Date(session.date + 4 * 3600000).toISOString().replace(/-|:|\.\d+/g, '')
    const title = encodeURIComponent(`Void Guild: ${session.worldName}`)
    const details = encodeURIComponent(`Session for world "${session.worldName}".\n\nLevel: ${session.level ?? 'TBD'}\nPlayers joined: ${session.attendingCharacters.length}/${session.maxPlayers}\nLink: ${window.location.origin}/sessions/${session._id}`)
    const location = encodeURIComponent(session.location || '')
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="sm:px-3 sm:w-auto w-9 px-0">
            <ChevronLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Back to Home</span>
          </Button>
        </Link>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild className="sm:px-3 sm:w-auto w-9 px-0">
                <a href={getGoogleCalendarLink()} target="_blank" rel="noopener noreferrer">
                    <Calendar className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Add to Calendar</span>
                </a>
            </Button>
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
          <Card className={session.locked ? "border-amber-200 bg-amber-50/10" : ""}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-4">
                  <div>
                    <CardTitle className="text-3xl font-bold flex items-center gap-3">
                        {session.worldName}
                        {session.locked && <LockIcon className="h-5 w-5 text-amber-500" />}
                        <a 
                            href={`https://void.tarragon.be/Session-Reports/${sessionTime.toISOString().slice(0, 10)}-${session.worldName.replace(/\s+/g, '-')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-blue-500"
                        >
                            <Book size={20} />
                        </a>
                    </CardTitle>
                    <div className="text-lg text-muted-foreground mt-1">
                        {formatDate(sessionTime)} at {formatTimeUtil(sessionTime)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Please arrive between {formatTimeUtil(sessionTime)} and {formatTimeUtil(arrivalEndTime)}</span>
                    </div>
                    {session.location && (
                        <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                            <MapPin className="h-4 w-4" />
                            <a href={session.location} target="_blank" rel="noopener noreferrer">
                                View session location on Google Maps
                            </a>
                        </div>
                    )}
                  </div>

                  <div className="mt-2 flex gap-2 flex-wrap">
                    <span className="text-sm font-medium px-2 py-0.5 bg-secondary rounded-md">
                        Session Level {session.level ?? 'TBD'}
                    </span>
                    {session.isOwner && session.gmCharacterData && (
                        <span className="text-sm font-medium px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md flex items-center gap-1">
                            <Shield className="h-3 w-3" /> GM: {session.gmCharacterData.name}
                        </span>
                    )}
                  </div>
                </div>
                <div className="bg-muted px-3 py-1 rounded-full text-sm font-semibold">
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
                isSessionOwner={session.isOwner}
                onLeave={handleLeave}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold mb-4">Interested Players</CardTitle>
            </CardHeader>
            <CardContent>
              <InterestedPlayersList interestedPlayers={session.interestedPlayers || []} />
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

          {userId !== session.owner && (
            <>
              {userId && !hasUserCharacterInSession && (
                <Card>
                  <CardHeader>
                    <CardTitle>Interested?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {session.locked ? (
                      <div className="text-sm text-muted-foreground italic text-center p-4 bg-muted/30 rounded-md">
                          This session has ended.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {isFull && !session.interestedPlayers?.some(p => p.userId === userId) && (
                          <div className="text-sm text-destructive italic text-center p-4 bg-destructive/5 rounded-md">
                              This session is currently full, but you can still express interest.
                          </div>
                        )}
                        {session.interestedPlayers?.some(p => p.userId === userId) ? (
                          <Button className="w-full" variant="outline" onClick={handleWithdrawInterest}>
                            Not anymore :(
                          </Button>
                        ) : (
                          <Button className="w-full" onClick={handleExpressInterest}>
                            Yes! :)
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <SessionJoinForm 
                sessionLocked={session.locked}
                isFull={isFull}
                availableCharacters={availableCharacters}
                userCharactersCount={userCharacters.length}
                selectedCharacterId={selectedCharacterId}
                hasUserCharacterInSession={hasUserCharacterInSession}
                onCharacterSelect={(id) => setSelectedCharacterId(id)}
                onJoin={handleJoin}
              />
            </>
          )}
        </div>
      </div>
      <div className="text-center mt-8 text-sm text-muted-foreground">
        Thank you for playing with us!<br/>
        We encourage tipping your <b className="text-primary">Voidmaster</b> for their hard work.
      </div>
    </div>
  )
}
