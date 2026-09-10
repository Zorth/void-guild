'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { UserCheck, AlertCircle, ChevronDown, Check, User, Coins } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActiveCharacterSelectorProps {
  selectedCharacterId: Id<'characters'> | null
  onSelectCharacter: (id: Id<'characters'>) => void
}

function formatMoney(totalInGold: number) {
  const formatted = totalInGold % 1 === 0 ? totalInGold.toLocaleString() : totalInGold.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })
  return `${formatted} GP`
}

export default function ActiveCharacterSelector({
  selectedCharacterId,
  onSelectCharacter,
}: ActiveCharacterSelectorProps) {
  const [open, setOpen] = useState(false)
  const characters = useQuery(api.blackVoid.getUserCharacters, {system: 'PF'})

  if (characters === undefined) {
    return <div className="h-10 w-52 bg-muted/20 animate-pulse rounded-xl border border-border/30" />
  }

  if (characters.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded-xl">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>Create a character to list items or place bids.</span>
      </div>
    )
  }

  const selectedChar = characters.find((c: any) => c._id === selectedCharacterId) || characters[0]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-11 px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-800/90 text-foreground border-purple-500/30 hover:border-purple-500/60 rounded-xl transition-all shadow-md flex items-center justify-between gap-3 min-w-[210px] sm:min-w-[250px]"
        >
          <div className="flex items-center gap-2.5 min-w-0 text-left">
            <div className="h-7 w-7 rounded-lg bg-purple-950 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold text-xs shrink-0 shadow-inner">
              {selectedChar?.name ? selectedChar.name.charAt(0).toUpperCase() : <User className="h-3.5 w-3.5" />}
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="text-xs font-bold text-foreground truncate leading-tight">
                {selectedChar?.name || 'Select Character'}
              </span>
              {selectedChar?.title && (
                <span className="text-[10px] text-amber-400/90 italic font-medium truncate leading-tight">
                  {selectedChar.title}
                </span>
              )}
              <div className="flex items-center gap-1.5 text-[10px] text-purple-300/80 truncate leading-none mt-0.5">
                <span>Lvl {selectedChar?.lvl || 1} {selectedChar?.class ? `• ${selectedChar.class}` : ''}</span>
                {selectedChar?.money && (
                  <>
                    <span>•</span>
                    <span className="font-mono font-bold text-amber-400 flex items-center gap-0.5" title={`Wealth: ${selectedChar.money.pp}pp, ${selectedChar.money.gp}gp, ${selectedChar.money.sp}sp, ${selectedChar.money.cp}cp`}>
                      <Coins className="h-2.5 w-2.5 text-amber-400 shrink-0 inline" />
                      {formatMoney(selectedChar.money.totalInGold)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-purple-400 shrink-0 opacity-70 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-2 bg-slate-950/95 border-purple-500/30 text-foreground shadow-2xl backdrop-blur-xl rounded-xl space-y-1">
        <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/30 flex items-center justify-between">
          <span>Active Character</span>
          <span className="text-purple-400 font-mono">{characters.length} Available</span>
        </div>

        <div className="max-h-[260px] overflow-y-auto space-y-1 pt-1 scrollbar-thin">
          {characters.map((char: any) => {
            const isSelected = char._id === selectedCharacterId

            return (
              <button
                key={char._id}
                onClick={() => {
                  onSelectCharacter(char._id)
                  setOpen(false)
                }}
                className={cn(
                  "w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-all group",
                  isSelected
                    ? "bg-purple-950/80 border border-purple-500/40 text-purple-200 shadow-sm"
                    : "hover:bg-muted/40 text-muted-foreground hover:text-foreground border border-transparent"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors",
                    isSelected ? "bg-purple-600 text-white" : "bg-muted/40 text-muted-foreground group-hover:bg-purple-950/60 group-hover:text-purple-300"
                  )}>
                    {char.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <span className={cn("font-bold truncate", isSelected ? "text-white" : "text-foreground")}>
                      {char.name}
                    </span>
                    {char.title && (
                      <span className="text-[10px] text-amber-400/90 italic font-medium truncate">
                        {char.title}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground truncate">
                      Lvl {char.lvl} {char.class ? `• ${char.class}` : ''} {char.ancestry ? `(${char.ancestry})` : ''}
                    </span>
                    {char.money && (
                      <span className="text-[10px] font-mono font-semibold text-amber-400 flex items-center gap-1 mt-0.5" title={`Wealth: ${char.money.pp}pp, ${char.money.gp}gp, ${char.money.sp}sp, ${char.money.cp}cp`}>
                        <Coins className="h-3 w-3 text-amber-400 shrink-0" />
                        {formatMoney(char.money.totalInGold)}
                      </span>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <Check className="h-4 w-4 text-purple-400 shrink-0 ml-2" />
                )}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

