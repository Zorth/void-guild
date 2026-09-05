'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { UserCheck, AlertCircle } from 'lucide-react'

interface ActiveCharacterSelectorProps {
  selectedCharacterId: Id<'characters'> | null
  onSelectCharacter: (id: Id<'characters'>) => void
}

export default function ActiveCharacterSelector({
  selectedCharacterId,
  onSelectCharacter,
}: ActiveCharacterSelectorProps) {
  const characters = useQuery(api.blackVoid.getUserCharacters)

  if (characters === undefined) {
    return <div className="h-10 w-48 bg-muted/30 animate-pulse rounded-md" />
  }

  if (characters.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded-md">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>Create a character first to list items, place bids, or offer services.</span>
      </div>
    )
  }

  const selectedChar = characters.find((c: any) => c._id === selectedCharacterId) || characters[0]

  return (
    <div className="flex items-center gap-3 bg-muted/20 border border-purple-500/30 p-2 rounded-lg backdrop-blur-md">
      <div className="flex items-center gap-2 shrink-0">
        <UserCheck className="h-4 w-4 text-purple-400" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:inline">
          Active Character:
        </span>
      </div>
      <select
        value={selectedChar?._id}
        onChange={(e) => onSelectCharacter(e.target.value as Id<'characters'>)}
        className="w-[200px] sm:w-[240px] bg-background/90 text-foreground border border-purple-500/30 focus:border-purple-500 focus:outline-none rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer"
      >
        {characters.map((char: any) => (
          <option key={char._id} value={char._id} className="bg-popover text-foreground">
            {char.name} (Lvl {char.lvl} {char.class || ''})
          </option>
        ))}
      </select>
    </div>
  )
}
