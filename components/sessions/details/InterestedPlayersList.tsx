'use client'

import { UserMetadata } from "@/app/stats/actions"

interface InterestedPlayersListProps {
  interestedPlayers: { userId: string; username: string }[]
  userMetadata?: Record<string, UserMetadata>
}

export default function InterestedPlayersList({ interestedPlayers, userMetadata }: InterestedPlayersListProps) {
  if (!interestedPlayers || interestedPlayers.length === 0) {
    return <p className="text-muted-foreground italic">No players have expressed interest yet.</p>
  }

  return (
    <ul className="grid grid-cols-1 gap-3">
      {interestedPlayers.map((player) => (
        <li key={player.userId} className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
          <div className="font-bold">{userMetadata?.[player.userId]?.name || player.username}</div>
        </li>
      ))}
    </ul>
  )
}
