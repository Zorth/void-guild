'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { Id, Doc } from '@/convex/_generated/dataModel'
import Link from 'next/link'
import { Book, ChevronLeft, Lock as LockIcon, Trash2, Pencil, Unlock, Shield, CheckCircle2, MapPin, Clock } from 'lucide-react'
import SessionDialog from '@/app/session-dialog'
import { useAuth } from '@clerk/nextjs'
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

interface SessionWithGM extends Doc<'sessions'> {
    attendingCharacters: Doc<'characters'>[];
    isOwner: boolean;
    gmCharacterData?: Doc<'characters'> | null;
    worldName: string; // Add worldName to the interface
    interestedPlayers?: { userId: string; username: string }[]; // New field
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
  const deleteSession = useMutation(api.sessions.deleteSession)
  const adminAddCharacterToSession = useMutation(api.sessions.adminAddCharacterToSession)
  const expressInterest = useMutation(api.sessions.expressInterest)
  const withdrawInterest = useMutation(api.sessions.withdrawInterest)

  const { userId } = useAuth()
  const isAdmin = useQuery(api.sessions.isAdminQuery)
  const allCharacters = useQuery(api.characters.listAllCharacters, isAdmin ? undefined : "skip")

  const [selectedCharacterId, setSelectedCharacterId] = useState<Id<'characters'> | ''>('')
  const [selectedAdminCharacterId, setSelectedAdminCharacterId] = useState<Id<'characters'> | ''>('')

  // Handle redirection to home page if session is not found/deleted
  useEffect(() => {
    if (session === null) {
      router.push('/')
    }
  }, [session, router])

