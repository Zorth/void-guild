'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Crown, Shield, Swords } from 'lucide-react'
import { useMemo, useEffect, useState } from 'react'
import { getUsernames } from './actions'

export default function StatsPage() {
    const characters = useQuery(api.characters.listAllCharactersPublic);
    const gmStats = useQuery(api.sessions.getGMStats);
    const playerStats = useQuery(api.sessions.getPlayerStats);
    const [usernames, setUsernames] = useState<Record<string, string>>({});
  
    const sortedCharacters = useMemo(() => {
      if (!characters) return [];
      return [...characters].sort((a, b) => b.lvl - a.lvl || b.xp - a.xp);
    }, [characters]);

    useEffect(() => {
        if (gmStats && playerStats) {
            const userIds = new Set([
                ...gmStats.map(s => s.userId),
                ...playerStats.map(s => s.userId)
            ]);
            
            if (userIds.size > 0) {
                getUsernames(Array.from(userIds)).then(setUsernames);
            }
        }
    }, [gmStats, playerStats]);
  

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Server Statistics</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Character Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords /> Character Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedCharacters ? (
              <ul className="space-y-2">
                {sortedCharacters.map((char, index) => (
                  <li key={char._id} className="flex justify-between items-center">
                    <span>{index + 1}. {char.name}</span>
                    <span className="font-semibold">Lvl {char.lvl}</span>
                  </li>
                ))}
              </ul>
            ) : <p>Loading characters...</p>}
          </CardContent>
        </Card>

        {/* Game Master Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown /> Game Master Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
             {gmStats ? (
                <ul className="space-y-2">
                    {gmStats.map((stat, index) => {
                        const displayName = usernames[stat.userId] || `User ${stat.userId.slice(-4)}`;
                        return (
                            <li key={stat.userId} className="flex justify-between items-center">
                                <span>{index + 1}. {displayName}</span>
                                <span className="font-semibold">{stat.count} sessions</span>
                            </li>
                        )
                    })}
                </ul>
             ) : <p>Loading GM stats...</p>}
          </CardContent>
        </Card>

        {/* Player Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield /> Player Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {playerStats ? (
                <ul className="space-y-2">
                    {playerStats.map((stat, index) => {
                        const displayName = usernames[stat.userId] || `User ${stat.userId.slice(-4)}`;
                        return (
                            <li key={stat.userId} className="flex justify-between items-center">
                                <span>{index + 1}. {displayName}</span>
                                <span className="font-semibold">{stat.count} sessions</span>
                            </li>
                        )
                    })}
                </ul>
            ) : <p>Loading player stats...</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
