'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState, useEffect, useMemo } from 'react'
import SessionDialog from './SessionDialog'
import Link from 'next/link'
import { Book, Lock, ChevronLeft, ChevronRight, User, Shield, Filter } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, getLevelBadgeStyle, getDualLevelBadgeStyle, formatDate, formatTime, CharacterRankIcon } from '@/lib/utils'
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@clerk/nextjs'
import { getUsernames, UserMetadata } from '@/app/stats/actions'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { motion, AnimatePresence } from 'framer-motion'
import { track } from '@vercel/analytics'

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
                                {char.system && (
                                    <img 
                                        src={char.system === 'PF' ? '/PFVoid.svg' : '/DnDVoid.svg'} 
                                        alt={char.system} 
                                        className="h-3 w-3 mx-0.5"
                                    />
                                )}
                                <span className="font-medium text-foreground">{char.name}</span>
                            </div>
                            <span 
                                className="inline-flex align-middle justify-center w-14 rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap"
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
    userMetadata,
    userCharacterIds,
    daySessions
}: { 
    date: Date, 
    availability: Doc<'availability'>[], 
    onToggle: () => void,
    userMetadata: Record<string, UserMetadata>,
    userCharacterIds: Set<string>,
    daySessions: SessionWithDetails[]
}) {
    const { userId } = useAuth()
    const isAvailable = availability.some(a => a.userId === userId)
    
    const gms = availability.filter(a => a.isGM)
    const players = availability.filter(a => !a.isGM)
    const isOptimal = availability.length >= 4 && gms.length >= 1

    const getDisplayName = (a: Doc<'availability'>) => {
        return userMetadata[a.userId]?.name || a.username || `User ${a.userId.slice(-4)}`;
    }

    const sessionsRunning = daySessions.filter(s => s.isOwner);
    const sessionsJoined = daySessions.filter(s => !s.isOwner && s.characters.some(id => userCharacterIds.has(id)));

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
                {(sessionsRunning.length > 0 || sessionsJoined.length > 0) && (
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 space-y-2 animate-in fade-in zoom-in duration-300">
                        {sessionsRunning.map(s => (
                            <div key={s._id} className="flex items-center gap-2 text-xs font-medium text-purple-700 dark:text-purple-400">
                                <Shield className="h-3 w-3" />
                                <span>You are <span className="font-bold underline decoration-purple-500/30">running</span> &quot;{s.worldName}&quot; on this day.</span>
                            </div>
                        ))}
                        {sessionsJoined.map(s => (
                            <div key={s._id} className="flex items-center gap-2 text-xs font-medium text-purple-700 dark:text-purple-400">
                                <Book className="h-3 w-3" />
                                <span>You have <span className="font-bold underline decoration-purple-500/30">joined</span> &quot;{s.worldName}&quot; on this day.</span>
                            </div>
                        ))}
                    </div>
                )}

                {isOptimal && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                        <p className="text-xs font-medium text-green-700 dark:text-green-400">
                            This day is <span className="font-bold">optimal</span> for a session! We have a Game Master and at least 3 players available.
                        </p>
                    </div>
                )}
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
  allSessions,
  userCharacterIds, 
  viewDate, 
  onPrevMonth, 
  onNextMonth, 
  canPrevMonth 
}: { 
  sessions: SessionWithDetails[], 
  allSessions: SessionWithDetails[],
  userCharacterIds: Set<string>,
  viewDate: Date,
  onPrevMonth: () => void,
  onNextMonth: () => void,
  canPrevMonth: boolean
}) {
    const { userId } = useAuth();
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

    // Optimistic UI for availability
    const [optimisticAvailability, setOptimisticAvailability] = useState<Record<number, boolean>>({});

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
        if (!session.date) return acc;
        const sessionDate = new Date(session.date);
        if (sessionDate.getFullYear() === year && sessionDate.getMonth() === month) {
            const day = sessionDate.getDate();
            if (!acc[day]) acc[day] = [];
            acc[day].push(session);
        }
        return acc;
    }, {} as Record<number, SessionWithDetails[]>);

    const highlightSessionsByDay = allSessions.reduce((acc, session) => {
        if (!session.date) return acc;
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
        const baseAvailability = availability.reduce((acc, a) => {
            const date = new Date(a.date);
            const day = date.getDate();
            if (!acc[day]) acc[day] = [];
            acc[day].push(a);
            return acc;
        }, {} as Record<number, Doc<'availability'>[]>);

        // Apply optimistic updates
        Object.entries(optimisticAvailability).forEach(([dayStr, isAvailable]) => {
            const day = parseInt(dayStr);
            const current = baseAvailability[day] || [];
            const userAlreadyInList = current.some(a => a.userId === userId);

            if (isAvailable && !userAlreadyInList) {
                // Add optimistic entry (minimal mock)
                baseAvailability[day] = [...current, { userId, isGM: false, date: new Date(year, month, day).getTime() } as Doc<'availability'>];
            } else if (!isAvailable && userAlreadyInList) {
                // Remove entry
                baseAvailability[day] = current.filter(a => a.userId !== userId);
            }
        });

        return baseAvailability;
    }, [availability, optimisticAvailability, userId, year, month]);

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
            <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                <div className="grid grid-cols-7 gap-1 sm:gap-2 min-w-[350px]">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <div key={day} className="text-center text-[10px] sm:text-xs font-bold text-muted-foreground py-1">
                            {day}
                        </div>
                    ))}
                    {calendarDays.map((day, idx) => {
                        if (!day) return <motion.div 
                            key={`empty-${idx}`} 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: Math.min(idx * 0.01, 0.2) }}
                            className="bg-muted/5 rounded-md aspect-square" 
                        />;
                        
                        const dayNum = day.getDate();
                        const daySessions = sessionsByDay[dayNum] || [];
                        const highlightSessions = highlightSessionsByDay[dayNum] || [];
                        const dayAvailability = availabilityByDay[dayNum] || [];

                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const isPast = day < today;
                        
                        let dayBoxClass = "";
                        if (highlightSessions.some(s => s.isOwner)) {
                            dayBoxClass = "day-box-owner";
                        } else if (highlightSessions.some(s => s.characters.some(id => userCharacterIds.has(id)))) {
                            dayBoxClass = "day-box-joined";
                        }

                        const isUserAvailable = dayAvailability.some(a => a.userId === userId);
                        const gmCount = dayAvailability.filter(a => a.isGM).length;
                        const playerCount = dayAvailability.length - gmCount;
                        const isOptimal = dayAvailability.length >= 4 && gmCount >= 1;

                        // Check if available but not signed up for a planned session
                        const availableButNotSignedUp = !isPast && isUserAvailable && daySessions.length > 0 && !daySessions.some(s => s.characters.some(id => userCharacterIds.has(id)));

                        return (
                            <Dialog key={dayNum}>
                                <DialogTrigger asChild disabled={isPast}>
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: Math.min(idx * 0.01, 0.2) }}
                                        className={cn(
                                            "day-box overflow-hidden min-h-[50px] sm:aspect-square flex flex-col relative transition-all duration-200 p-0",
                                            !dayBoxClass && "border border-border/50",
                                            isPast ? "bg-muted/10 opacity-50 grayscale cursor-not-allowed pointer-events-none" : "hover:bg-muted/20 cursor-pointer",
                                            !isPast && isOptimal && !dayBoxClass && "ring-2 ring-inset ring-green-500/30 bg-green-500/5",
                                            availableButNotSignedUp && !dayBoxClass && "ring-2 ring-inset ring-blue-500/40 bg-blue-500/5",
                                            dayBoxClass === "day-box-joined" && "ring-2 ring-inset ring-purple-500/50",
                                            dayBoxClass
                                        )}
                                    >
                                    <div className="day-box-header py-0.5 px-1 text-[9px] sm:text-[10px] flex justify-between items-center">
                                        {dayNum}
                                        {!isPast && (
                                            <div className="flex gap-0.5">
                                                {availableButNotSignedUp && (
                                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" title="Available but not signed up!" />
                                                )}
                                                {isOptimal && (
                                                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" title="Optimal for a session!" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-grow flex items-center justify-center p-1">
                                        {!isPast && dayAvailability.length > 0 && (
                                            <div className="flex flex-col items-center gap-0.5">
                                                {gmCount > 0 && (
                                                    <span className={cn(
                                                        "text-[8px] sm:text-[10px] font-bold leading-none",
                                                        isUserAvailable && "text-purple-600 dark:text-purple-400"
                                                    )}>
                                                        {gmCount} GM
                                                    </span>
                                                )}
                                                {playerCount > 0 && (
                                                    <span className={cn(
                                                        "text-[8px] sm:text-[10px] font-bold leading-none",
                                                        isUserAvailable && "text-purple-600 dark:text-purple-400"
                                                    )}>
                                                        {playerCount} PL
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </DialogTrigger>
                            {!isPast && (
                                <AvailabilityDialog 
                                    date={day} 
                                    availability={dayAvailability}
                                    userCharacterIds={userCharacterIds}
                                    daySessions={highlightSessions}
                                    onToggle={async () => {
                                        const isCurrentlyAvailable = dayAvailability.some(a => a.userId === userId);
                                        // Update optimistic state
                                        setOptimisticAvailability(prev => ({
                                            ...prev,
                                            [dayNum]: !isCurrentlyAvailable
                                        }));

                                        try {
                                            await toggleAvailability({ date: day.getTime() });
                                            track('availability_toggled', { action: isCurrentlyAvailable ? 'removed' : 'added' });
                                        } catch (error) {
                                            // Rollback on error
                                            setOptimisticAvailability(prev => ({
                                                ...prev,
                                                [dayNum]: isCurrentlyAvailable
                                            }));
                                        }
                                    }}
                                    userMetadata={userMetadata}
                                />
                            )}
                        </Dialog>
                    );
                })}
            </div>
        </div>
    </div>
    );
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
        if (!session.date) return acc;
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
                                "day-box overflow-hidden min-h-[8rem]",
                                !dayBoxClass && "border border-gray-300",
                                dayBoxClass === "day-box-joined" && "ring-2 ring-inset ring-purple-500/50",
                                dayBoxClass
                            )}
                        >
                            <div className="day-box-header px-2 py-1">
                                {`${day.toLocaleDateString('en-US', { weekday: 'long' })} ${day.getDate()}`}
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

export default function Sessions({ filters }: { filters?: { pf: boolean, dnd: boolean } }) {
  const { width } = useWindowSize()
  const { userId } = useAuth()
  const [activeTab, setActiveTab] = useState<'upcoming' | 'planning' | 'past'>('upcoming')
  const [viewDate, setViewDate] = useState(new Date())
  const [activeFilters, setActiveFilters] = useState({
    owned: false,
    signedUp: false,
    notFull: false,
    planning: false,
    scheduled: false,
    interested: false,
  })
  
  // Use a query that returns planning sessions if in the planning tab
  const sessionsRaw = useQuery(
    api.sessions.listSessions, 
    { past: activeTab === 'past' }
  ) as SessionWithDetails[]

  const isGM = useQuery(api.sessions.isGameMasterQuery)
  const userCharacters = useQuery(api.characters.listCharacters)
  const world = useQuery(api.worlds.getWorldByOwner) // Query for the user's world
  const userAvailability = useQuery(api.planning.getUserAvailability)

  const userCharacterIds = useMemo(() => new Set(userCharacters?.map(c => c._id) ?? []), [userCharacters])
  
  const userAvailabilityDates = useMemo(() => {
    if (!userAvailability) return new Set<number>();
    return new Set(userAvailability.map(a => {
      const d = new Date(a.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }));
  }, [userAvailability]);

  const sessions = useMemo(() => {
    if (!sessionsRaw) return sessionsRaw;
    
    // Filter by tab
    let filtered = sessionsRaw;
    if (activeTab === 'upcoming') {
        // Upcoming now includes everything not locked (scheduled AND planning)
        filtered = sessionsRaw;
    } else if (activeTab === 'planning') {
        filtered = sessionsRaw.filter(s => !!s.planning);
    }
    
    if (filters) {
        filtered = filtered.filter(session => {
            if (session.system === 'PF' && !filters.pf) return false;
            if (session.system === 'DnD' && !filters.dnd) return false;
            return true;
        });
    }

    if (activeFilters.owned) filtered = filtered.filter(s => s.isOwner);
    if (activeFilters.signedUp) filtered = filtered.filter(s => s.characters.some(id => userCharacterIds.has(id)));
    if (activeFilters.notFull) filtered = filtered.filter(s => s.characters.length < s.maxPlayers);
    if (activeFilters.planning) filtered = filtered.filter(s => !!s.planning);
    if (activeFilters.scheduled) filtered = filtered.filter(s => !s.planning);
    if (activeFilters.interested) filtered = filtered.filter(s => s.interestedPlayers?.some(p => p.userId === userId));

    return filtered;
  }, [sessionsRaw, filters, activeTab, activeFilters, userCharacterIds, userId]);

  const handlePrevMonth = () => {
    track('month_nav_prev');
    const today = new Date();
    const prev = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    if (prev >= new Date(today.getFullYear(), today.getMonth(), 1)) {
        setViewDate(prev);
    }
  };

  const handleNextMonth = () => {
    track('month_nav_next');
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const canPrevMonth = viewDate.getFullYear() > new Date().getFullYear() || 
                      (viewDate.getFullYear() === new Date().getFullYear() && viewDate.getMonth() > new Date().getMonth());

  return (
    <Card>
      <CardHeader className={cn(
        "flex flex-row flex-wrap items-center justify-between gap-4",
        width < 1015 && "flex-col items-center justify-center text-center"
      )}>
        <div className="flex items-center gap-2">
            <CardTitle>Sessions</CardTitle>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className={cn("h-8 w-8 p-0", Object.values(activeFilters).some(Boolean) && "text-primary bg-primary/10")}>
                        <Filter className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-4" align="start">
                    <div className="space-y-4">
                        <h4 className="font-bold leading-none">Filter Sessions</h4>
                        <div className="grid gap-2">
                            {isGM && (
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="filter-owned" 
                                        checked={activeFilters.owned} 
                                        onCheckedChange={(checked) => {
                                            setActiveFilters(prev => ({ ...prev, owned: !!checked }));
                                            track('filter_applied', { filter: 'owned', value: checked });
                                        }}
                                    />
                                    <label htmlFor="filter-owned" className="text-sm font-medium leading-none cursor-pointer">Owned Sessions</label>
                                </div>
                            )}
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="filter-signed" 
                                    checked={activeFilters.signedUp} 
                                    onCheckedChange={(checked) => {
                                        setActiveFilters(prev => ({ ...prev, signedUp: !!checked }));
                                        track('filter_applied', { filter: 'signedUp', value: checked });
                                    }}
                                />
                                <label htmlFor="filter-signed" className="text-sm font-medium leading-none cursor-pointer">Signed Up</label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="filter-notfull" 
                                    checked={activeFilters.notFull} 
                                    onCheckedChange={(checked) => {
                                        setActiveFilters(prev => ({ ...prev, notFull: !!checked }));
                                        track('filter_applied', { filter: 'notFull', value: checked });
                                    }}
                                />
                                <label htmlFor="filter-notfull" className="text-sm font-medium leading-none cursor-pointer">Not FULL</label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="filter-interested" 
                                    checked={activeFilters.interested} 
                                    onCheckedChange={(checked) => {
                                        setActiveFilters(prev => ({ ...prev, interested: !!checked }));
                                        track('filter_applied', { filter: 'interested', value: checked });
                                    }}
                                />
                                <label htmlFor="filter-interested" className="text-sm font-medium leading-none cursor-pointer">Interested</label>
                            </div>
                            <div className="border-t my-1" />
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="filter-planning" 
                                    checked={activeFilters.planning} 
                                    onCheckedChange={(checked) => {
                                        setActiveFilters(prev => ({ ...prev, planning: !!checked }));
                                        track('filter_applied', { filter: 'planning', value: checked });
                                    }}
                                />
                                <label htmlFor="filter-planning" className="text-sm font-medium leading-none cursor-pointer">Planning Phase</label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="filter-scheduled" 
                                    checked={activeFilters.scheduled} 
                                    onCheckedChange={(checked) => {
                                        setActiveFilters(prev => ({ ...prev, scheduled: !!checked }));
                                        track('filter_applied', { filter: 'scheduled', value: checked });
                                    }}
                                />
                                <label htmlFor="filter-scheduled" className="text-sm font-medium leading-none cursor-pointer">Scheduled Games</label>
                            </div>
                        </div>
                        {Object.values(activeFilters).some(Boolean) && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="w-full mt-2 h-7 text-xs" 
                                onClick={() => {
                                    setActiveFilters({
                                        owned: false,
                                        signedUp: false,
                                        notFull: false,
                                        planning: false,
                                        scheduled: false,
                                        interested: false,
                                    });
                                    track('filter_cleared');
                                }}
                            >
                                Clear Filters
                            </Button>
                        )}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
        <div className={cn(
          "flex items-center gap-4",
          width < 1015 && "flex-wrap justify-center w-full"
        )}>
          {(activeTab === 'upcoming' || activeTab === 'planning') && isGM && <SessionDialog hasWorld={!!world} />}
          <div className="flex bg-muted p-1 rounded-md h-9 relative">
            {(['upcoming', 'planning', 'past'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                    setActiveTab(tab);
                    track('tab_switch', { tab });
                }}
                className={cn(
                  "px-3 py-1 text-sm font-medium rounded-sm transition-colors capitalize relative z-10",
                  activeTab === tab 
                    ? "text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-background rounded-sm shadow-sm z-[-1]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                {tab}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + viewDate.getTime()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
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
                  allSessions={sessionsRaw || []}
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
                  {sessions.map((session, i) => {
                    const hasJoined = activeTab === 'upcoming' && session.characters.some(id => userCharacterIds.has(id))
                    const isPlanning = session.planning || !session.date
                    
                    const sessionDateRaw = session.date ? new Date(session.date) : null;
                    if (sessionDateRaw) sessionDateRaw.setHours(0, 0, 0, 0);
                    const isAvailable = sessionDateRaw && userAvailabilityDates.has(sessionDateRaw.getTime());

                    return (
                      <motion.li 
                        key={session._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.2), duration: 0.2 }}
                        className="border-b pb-2 last:border-0 flex justify-between items-start"
                      >
                        <Link
                          href={`/sessions/${session._id}`}
                          className={cn(
                              "flex-grow p-2 rounded-md transition-colors relative flex justify-between items-start",
                              session.isOwner 
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
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className={cn("font-semibold", "session-world", "flex items-center gap-2 flex-wrap")}>
                                  <div className="flex items-center gap-2 whitespace-nowrap">
                                      {(() => {
                                          const q = session.quest as any;
                                          const levelPF = q?.levelPF ?? (q?.levelDnD === undefined ? q?.level : undefined) ?? session.level;
                                          const levelDnD = q?.levelDnD;
                                          const isDual = levelPF !== undefined && levelDnD !== undefined;

                                          return (
                                              <span 
                                                className="inline-flex align-middle justify-center w-20 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                                style={getDualLevelBadgeStyle(levelPF, levelDnD)}
                                              >
                                                  Lvl {isDual ? 'V' : (levelPF ?? levelDnD ?? 'TBD')}
                                              </span>
                                          );
                                      })()}
                                      {session.system && (
                                        <img 
                                            src={session.system === 'PF' ? '/PFVoid.svg' : '/DnDVoid.svg'} 
                                            alt={session.system} 
                                            className="h-5 w-5"
                                        />
                                      )}
                                  </div>
                                  <span className="truncate max-w-[200px] sm:max-w-none">{session.worldName}</span>
                                  {isAvailable && !hasJoined && (
                                    <Tooltip delayDuration={0}>
                                        <TooltipTrigger asChild>
                                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0 ml-1" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            You are available this day!
                                        </TooltipContent>
                                    </Tooltip>
                                  )}
                              </div>
                              {isPlanning && <div className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest font-black shadow-sm">Planning</div>}
                              {!isPlanning && session.characters.length >= session.maxPlayers && (
                                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800 uppercase tracking-wider">
                                  Full
                                </span>
                              )}
                              {session.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                            </div>
                            <div className="text-sm font-medium">
                              {session.date ? (
                                <>{formatDate(session.date)} at {formatTime(session.date)}</>
                              ) : (
                                <span className="italic">Date TBD</span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {isPlanning 
                                ? `${(session.interestedPlayers || []).length} interested players`
                                : `${session.characters.length} / ${session.maxPlayers} players signed up`
                              }
                            </div>
                            {(() => {
                                const q = session.quest as any;
                                const levelPF = q?.levelPF ?? (q?.levelDnD === undefined ? q?.level : undefined);
                                const levelDnD = q?.levelDnD;
                                if (levelPF !== undefined && levelDnD !== undefined) {
                                    return (
                                        <div className="flex items-center gap-1 mt-1 bg-muted/30 px-1.5 py-0.5 rounded text-[9px] font-bold w-fit border border-border/10">
                                            <img src="/PFVoid.svg" alt="PF" className="h-2.5 w-2.5" />
                                            <span 
                                                className="inline-flex items-center justify-center rounded-full w-3 h-3 text-[6px]"
                                                style={getLevelBadgeStyle(levelPF)}
                                            >
                                                {levelPF}
                                            </span>
                                            <img src="/DnDVoid.svg" alt="DnD" className="h-2.5 w-2.5 ml-1" />
                                            <span 
                                                className="inline-flex items-center justify-center rounded-full w-3 h-3 text-[6px]"
                                                style={getLevelBadgeStyle(levelDnD)}
                                            >
                                                {levelDnD}
                                            </span>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                          </div>
                          {activeTab === 'past' && session.date && (
                              <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-6 text-xs px-2 mt-1"
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent clicking the parent Link
                                    e.preventDefault(); // Prevent any default action of the button or parent that might cause navigation
                                    window.open(`https://void.tarragon.be/Session-Reports/${new Date(session.date!).toISOString().slice(0, 10)}-${session.worldName.replace(/\s+/g, '-')}`, '_blank');
                                  }}
                              >
                                  <Book size={32} />
                              </Button>
                          )}
                        </Link>
                      </motion.li>
                    )
                  })}
                </ul>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
