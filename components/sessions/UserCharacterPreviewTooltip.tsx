'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Skeleton } from '@/components/ui/skeleton'
import { getLevelBadgeStyle, CharacterRankIcon } from '@/lib/utils'
import { User } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Doc } from '@/convex/_generated/dataModel'

export function UserCharacterPreview({ userId }: { userId: string }) {
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

export function UserItem({ a, displayName }: { a: Doc<'availability'>; displayName: string }) {
    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <li className="text-sm flex items-center gap-2 bg-muted/30 px-2 py-1 rounded-md cursor-help hover:bg-muted/50 transition-colors">
                        <User className="h-3 w-3" /> {displayName}
                    </li>
                </TooltipTrigger>
                <TooltipContent side="right" className="p-0 border border-border bg-card text-card-foreground shadow-xl z-50">
                    <UserCharacterPreview userId={a.userId} />
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
