'use client'

import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'
import SessionDialog from './session-dialog'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Sessions() {
  const [showPastSessions, setShowPastSessions] = useState(false)
  const sessions = useQuery(api.sessions.listSessions, { past: showPastSessions })
  const isGM = useQuery(api.sessions.isGameMasterQuery)
  const userCharacters = useQuery(api.characters.listCharacters)

  const userCharacterIds = new Set(userCharacters?.map(c => c._id) ?? [])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{showPastSessions ? 'Past Sessions' : 'Upcoming Sessions'}</CardTitle>
        <div className="flex gap-2">
          {isGM && <SessionDialog />}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPastSessions(!showPastSessions)}
          >
            {showPastSessions ? 'Upcoming' : 'Past'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sessions === undefined ? (
          <p>Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <p>No {showPastSessions ? 'past' : 'upcoming'} sessions found.</p>
        ) : (
          <ul className="space-y-4">
            {sessions.map((session) => {
              const hasJoined = !showPastSessions && session.characters.some(id => userCharacterIds.has(id))
              
              return (
                <li key={session._id} className="border-b pb-2 last:border-0 flex justify-between items-start">
                  <Link 
                    href={`/sessions/${session._id}`} 
                    className={cn(
                        "flex-grow p-2 rounded-md transition-colors relative border border-transparent",
                        hasJoined ? "bg-green-100/50 hover:bg-green-100 border-green-200" : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("font-semibold", hasJoined ? "text-green-700" : "text-primary")}>
                          {session.world}
                      </div>
                      {session.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </div>
                    <div className="text-sm font-medium">
                      {new Date(session.date).toLocaleDateString()} at{' '}
                      {new Date(session.date).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {session.characters.length} / {session.maxPlayers} players
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
