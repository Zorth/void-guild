'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { fireJoinParticles } from '@/lib/particles'

const LEVEL_UP_MESSAGES = [
  "{name} is now Level {lvl}! Finally, a higher proficiency bonus to miss with.",
  "Level {lvl}! {name} can now fail their saves with much more dignity.",
  "{name} reached Level {lvl}! Time to spend 4 hours picking a feat you'll never use.",
  "Power overwhelming! {name} reached Level {lvl}. Please don't tell the GM.",
  "{name} is Level {lvl}! Still 1 HP away from a very awkward conversation with Pharasma.",
  "Congratulations {name}! Level {lvl} looks good on you. Unlike that cursed ring.",
  "{name} reached Level {lvl}! Now with 10% more 'Main Character' energy.",
  "Level {lvl}! {name} is officially too high level for this tavern's basement rats.",
  "{name} reached Level {lvl}! Maybe now the party will actually listen to your plans? (Probably not).",
  "{name} is Level {lvl}! May your nat 20s be frequent and your 'accidental' fireballs be small.",
];

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
        const randomMessage = LEVEL_UP_MESSAGES[Math.floor(Math.random() * LEVEL_UP_MESSAGES.length)]
          .replace("{name}", char.name)
          .replace("{lvl}", char.lvl.toString());

        setTimeout(() => {
            toast(randomMessage, {
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
