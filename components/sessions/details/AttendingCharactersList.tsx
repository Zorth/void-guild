'use client'

import { Book, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { cn, getLevelBadgeStyle, CharacterRankIcon } from '@/lib/utils'

interface AttendingCharactersListProps {
  characters: Doc<'characters'>[]
  userCharacterIds: Set<Id<'characters'>>
  sessionLocked: boolean
  isSessionOwner: boolean
  onLeave: (characterId: Id<'characters'>) => void
}

export default function AttendingCharactersList({ 
  characters, 
  userCharacterIds, 
  sessionLocked, 
  isSessionOwner, 
  onLeave 
}: AttendingCharactersListProps) {
  if (characters.length === 0) {
    return <p className="text-muted-foreground italic">No characters have joined this session yet.</p>
  }

  return (
    <ul className="grid grid-cols-1 gap-3">
      {characters.map((char) => {
        const isUserCharacter = userCharacterIds.has(char._id)
        const canRemove = !sessionLocked && (isSessionOwner || isUserCharacter)
        return (
            <li 
                key={char._id} 
                className={cn(
                    "flex items-center justify-between p-4 rounded-lg border transition-colors",
                    isUserCharacter 
                        ? "bg-[rgba(147,51,234,0.1)] border-2 border-[#D8B4FE] hover:border-[#E9D5FF] hover:bg-[rgba(147,51,234,0.2)] shadow-sm" 
                        : "bg-muted/20"
                )}
            >
              <div>
                <div className="font-bold flex items-center gap-2">
                    {char.name}
                    {isUserCharacter && <span className="text-[10px] bg-purple-200 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">You</span>}
                    {/* Book Icon */}
                    <a
                        href={`https://void.tarragon.be/Player-Characters/${char.name.replace(/\s+/g, '-')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-blue-500"
                    >
                        <Book size={16} />
                    </a>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {char.class}
                </div>
                {char.websiteLink && (
                    <a 
                        href={char.websiteLink} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[10px] text-blue-500 hover:underline"
                    >
                        {char.websiteLink}
                    </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1">
                        <CharacterRankIcon rank={char.rank} />
                        <span 
                            className="inline-flex align-middle justify-center w-12 rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={getLevelBadgeStyle(char.lvl)}
                        >
                            Lvl {char.lvl}
                        </span>
                    </div>
                </div>
                {canRemove && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                        onClick={() => onLeave(char._id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
              </div>
            </li>
        )
      })}
    </ul>
  )
}
