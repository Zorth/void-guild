'use client'

import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'
import SessionDialog from './session-dialog'
import Link from 'next/link'
import { Book, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import './sessions.css'
import type { Doc } from '../convex/_generated/dataModel'

type SessionWithDetails = Doc<'sessions'> & {
    isOwner: boolean;
    characterNames: string[];
}

function SevenDayOverview({ sessions, userCharacterIds }: { sessions: SessionWithDetails[], userCharacterIds: Set<string> }) {
    const today = new Date();
    const nextSevenDays = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        date.setHours(0, 0, 0, 0); // Normalize to start of day
        return date;
    });

    const sessionsByDay = sessions.reduce((acc, session) => {
        const sessionDate = new Date(session.date);
        sessionDate.setHours(0, 0, 0, 0); // Normalize to start of day
        const dayString = sessionDate.toDateString();
        if (!acc[dayString]) {
            acc[dayString] = [];
        }
        acc[dayString].push(session);
        return acc;
    }, {} as Record<string, SessionWithDetails[]>);

    return (
        <div className="seven-day-overview-container">
            <div className="seven-day-grid">
                {nextSevenDays.map(day => {
                    const dayString = day.toDateString();
                    const daySessions = sessionsByDay[dayString] || [];
                    
                    let dayBoxClass = "";
                    // Prioritize owner, then joined for day box styling
                    if (daySessions.some(s => s.isOwner)) {
                        dayBoxClass = "day-box-owner";
                    } else if (daySessions.some(s => s.characters.some(id => userCharacterIds.has(id)))) {
                        dayBoxClass = "day-box-joined";
                    }

                    return (
                        <div
                            key={dayString}
                            className={cn(
                                "day-box",
                                dayBoxClass
                            )}
                        >
                            <div className="day-box-header">
                                {day.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                            </div>
                            <div className="day-box-content">
                                {daySessions.map(session => (
                                    <Link href={`/sessions/${session._id}`} key={session._id} className="block text-sm font-medium">
                                        {session.world}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}


export default function Sessions() {
  const [showPastSessions, setShowPastSessions] = useState(false)
  const sessions = useQuery(api.sessions.listSessions, { past: showPastSessions }) as SessionWithDetails[]
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
        ) : (
          <>
            {sessions.length === 0 && <p>No {showPastSessions ? 'past' : 'upcoming'} sessions found.</p>}
            {!showPastSessions && sessions.length > 0 && <SevenDayOverview sessions={sessions} userCharacterIds={userCharacterIds} />}
            <ul className="space-y-4 mt-8">
              {sessions.map((session) => {
                const hasJoined = !showPastSessions && session.characters.some(id => userCharacterIds.has(id))
                
                return (
                  <li key={session._id} className="border-b pb-2 last:border-0 flex justify-between items-start">
                    <Link
                      href={`/sessions/${session._id}`}
                      className={cn(
                          "flex-grow p-2 rounded-md transition-colors relative flex justify-between items-start",
                          session.isOwner 
                              ? "session-owner" 
                              : hasJoined 
                                  ? "session-joined" 
                                  : "session-default"
                      )}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <div className={cn("font-semibold", "session-world")}>
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
                      </div>
                      {showPastSessions && (
                          <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-6 text-xs px-2 mt-1"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent clicking the parent Link
                                e.preventDefault(); // Prevent any default action of the button or parent that might cause navigation
                                window.open(`https://void.tarragon.be/Session-Reports/${new Date(session.date).toISOString().slice(0, 10)}-${session.world.replace(/\s+/g, '-')}`, '_blank');
                              }}
                          >
                              <Book size={32} />
                          </Button>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