  if (session === undefined || userCharacters === undefined || userCharacters === null || isAdmin === undefined || (isAdmin && allCharacters === undefined)) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading session details...</div>
  }

  if (session === null) {
    return null;
  }

  // Check if the current user has any character already in the session
  const hasUserCharacterInSession = userCharacters.some(userChar =>
    session.attendingCharacters.some(sessionChar => sessionChar._id === userChar._id)
  )

  const handleJoin = async () => {
    if (!selectedCharacterId) return
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
        await leaveSession({
            sessionId: session._id,
            characterId,
        })
    } catch (e) {
        alert(e instanceof Error ? e.message : 'Failed to leave session')
    }
  }

  const handleLock = async () => {
    try {
        await lockSession({ sessionId: session._id })
    } catch (e) {
        alert(e instanceof Error ? e.message : 'Failed to lock session')
    }
  }

  const handleUnlock = async () => {
    try {
        await unlockSession({ sessionId: session._id })
    } catch (e) {
        alert(e instanceof Error ? e.message : 'Failed to unlock session')
    }
  }

  const handleForceLock = async () => {
    try {
        await forceLockSession({ sessionId: session._id })
    } catch (e) {
        alert(e instanceof Error ? e.message : 'Failed to force close session')
    }
  }

  const handleForceUnlock = async () => {
    try {
        await forceUnlockSession({ sessionId: session._id })
    } catch (e) {
        alert(e instanceof Error ? e.message : 'Failed to force unlock session')
    }
  }

  const handleDelete = async () => {
    await deleteSession({ sessionId: session._id })
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
    try {
        await expressInterest({ sessionId: session._id })
    } catch (e) {
        alert(e instanceof Error ? e.message : 'Failed to express interest')
    }
  }

  const handleWithdrawInterest = async () => {
    try {
        await withdrawInterest({ sessionId: session._id })
    } catch (e) {
        alert(e instanceof Error ? e.message : 'Failed to withdraw interest')
    }
  }

  const handleSendToDiscord = async () => {
    const webhookUrl = process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL
    if (!webhookUrl) {
      alert('Discord Webhook URL is not configured.')
      return
    }
    const sessionTime = new Date(session.date)
    const formattedDate = sessionTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const formattedTime = sessionTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

    const embed = {
      title: `New Session Alert: ${session.worldName}`,
      description: `A new session for "${session.worldName}" has been announced!`,
      color: 5814783,
      fields: [
        {
          name: 'Date & Time',
          value: `${formattedDate} at ${formattedTime}`,
          inline: false,
        },
        {
          name: 'Level',
          value: session.level ? `Level ${session.level}` : 'TBD',
          inline: true,
        },
        {
          name: 'Players',
          value: `${session.attendingCharacters.length}/${session.maxPlayers}`,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
      url: `${window.location.origin}/sessions/${session._id}`,
    }

    if (session.location) {
        embed.fields.push({
            name: 'Location',
            value: `[View on Google Maps](${session.location})`,
            inline: false,
        })
    }

    if (session.attendingCharacters && session.attendingCharacters.length > 0) {
        embed.fields.push({
            name: 'Attending Characters',
            value: session.attendingCharacters.map(char => char.name).join(', '),
            inline: false,
        })
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeds: [embed] }),
      })
      alert('Session details sent to Discord!')
    } catch (error) {
      console.error('Failed to send to Discord:', error)
      alert('Failed to send session details to Discord.')
    }
  }

  // Filter out characters already in the session
  const availableCharacters = userCharacters.filter(
    (char) => !session.characters.includes(char._id)
  )

  // Filter all characters for admin, excluding those already in session
  const adminAvailableCharacters = allCharacters?.filter(
    (char) => !session.characters.includes(char._id)
  ) ?? []

  const isFull = session.characters.length >= session.maxPlayers

  const sessionTime = new Date(session.date)
  const arrivalEndTime = new Date(session.date + 30 * 60 * 1000)
  
  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

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
            {session.isOwner && (
                <>
                    {session.locked ? (
                        <>
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
                                        <AlertDialogAction onClick={handleUnlock} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                            Unlock (Revert XP)
                                        </AlertDialogAction>
                                        <AlertDialogAction onClick={handleForceUnlock} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                            Force Unlock (Keep XP)
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" size="sm" onClick={handleSendToDiscord} className="sm:px-3 sm:w-auto w-9 px-0">
                                <img src="/discord-icon.svg" alt="Discord" className="sm:mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Announce on Discord</span>
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="default" size="sm" className="sm:px-3 sm:w-auto w-9 px-0">
                                        <CheckCircle2 className="h-4 w-4 sm:mr-2" />
                                        <span className="hidden sm:inline">End Session</span>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="max-w-2xl">
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm End of Session</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        The following characters will be awarded XP and potentially level up based on the session level ({session.level ?? 'Level TBD'}).
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="py-4 space-y-4 max-h-[400px] overflow-auto">
                                    <div className="grid grid-cols-3 font-bold text-sm border-b pb-2">
                                        <span>Character</span>
                                        <span className="text-center">XP Gain</span>
                                        <span className="text-right">New Level</span>
                                    </div>
                                    {xpGainsPreview?.map((p) => (
                                        <div key={p.id} className="grid grid-cols-3 text-sm items-center py-2 border-b last:border-0">
                                            <div className="flex flex-col">
                                                <span className="font-semibold">{p.name}</span>
                                                <span className="text-[10px] text-muted-foreground">Lvl {p.currentLvl} ({p.currentXp} XP)</span>
                                                {p.isGMCharacter && <span className="text-[10px] text-primary flex items-center gap-1"><Shield className="h-2 w-2"/> GM</span>}
                                            </div>
                                            <div className="text-center font-mono text-green-600">
                                                +{p.xpGain}
                                            </div>
                                            <div className="text-right">
                                                {p.newLvl > p.currentLvl ? (
                                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                                        Lvl {p.newLvl} ↑
                                                    </span>
                                                ) : (
                                                    <span>Lvl {p.newLvl}</span>
                                                )}
                                                <div className="text-[10px] text-muted-foreground">({p.newXp} XP)</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <AlertDialogFooter className="flex-wrap justify-end">
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleLock} disabled={session.level === undefined}>Confirm & Award XP</AlertDialogAction>
                                    <AlertDialogAction onClick={handleForceLock} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                        Force Close (No XP)
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        </>
                    )}
                    {!session.locked && (
                        <SessionDialog 
                            session={session} 
                            trigger={
                                <Button variant="outline" size="sm" className="sm:px-3 sm:w-auto w-9 px-0">
                                    <Pencil className="h-4 w-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Edit Session</span>
                                </Button>
                            }
                            hasWorld={true}
                        />
                    )}
                </>
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
                        {sessionTime.toLocaleDateString()} at {formatTime(sessionTime)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Please arrive between {formatTime(sessionTime)} and {formatTime(arrivalEndTime)}</span>
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
                        <DialogDescription>
                          Select a character to add to this session.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        {session.locked ? (
                          <p className="text-sm text-muted-foreground italic text-center p-4 bg-muted/30 rounded-md">
                              This session has ended.
                          </p>
                        ) : isFull ? (
                          <p className="text-sm text-destructive italic text-center p-4 bg-destructive/5 rounded-md">
                              This session is full, cannot add more.
                          </p>
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
                                  <option key={char._id} value={char._id}>
                                    {char.name} (Lvl {char.lvl})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <Button
                              className="w-full"
                              disabled={!selectedAdminCharacterId}
                              onClick={handleAdminAddCharacter}
                            >
                              Add Character (Admin)
                            </Button>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic text-center p-4 bg-muted/10 rounded-md">
                            No characters available to add.
                          </p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </h3>
              {session.attendingCharacters.length === 0 ? (
                <p className="text-muted-foreground italic">No characters have joined this session yet.</p>
              ) : (
                <ul className="grid grid-cols-1 gap-3">
                  {session.attendingCharacters.map((char) => {
                    const canRemove = !session.locked && (session.isOwner || userCharacters.some(uc => uc._id === char._id))
                    return (
                        <li key={char._id} className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
                          <div>
                            <div className="font-bold">{char.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Lvl {char.lvl} {char.class}
                            </div>
                            {char.websiteLink && (
                                <a 
                                    href={char.websiteLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-xs text-blue-500 hover:underline"
                                >
                                    {char.websiteLink}
                                </a>
                            )}
                          </div>
                          {canRemove && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleLeave(char._id)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold mb-4">Interested Players</CardTitle>
            </CardHeader>
            <CardContent>
              {session.interestedPlayers && session.interestedPlayers.length > 0 ? (
                <ul className="grid grid-cols-1 gap-3">
                  {session.interestedPlayers.map((player) => (
                    <li key={player.userId} className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
                      <div className="font-bold">{player.username}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground italic">No players have expressed interest yet.</p>
              )}
            </CardContent>
          </Card>

        </div>


        <div className="space-y-8">
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

          <Card>
            <CardHeader>
              <CardTitle>Join Session</CardTitle>
            </CardHeader>
            <CardContent>
              {session.locked ? (
                <div className="text-sm text-muted-foreground italic text-center p-4 bg-muted/30 rounded-md">
                    This session has ended.
                </div>
              ) : isFull ? (
                <div className="text-sm text-destructive italic text-center p-4 bg-destructive/5 rounded-md">
                    This session is currently full.
                </div>
              ) : availableCharacters.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center p-4 bg-muted/10 rounded-md">
                  {userCharacters.length === 0 
                    ? "You don't have any characters yet. Create one on the home page!" 
                    : "All your characters are already in this session."}
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Select Character</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={selectedCharacterId}
                      onChange={(e) => setSelectedCharacterId(e.target.value as Id<'characters'>)}
                    >
                      <option value="">-- Choose a character --</option>
                      {availableCharacters.map((char) => (
                        <option key={char._id} value={char._id}>
                          {char.name} (Lvl {char.lvl})
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button 
                    className="w-full" 
                    disabled={!selectedCharacterId || hasUserCharacterInSession} // Disable if no character selected or user has char in session
                    onClick={handleJoin}
                  >
                    Join Session
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="text-center mt-8 text-sm text-muted-foreground">
        Thank you for playing with us!<br/>
        We encourage tipping your <b className="text-primary">Voidmaster</b> for their hard work.
      </div>
    </div>
  )
}