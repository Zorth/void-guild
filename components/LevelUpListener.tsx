'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { fireJoinParticles } from '@/lib/particles'

export default function LevelUpListener() {
  const characters = useQuery(api.characters.listCharacters)
  const prevStatsRef = useRef<Record<string, { lvl: number, rank?: string }>>({})

  useEffect(() => {
    if (!characters) return

    const newStats: Record<string, { lvl: number, rank?: string }> = {}
    characters.forEach((char) => {
      const prev = prevStatsRef.current[char._id]
      
      // Level Up Check
      if (prev !== undefined && char.lvl > prev.lvl) {
        setTimeout(() => {
            toast(`Congratulations! ${char.name} leveled up!`, {
                duration: 5000,
                description: `Achievement Unlocked: Level ${char.lvl}`,
                icon: '✨',
                className: 'achievement-toast',
                descriptionClassName: 'achievement-description'
            })
            fireJoinParticles(window.innerWidth / 2, window.innerHeight / 2)
        }, 500);
      }

      // Rank Promotion Check
      if (prev !== undefined && char.rank && char.rank !== prev.rank) {
        if (char.rank === 'journeyman' || char.rank === 'guildmaster') {
          const rankTitle = char.rank.charAt(0).toUpperCase() + char.rank.slice(1)
          setTimeout(() => {
              toast(`Promoted! ${char.name} is now a ${rankTitle}!`, {
                duration: 8000,
                description: char.rank === 'guildmaster' 
                    ? "A legendary achievement in the Void!" 
                    : "A significant step in your journey!",
                icon: char.rank === 'guildmaster' ? '👑' : '🎖️',
                className: 'rank-toast',
                descriptionClassName: 'rank-description'
              })
              fireJoinParticles(window.innerWidth / 2, window.innerHeight / 2)
          }, 1000);
        }
      }

      newStats[char._id] = { lvl: char.lvl, rank: char.rank }
    })

    prevStatsRef.current = newStats
  }, [characters])

  return null
}
