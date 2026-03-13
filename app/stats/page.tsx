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

export default function StatsPage() {
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
        <Link href="/">
          <Button variant="ghost" size="sm" className="sm:px-3 sm:w-auto w-9 px-0">
            <ChevronLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Back to Home</span>
          </Button>
        </Link>
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
                {sortedCharacters.map((char, index) => (
                  <li key={char._id} className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      {index + 1}. {char.name}
                      <a 
                          href={`https://void.tarragon.be/Player-Characters/${char.name.replace(/\s+/g, '-')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-purple-500"
                      >
                          <Book size={14} />
                      </a>
                    </span>
                    <span className="font-semibold">Lvl {char.lvl}</span>
                  </li>
                ))}
              </ul>
            ) : characters === undefined ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : <p className="text-muted-foreground italic">No characters found.</p>}
          </CardContent>
        </Card>

        {/* Game Master Leaderboard */}
        <Card className="animate-in fade-in slide-in-from-bottom-full duration-700 delay-150 fill-mode-both">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown /> Game Master Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
             {gmStats ? (
                <ul className="space-y-2">
                    {gmStats.map((stat, index) => (
                        <li key={stat.userId} className="flex justify-between items-center">
                            <span>{index + 1}. {stat.displayName}</span>
                            <span className="font-semibold">{stat.totalCount} sessions</span>
                        </li>
                    ))}
                </ul>
             ) : (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
             )}
          </CardContent>
        </Card>

        {/* Player Leaderboard */}
        <Card className="animate-in fade-in slide-in-from-bottom-full duration-700 delay-300 fill-mode-both">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield /> Player Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {playerStats ? (
                <ul className="space-y-2">
                    {playerStats.map((stat, index) => (
                        <li key={stat.userId} className="flex justify-between items-center">
                            <span>{index + 1}. {stat.displayName}</span>
                            <span className="font-semibold">{stat.totalCount} sessions</span>
                        </li>
                    ))}
                </ul>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
