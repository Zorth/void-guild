'use client'

import React, { useState } from 'react'
import {
  Shield,
  Heart,
  User,
  Edit2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Id, Doc } from '@/convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import CharacterStatsEditModal from './CharacterStatsEditModal'
import PartyLootSection from './PartyLootSection'

interface CharacterPartyTabProps {
  session?: any
  characters: Doc<'characters'>[]
  partyDetails: Record<string, any>
  usersMap: Record<string, string>
  canEdit: boolean
  userCharacterIds?: Set<Id<'characters'>>
}

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const

export default function CharacterPartyTab({
  session,
  characters,
  partyDetails,
  usersMap,
  canEdit,
  userCharacterIds = new Set(),
}: CharacterPartyTabProps) {
  // Modal state for editing a selected character
  const [editingCharacter, setEditingCharacter] = useState<Doc<'characters'> | null>(null)

  if (characters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-card/60 border border-border/50 rounded-2xl text-center space-y-3">
        <User className="h-10 w-10 text-muted-foreground/60" />
        <p className="text-base font-bold text-foreground">No attending characters in this session</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          Characters that join or are invited to the session will appear here with live stats and loot tracking.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 w-full animate-in fade-in duration-200">
      {/* SECTION HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h2 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
            <span>🛡️</span>
            <span>Party Roster & Character Stats</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Concise character stat blocks with full player names, HP, AC, Saves, and Ability modifiers. Click &quot;Edit Character&quot; to update.
          </p>
        </div>
        <div className="text-xs font-semibold px-3 py-1 bg-purple-950/40 text-purple-300 border border-purple-500/30 rounded-full">
          {characters.length} {characters.length === 1 ? 'Hero' : 'Heroes'} in Party
        </div>
      </div>

      {/* COMPACT CHARACTER CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5 items-stretch">
        {characters.map((char) => {
          const charId = char._id
          const details = partyDetails[charId] || {}
          const playerName = usersMap[char.userId] || 'Unknown Player'

          // Hit Points
          const hp = details.hitPoints || {}
          const currentHP = hp.current ?? 20
          const maxHP = hp.max ?? 20
          const tempHP = hp.temporary ?? 0
          const hpPercent = Math.max(0, Math.min(100, Math.round((currentHP / (maxHP || 1)) * 100)))

          // Armor Class
          const ac = details.armorClass || {}
          const totalAC = ac.total ?? 15
          const shieldBonus = ac.shieldBonus ?? 0

          // Ability Scores & Modifiers
          const abilities = details.abilities || {
            str: 10,
            dex: 10,
            con: 10,
            int: 10,
            wis: 10,
            cha: 10,
          }

          // Saves
          const saves = details.saves || {}
          const fort = saves.fortitude || { bonus: 0, proficiency: 'T' }
          const ref = saves.reflex || { bonus: 0, proficiency: 'T' }
          const will = saves.will || { bonus: 0, proficiency: 'T' }
          const perc = saves.perception || { bonus: 0, proficiency: 'T' }

          // Skills
          const skillsList = Object.entries(details.skills || {}).map(([key, sk]: [string, any]) => ({
            key,
            ...sk,
          }))

          return (
            <div
              key={charId}
              className="flex flex-col justify-between rounded-xl border border-border/60 bg-gradient-to-b from-card/90 to-card/50 p-3 shadow-xs hover:border-purple-500/40 transition-colors gap-2.5"
            >
              {/* TOP HEADER */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-black text-sm text-foreground tracking-tight truncate">
                      {char.name}
                    </h3>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-800/80 shrink-0">
                      Lvl {char.lvl} {char.class}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <User className="h-3 w-3 text-purple-400 shrink-0" />
                    <span className="truncate font-medium">{playerName}</span>
                  </div>
                </div>

                {canEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingCharacter(char)}
                    className="h-6 text-[10px] font-bold px-2 gap-1 shrink-0 text-purple-300 hover:bg-purple-950/40 hover:text-purple-200 border border-purple-500/30"
                  >
                    <Edit2 className="h-2.5 w-2.5" />
                    <span>Edit</span>
                  </Button>
                )}
              </div>

              {/* HP & AC ROW */}
              <div className="grid grid-cols-2 gap-2">
                {/* HP */}
                <div className="px-2 py-1.5 rounded-lg border border-rose-500/30 bg-rose-950/20 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] font-bold text-rose-300">
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
                      HP
                    </span>
                    <span className="font-mono text-[11px]">
                      {currentHP}/{maxHP}
                      {tempHP > 0 && <span className="text-amber-300 ml-0.5">+{tempHP}</span>}
                    </span>
                  </div>
                  <div className="w-full bg-rose-950/60 h-1 rounded-full overflow-hidden mt-1 border border-rose-500/20">
                    <div
                      className={cn(
                        'h-full transition-all',
                        hpPercent > 50
                          ? 'bg-rose-500'
                          : hpPercent > 20
                          ? 'bg-amber-500'
                          : 'bg-red-600'
                      )}
                      style={{ width: `${hpPercent}%` }}
                    />
                  </div>
                </div>

                {/* AC */}
                <div className="px-2 py-1.5 rounded-lg border border-blue-500/30 bg-blue-950/20 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-blue-300">
                    <Shield className="h-3 w-3 text-blue-400" />
                    <span>AC</span>
                  </div>
                  <div className="font-mono font-black text-xs text-blue-200 flex items-center gap-1">
                    <span>{totalAC}</span>
                    {shieldBonus > 0 && (
                      <span className="text-[9px] text-amber-300 font-bold">
                        (+{shieldBonus})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* SAVES ROW */}
              <div className="grid grid-cols-4 gap-1 text-center bg-background/40 p-1.5 rounded-lg border border-border/30">
                <div>
                  <span className="text-[8px] font-bold text-emerald-400 block uppercase">Fort</span>
                  <span className="font-mono text-[11px] font-black text-emerald-300">
                    {fort.bonus >= 0 ? `+${fort.bonus}` : fort.bonus}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-blue-400 block uppercase">Ref</span>
                  <span className="font-mono text-[11px] font-black text-blue-300">
                    {ref.bonus >= 0 ? `+${ref.bonus}` : ref.bonus}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-purple-400 block uppercase">Will</span>
                  <span className="font-mono text-[11px] font-black text-purple-300">
                    {will.bonus >= 0 ? `+${will.bonus}` : will.bonus}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-amber-400 block uppercase">Perc</span>
                  <span className="font-mono text-[11px] font-black text-amber-300">
                    {perc.bonus >= 0 ? `+${perc.bonus}` : perc.bonus}
                  </span>
                </div>
              </div>

              {/* ABILITIES ROW */}
              <div className="grid grid-cols-6 gap-1 px-1.5 py-1 rounded-lg bg-background/30 border border-border/20 text-center">
                {ABILITY_KEYS.map((ab) => {
                  const score = abilities[ab] ?? 10
                  const mod = Math.floor((score - 10) / 2)
                  return (
                    <div key={ab} className="flex flex-col items-center">
                      <span className="text-[8px] uppercase font-bold text-muted-foreground/70">
                        {ab}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-foreground">
                        {mod >= 0 ? `+${mod}` : mod}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* KEY SKILLS (IF ANY) */}
              {skillsList.length > 0 && (
                <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto pt-0.5">
                  {skillsList.slice(0, 4).map((sk: any) => (
                    <span
                      key={sk.key}
                      className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] bg-background/60 border border-border/30 text-muted-foreground"
                    >
                      <span className="font-medium truncate max-w-[65px]">{sk.name}</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {sk.modifier >= 0 ? `+${sk.modifier}` : sk.modifier}
                      </span>
                    </span>
                  ))}
                  {skillsList.length > 4 && (
                    <span className="text-[9px] text-muted-foreground self-center px-0.5">
                      +{skillsList.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* MODAL EDIT DIALOG */}
      {editingCharacter && (
        <CharacterStatsEditModal
          character={editingCharacter}
          details={partyDetails[editingCharacter._id] || {}}
          playerName={usersMap[editingCharacter.userId] || 'Player'}
          isOpen={Boolean(editingCharacter)}
          onClose={() => setEditingCharacter(null)}
        />
      )}

      {/* SESSION LOOT MANAGEMENT & AON SEARCH SECTION */}
      {session && (
        <PartyLootSection session={session} userCharacterIds={userCharacterIds} />
      )}
    </div>
  )
}
