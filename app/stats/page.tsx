'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft, Crown, Shield, Swords, Book } from 'lucide-react'
import { useMemo, useEffect, useState } from 'react'
import { getUsernames, UserMetadata } from './actions'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@clerk/nextjs'
import { cn } from '@/lib/utils'

export default function StatsPage() {
    const { userId } = useAuth();
    const characters = useQuery(api.characters.listAllCharactersPublic);
    const gmStatsRaw = useQuery(api.sessions.getGMStats);
    const playerStatsRaw = useQuery(api.sessions.getPlayerStats);
    const [userMetadata, setUserMetadata] = useState<Record<string, UserMetadata>>({});
  
    const sortedCharacters = useMemo(() => {
      if (!characters) return [];
      return [...characters].sort((a, b) => b.lvl - a.lvl || b.xp - a.xp);
    }, [characters]);

    useEffect(() => {
        if (gmStatsRaw && playerStatsRaw) {
            const userIds = new Set([
                ...gmStatsRaw.map(s => s.userId),
                ...playerStatsRaw.map(s => s.userId)
            ]);
            
            if (userIds.size > 0) {
                getUsernames(Array.from(userIds)).then(setUserMetadata);
            }
        }
    }, [gmStatsRaw, playerStatsRaw]);

    const gmStats = useMemo(() => {
        if (!gmStatsRaw) return null;
        return gmStatsRaw.map(stat => {
            const metadata = userMetadata[stat.userId];
            const extra = metadata?.extraSessionsRan ?? 0;
            return {
                ...stat,
                displayName: metadata?.name || `User ${stat.userId.slice(-4)}`,
                totalCount: stat.count + extra
            };
        }).sort((a, b) => b.totalCount - a.totalCount);
    }, [gmStatsRaw, userMetadata]);

    const playerStats = useMemo(() => {
        if (!playerStatsRaw) return null;
        return playerStatsRaw.map(stat => {
            const metadata = userMetadata[stat.userId];
            const extra = metadata?.extraSessionsPlayed ?? 0;
            return {
                ...stat,
                displayName: metadata?.name || `User ${stat.userId.slice(-4)}`,
                totalCount: stat.count + extra
            };
        }).sort((a, b) => b.totalCount - a.totalCount);
    }, [playerStatsRaw, userMetadata]);
  

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-8">
        <Button variant="ghost" size="sm" className="sm:px-3 sm:w-auto w-9 px-0" asChild>
          <Link href="/">
            <ChevronLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
        </Button>
        <h1 className="text-4xl font-bold flex-grow text-center pr-20">Server Statistics</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Character Leaderboard */}
        <Card className="animate-in fade-in slide-in-from-bottom-full duration-700 fill-mode-both">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords /> Character Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedCharacters.length > 0 ? (
              <ul className="space-y-2">
                {sortedCharacters.map((char, index) => {
                  const isUser = char.userId === userId;
                  return (
                    <li 
                      key={char._id} 
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between py-1 border-b border-border/50 last:border-0 gap-1 sm:gap-4 px-2 -mx-2 transition-colors",
                        isUser && "bg-purple-50/50 dark:bg-purple-900/10 rounded-md"
                      )}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-muted-foreground tabular-nums shrink-0">{index + 1}.</span>
                        <span className={cn("font-medium truncate", isUser && "text-purple-700 dark:text-purple-300")} title={char.name}>
                          {char.name}
                        </span>
                        {isUser && (
                          <span className="text-[8px] bg-purple-200 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1 py-0.5 rounded-full uppercase tracking-wider font-bold shrink-0">You</span>
                        )}
                        <a 
                            href={`https://void.tarragon.be/Player-Characters/${char.name.replace(/\s+/g, '-')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-purple-500 shrink-0"
                        >
                            <Book size={14} />
                        </a>
                      </span>
                      <span className={cn("font-bold text-sm sm:text-base shrink-0 sm:ml-auto whitespace-nowrap", isUser && "text-purple-600 dark:text-purple-400")}>Lvl {char.lvl}</span>
                    </li>
                  );
                })}
              </ul>
            ) : characters === undefined ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : <p className="text-muted-foreground italic text-center py-4">No characters found.</p>}
          </CardContent>
        </Card>

        {/* Game Master Leaderboard */}
        <Card className="animate-in fade-in slide-in-from-bottom-full duration-700 delay-150 fill-mode-both">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="text-amber-500" /> Game Masters
            </CardTitle>
          </CardHeader>
          <CardContent>
             {gmStats ? (
                <ul className="space-y-2">
                    {gmStats.map((stat, index) => {
                        const isUser = stat.userId === userId;
                        return (
                          <li 
                            key={stat.userId} 
                            className={cn(
                              "flex flex-col sm:flex-row sm:items-center justify-between py-1 border-b border-border/50 last:border-0 gap-1 sm:gap-4 px-2 -mx-2 transition-colors",
                              isUser && "bg-purple-50/50 dark:bg-purple-900/10 rounded-md"
                            )}
                          >
                              <span className="flex items-center gap-2 min-w-0">
                                  <span className="text-muted-foreground tabular-nums shrink-0">{index + 1}.</span>
                                  <span className={cn("font-medium truncate", isUser && "text-purple-700 dark:text-purple-300")} title={stat.displayName}>
                                    {stat.displayName}
                                  </span>
                                  {isUser && (
                                    <span className="text-[8px] bg-purple-200 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1 py-0.5 rounded-full uppercase tracking-wider font-bold shrink-0">You</span>
                                  )}
                              </span>
                              <span className={cn("font-bold text-sm sm:text-base shrink-0 sm:ml-auto text-muted-foreground", isUser && "text-purple-600 dark:text-purple-400")}>
                                  {stat.totalCount} <span className="text-[10px] uppercase tracking-wider">Sessions</span>
                              </span>
                          </li>
                        );
                    })}
                </ul>
             ) : (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
             )}
          </CardContent>
        </Card>

        {/* Player Leaderboard */}
        <Card className="animate-in fade-in slide-in-from-bottom-full duration-700 delay-300 fill-mode-both">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="text-blue-500" /> Top Players
            </CardTitle>
          </CardHeader>
          <CardContent>
            {playerStats ? (
                <ul className="space-y-2">
                    {playerStats.map((stat, index) => {
                        const isUser = stat.userId === userId;
                        return (
                          <li 
                            key={stat.userId} 
                            className={cn(
                              "flex flex-col sm:flex-row sm:items-center justify-between py-1 border-b border-border/50 last:border-0 gap-1 sm:gap-4 px-2 -mx-2 transition-colors",
                              isUser && "bg-purple-50/50 dark:bg-purple-900/10 rounded-md"
                            )}
                          >
                              <span className="flex items-center gap-2 min-w-0">
                                  <span className="text-muted-foreground tabular-nums shrink-0">{index + 1}.</span>
                                  <span className={cn("font-medium truncate", isUser && "text-purple-700 dark:text-purple-300")} title={stat.displayName}>
                                    {stat.displayName}
                                  </span>
                                  {isUser && (
                                    <span className="text-[8px] bg-purple-200 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1 py-0.5 rounded-full uppercase tracking-wider font-bold shrink-0">You</span>
                                  )}
                              </span>
                              <span className={cn("font-bold text-sm sm:text-base shrink-0 sm:ml-auto text-muted-foreground", isUser && "text-purple-600 dark:text-purple-400")}>
                                  {stat.totalCount} <span className="text-[10px] uppercase tracking-wider">Sessions</span>
                              </span>
                          </li>
                        );
                    })}
                </ul>
            ) : (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
