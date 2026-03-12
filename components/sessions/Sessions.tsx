'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState, useEffect, useMemo } from 'react'
import SessionDialog from './SessionDialog'
import Link from 'next/link'
import { Book, Lock, ChevronLeft, ChevronRight, User, Shield } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, getLevelBadgeStyle, formatDate, formatTime, CharacterRankIcon } from '@/lib/utils'
import './sessions.css'
import type { Doc } from '@/convex/_generated/dataModel'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog'
import { useAuth } from '@clerk/nextjs'
import { getUsernames, UserMetadata } from '@/app/stats/actions'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'

type SessionWithDetails = Doc<'sessions'> & {
    isOwner: boolean;
    characterNames: string[];
    worldName: string; // Add worldName to the type
}

function UserCharacterPreview({ userId }: { userId: string }) {
    const characters = useQuery(api.characters.listCharactersByUserId, { userId });

    return (
        <div className="p-3 space-y-3 min-w-[180px]">
            {characters === undefined ? (
                <div className="space-y-2">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                </div>
            ) : characters.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No characters found.</p>
            ) : (
                <ul className="space-y-2">
                    {characters.map(char => (
                        <li key={char._id} className="flex items-center justify-between gap-6 text-sm">
                            <div className="flex items-center gap-2">
                                <CharacterRankIcon rank={char.rank} className="w-4 h-4" />
                                <span className="font-medium text-foreground">{char.name}</span>
                            </div>
                            <span 
                                className="px-2 py-0.5 rounded-full font-bold text-xs"
                                style={getLevelBadgeStyle(char.lvl)}
                            >
                                Lvl {char.lvl}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function AvailabilityDialog({ 
    date, 
    availability, 
    onToggle,
    userMetadata
}: { 
    date: Date, 
    availability: Doc<'availability'>[], 
    onToggle: () => void,
    userMetadata: Record<string, UserMetadata>
}) {
    const { userId } = useAuth()
    const isAvailable = availability.some(a => a.userId === userId)
    
    const gms = availability.filter(a => a.isGM)
    const players = availability.filter(a => !a.isGM)

    const getDisplayName = (a: Doc<'availability'>) => {
        return userMetadata[a.userId]?.name || a.username || `User ${a.userId.slice(-4)}`;
    }

    const UserItem = ({ a }: { a: Doc<'availability'> }) => (
        <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
                <li key={a.userId} className="text-sm flex items-center gap-2 bg-muted/30 px-2 py-1 rounded-md cursor-help hover:bg-muted/50 transition-colors">
                    <User className="h-3 w-3" /> {getDisplayName(a)}
                </li>
            </TooltipTrigger>
            <TooltipContent side="right" className="p-0 border border-border bg-card text-card-foreground shadow-xl">
                <UserCharacterPreview userId={a.userId} />
            </TooltipContent>
        </Tooltip>
    );

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Availability for {formatDate(date)}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-6">
                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-bold flex items-center gap-2 mb-2">
                            <Shield className="h-4 w-4 text-primary" /> Game Masters
                        </h4>
                        {gms.length > 0 ? (
                            <ul className="space-y-1">
                                {gms.map(a => <UserItem key={a.userId} a={a} />)}
                            </ul>
                        ) : (
                            <p className="text-xs text-muted-foreground italic">No GMs available.</p>
                        )}
                    </div>
                    <div>
                        <h4 className="text-sm font-bold flex items-center gap-2 mb-2">
                            <User className="h-4 w-4" /> Players
                        </h4>
                        {players.length > 0 ? (
                            <ul className="space-y-1">
                                {players.map(a => <UserItem key={a.userId} a={a} />)}
                            </ul>
                        ) : (
                            <p className="text-xs text-muted-foreground italic">No players available.</p>
                        )}
                    </div>
                </div>
            </div>
            <DialogFooter className="sm:justify-center">
                <Button 
                    onClick={onToggle} 
                    variant={isAvailable ? "destructive" : "default"}
                    className="w-full sm:w-auto"
                >
                    {isAvailable ? "Remove Availability" : "Mark as Available"}
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}

function MonthOverview({ 
  sessions, 
  userCharacterIds, 
  viewDate, 
  onPrevMonth, 
  onNextMonth, 
  canPrevMonth 
}: { 
  sessions: SessionWithDetails[], 
  userCharacterIds: Set<string>,
  viewDate: Date,
  onPrevMonth: () => void,
  onNextMonth: () => void,
  canPrevMonth: boolean
}) {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startTimestamp = firstDayOfMonth.getTime();
    const endTimestamp = lastDayOfMonth.getTime();

    const availability = useQuery(api.planning.getAvailabilityForMonth, { 
        startOfMonth: startTimestamp, 
        endOfMonth: endTimestamp 
    })
    const toggleAvailability = useMutation(api.planning.toggleAvailability)

    const [userMetadata, setUserMetadata] = useState<Record<string, UserMetadata>>({});

    useEffect(() => {
        if (availability && availability.length > 0) {
            const userIds = Array.from(new Set(availability.map(a => a.userId)));
            getUsernames(userIds).then(setUserMetadata);
        }
    }, [availability]);
    
    // To align with Mon-Sun (Mon = 0, ..., Sun = 6):
    const firstDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInMonth = lastDayOfMonth.getDate();
    
    const calendarDays = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
        calendarDays.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push(new Date(year, month, i));
    }

    const sessionsByDay = sessions.reduce((acc, session) => {
        const sessionDate = new Date(session.date);
        if (sessionDate.getFullYear() === year && sessionDate.getMonth() === month) {
            const day = sessionDate.getDate();
            if (!acc[day]) acc[day] = [];
            acc[day].push(session);
        }
        return acc;
    }, {} as Record<number, SessionWithDetails[]>);

    const availabilityByDay = useMemo(() => {
        if (!availability) return {};
        return availability.reduce((acc, a) => {
            const date = new Date(a.date);
            const day = date.getDate();
            if (!acc[day]) acc[day] = [];
            acc[day].push(a);
            return acc;
        }, {} as Record<number, Doc<'availability'>[]>);
    }, [availability]);

    const monthName = viewDate.toLocaleString('default', { month: 'long' });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">{monthName} {year}</h3>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={onPrevMonth} 
                        disabled={!canPrevMonth}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={onNextMonth}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="text-center text-[10px] sm:text-xs font-bold text-muted-foreground py-1">
                        {day}
                    </div>
                ))}
                {calendarDays.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} className="bg-muted/5 rounded-md aspect-square" />;
                    
                    const dayNum = day.getDate();
                    const daySessions = sessionsByDay[dayNum] || [];
                    const dayAvailability = availabilityByDay[dayNum] || [];

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isPast = day < today;
                    
                    let dayBoxClass = "";
                    if (daySessions.some(s => s.isOwner)) {
                        dayBoxClass = "day-box-owner";
                    } else if (daySessions.some(s => s.characters.some(id => userCharacterIds.has(id)))) {
                        dayBoxClass = "day-box-joined";
                    }

                    return (
                        <Dialog key={dayNum}>
                            <DialogTrigger asChild disabled={isPast}>
                                <div
                                    className={cn(
                                        "day-box border border-border/50 overflow-hidden aspect-square flex flex-col relative transition-colors p-0",
                                        isPast ? "bg-muted/10 opacity-50 grayscale cursor-not-allowed pointer-events-none" : "hover:bg-muted/20 cursor-pointer",
                                        dayBoxClass
                                    )}
                                >
                                    <div className="day-box-header py-0.5 px-1 text-[9px] sm:text-[10px] bg-muted/30">
                                        {dayNum}
                                    </div>
                                    <div className="flex-grow flex items-center justify-center p-1">
                                        {!isPast && dayAvailability.length > 0 && (
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm sm:text-lg font-bold leading-none">{dayAvailability.length}</span>
                                                <span className="text-[6px] sm:text-[8px] text-muted-foreground uppercase font-bold">Free</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </DialogTrigger>
                            {!isPast && (
                                <AvailabilityDialog 
                                    date={day} 
                                    availability={dayAvailability}
                                    onToggle={() => toggleAvailability({ date: day.getTime() })}
                                    userMetadata={userMetadata}
                                />
                            )}
                        </Dialog>
                    );
                })}
            </div>
        </div>
    );
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
                                "day-box border border-gray-300 overflow-hidden min-h-[8rem]",
                                dayBoxClass
                            )}
                        >
                            <div className="day-box-header px-2 py-1">
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
  const [viewDate, setViewDate] = useState(new Date())
  const sessions = useQuery(api.sessions.listSessions, { past: activeTab === 'past' }) as SessionWithDetails[]
  const isGM = useQuery(api.sessions.isGameMasterQuery)
  const userCharacters = useQuery(api.characters.listCharacters)
  const world = useQuery(api.worlds.getWorldByOwner) // Query for the user's world

  const userCharacterIds = new Set(userCharacters?.map(c => c._id) ?? [])

  const handlePrevMonth = () => {
    const today = new Date();
    const prev = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    if (prev >= new Date(today.getFullYear(), today.getMonth(), 1)) {
        setViewDate(prev);
    }
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const canPrevMonth = viewDate.getFullYear() > new Date().getFullYear() || 
                      (viewDate.getFullYear() === new Date().getFullYear() && viewDate.getMonth() > new Date().getMonth());

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
        <CardTitle>Sessions</CardTitle>
        <div className="flex items-center gap-4">
          {activeTab === 'upcoming' && isGM && <SessionDialog hasWorld={!!world} />}
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
        </div>
      </CardHeader>
      <CardContent key={activeTab + viewDate.getTime()} className="animate-in fade-in duration-200">
        {activeTab === 'planning' ? (
          sessions === undefined ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="grid grid-cols-7 gap-2">
                {[...Array(35)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            </div>
          ) : (
            <MonthOverview 
              sessions={sessions} 
              userCharacterIds={userCharacterIds} 
              viewDate={viewDate}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              canPrevMonth={canPrevMonth}
            />
          )
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
                          {formatDate(session.date)} at {formatTime(session.date)}
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
