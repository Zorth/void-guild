'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState, useEffect } from 'react'
import SessionDialog from './SessionDialog'
import Link from 'next/link'
import { Book, Lock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, getLevelBadgeStyle } from '@/lib/utils'
import './sessions.css'
import type { Doc } from '@/convex/_generated/dataModel'

type SessionWithDetails = Doc<'sessions'> & {
    isOwner: boolean;
    characterNames: string[];
    worldName: string; // Add worldName to the type
}

function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); 

  return windowSize;
}

function SevenDayOverview({ sessions, userCharacterIds }: { sessions: SessionWithDetails[], userCharacterIds: Set<string> }) {
    const { width } = useWindowSize();
    let numberOfDaysToShow = 7;
    let gridColsClass = "grid-cols-7";

    // Adjust breakpoints based on window width and parent's md:grid-cols-2 layout
    if (width < 768) { // Parent is grid-cols-1
      if (width <= 480) {
        numberOfDaysToShow = 3;
        gridColsClass = "grid-cols-3";
      } else { // width > 480 and < 768
        numberOfDaysToShow = 5;
        gridColsClass = "grid-cols-5";
      }
    } else { // Parent is md:grid-cols-2, so SevenDayOverview gets ~half width
      // We're in a two-column layout, so effective width is roughly width / 2
      if (width / 2 <= 480) { // Effective width for 3 columns
        numberOfDaysToShow = 3;
        gridColsClass = "grid-cols-3";
      } else if (width / 2 <= 768) { // Effective width for 5 columns
        numberOfDaysToShow = 5;
        gridColsClass = "grid-cols-5";
      } else { // Effective width for 7 columns (large desktop)
        numberOfDaysToShow = 7;
        gridColsClass = "grid-cols-7";
      }
    }

    const today = new Date();
    const nextDays = Array.from({ length: numberOfDaysToShow }, (_, i) => {
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
            <div className={cn("grid gap-2", gridColsClass)}>
                {nextDays.map(day => {
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
                                "day-box border border-gray-300 overflow-hidden",
                                dayBoxClass
                            )}
                        >
                            <div className="day-box-header">
                                {day.toLocaleDateString([], { weekday: 'short', day: 'numeric' })}
                            </div>
                            <div className="day-box-content">
                                {daySessions.map(session => (
                                    <Link href={`/sessions/${session._id}`} key={session._id} className="block text-sm font-medium truncate">
                                        {session.worldName}
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
  const [activeTab, setActiveTab] = useState<'upcoming' | 'planning' | 'past'>('upcoming')
  const sessions = useQuery(api.sessions.listSessions, { past: activeTab === 'past' }) as SessionWithDetails[]
  const isGM = useQuery(api.sessions.isGameMasterQuery)
  const userCharacters = useQuery(api.characters.listCharacters)
  const world = useQuery(api.worlds.getWorldByOwner) // Query for the user's world

  const userCharacterIds = new Set(userCharacters?.map(c => c._id) ?? [])

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
        <CardTitle>Sessions</CardTitle>
        <div className="flex items-center gap-4">
          <div className="flex bg-muted p-1 rounded-md h-9">
            {(['upcoming', 'planning', 'past'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1 text-sm font-medium rounded-sm transition-all capitalize",
                  activeTab === tab 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          {activeTab === 'upcoming' && isGM && <SessionDialog hasWorld={!!world} />}
        </div>
      </CardHeader>
      <CardContent>
        {activeTab === 'planning' ? (
          <p>No planning sessions found.</p>
        ) : sessions === undefined ? (
          <div className="space-y-6">
            {activeTab === 'upcoming' && (
              <div className="grid grid-cols-7 gap-2 mb-4">
                {[...Array(7)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            )}
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ) : (
          <>
            {sessions.length === 0 && <p>No {activeTab} sessions found.</p>}
            {activeTab === 'upcoming' && sessions.length > 0 && <SevenDayOverview sessions={sessions} userCharacterIds={userCharacterIds} />}
            <ul className={cn("space-y-4", activeTab === 'upcoming' && sessions.length > 0 && "mt-8")}>
              {sessions.map((session) => {
                const hasJoined = activeTab === 'upcoming' && session.characters.some(id => userCharacterIds.has(id))
                
                return (
                  <li key={session._id} className="border-b pb-2 last:border-0 flex justify-between items-start">
                    <Link
                      href={`/sessions/${session._id}`}
                      className={cn(
                          "flex-grow p-2 rounded-md transition-colors relative flex justify-between items-start",
                          session.isOwner 
                              ? "session-owner" 
                              : isGM && hasJoined 
                                  ? "session-admin-joined" 
                                  : hasJoined 
                                      ? "session-joined" 
                                      : "session-default"
                      )}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <div className={cn("font-semibold", "session-world", "flex items-center")}>
                              <span 
                                className="inline-flex align-middle justify-center w-20 rounded-full px-2.5 py-0.5 text-xs font-semibold mr-2"
                                style={getLevelBadgeStyle(session.level)}
                              >
                                  Lvl {session.level ?? 'TBD'}
                              </span>
                              {session.worldName}
                          </div>
                          {session.characters.length >= session.maxPlayers && (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800 uppercase tracking-wider">
                              Full
                            </span>
                          )}
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
                      {activeTab === 'past' && (
                          <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-6 text-xs px-2 mt-1"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent clicking the parent Link
                                e.preventDefault(); // Prevent any default action of the button or parent that might cause navigation
                                window.open(`https://void.tarragon.be/Session-Reports/${new Date(session.date).toISOString().slice(0, 10)}-${session.worldName.replace(/\s+/g, '-')}`, '_blank');
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
