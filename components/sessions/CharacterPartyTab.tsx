'use client'

import React, { useState } from 'react'
import {
  Shield,
  Heart,
  User,
  Edit2,
  BookOpen,
  Skull,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
  // Modal state for viewing skills of a character
  const [viewingSkillsCharacter, setViewingSkillsCharacter] = useState<{
    name: string
    skills: { key: string; name: string; modifier: number; proficiency?: string; isLore?: boolean }[]
  } | null>(null)

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
    <div className="w-full animate-in fade-in duration-200">
      {/* 2-COLUMN SPLIT: LEFT (CHARACTERS) | RIGHT (LOOT & OBJECTIVE TRACKER) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: CHARACTERS */}
        <div className="xl:col-span-6 2xl:col-span-5 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Party Roster ({characters.length})
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {characters.map((char) => {
              const charId = char._id
              const details = partyDetails[charId] || {}
              const playerName = usersMap[char.userId] || 'Unknown Player'

              // Hit Points
              const hp = details.hitPoints || {}
              const rawMax = typeof hp.max === 'number' && !isNaN(hp.max) ? hp.max : 20
              const maxHP = Math.max(1, rawMax)
              const currentHP = typeof hp.current === 'number' && !isNaN(hp.current) ? hp.current : maxHP
              const tempHP = typeof hp.temporary === 'number' && !isNaN(hp.temporary) ? hp.temporary : 0
              const hpPercent = Math.max(0, Math.min(100, Math.round((currentHP / (maxHP || 1)) * 100)))

              // Armor Class
              const ac = details.armorClass || {}
              const totalAC = typeof ac.total === 'number' && !isNaN(ac.total) ? ac.total : 15
              const shieldBonus = typeof ac.shieldBonus === 'number' && !isNaN(ac.shieldBonus) ? ac.shieldBonus : 0

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
              const charVision = perc.vision || details.vision || 'normal'

              // Skills
              const skillsList = Object.entries(details.skills || {}).map(([key, sk]: [string, any]) => ({
                key,
                ...sk,
              }))

              return (
                <div
                  key={charId}
                  className="rounded-xl border border-border/60 bg-gradient-to-b from-card/90 to-card/50 p-2.5 shadow-xs hover:border-purple-500/40 transition-colors flex flex-col gap-2"
                >
                  {/* TOP HEADER: Name, Class/Lvl, Player, Action buttons */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-sm text-foreground tracking-tight truncate">
                        {char.name}
                      </h3>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/80 shrink-0">
                        Lvl {char.lvl} {char.class}
                      </span>
                      {char.isDead && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0 flex items-center gap-1">
                          <Skull className="h-2.5 w-2.5" /> Deceased
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
                        <User className="h-3 w-3 text-purple-400 shrink-0" />
                        <span className="truncate max-w-[120px] font-medium">{playerName}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {skillsList.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setViewingSkillsCharacter({ name: char.name, skills: skillsList })}
                          className="h-6 text-[10px] font-bold px-2 gap-1 text-muted-foreground hover:text-foreground border border-border/40 hover:bg-muted/40"
                          title="View Skills"
                        >
                          <BookOpen className="h-2.5 w-2.5 text-purple-400" />
                          <span>Skills ({skillsList.length})</span>
                        </Button>
                      )}

                      {canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingCharacter(char)}
                          className="h-6 text-[10px] font-bold px-2 gap-1 text-purple-300 hover:bg-purple-950/40 hover:text-purple-200 border border-purple-500/30"
                        >
                          <Edit2 className="h-2.5 w-2.5" />
                          <span>Edit</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* COMBINED DEFENSES & STATS ROW (HP + AC + SAVES) */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {/* HP PUSH BADGE */}
                    <div className="flex-1 min-w-[130px] px-2 py-1 rounded-lg border border-rose-500/30 bg-rose-950/20 flex flex-col justify-between">
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
                      <div className="w-full bg-rose-950/60 h-1 rounded-full overflow-hidden mt-0.5 border border-rose-500/20">
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

                    {/* AC BADGE */}
                    <div className="px-2.5 py-1 rounded-lg border border-blue-500/30 bg-blue-950/20 flex items-center gap-1.5 shrink-0">
                      <Shield className="h-3 w-3 text-blue-400 shrink-0" />
                      <span className="text-[10px] font-bold text-blue-300 uppercase">AC</span>
                      <span className="font-mono font-black text-xs text-blue-200">
                        {totalAC}
                        {shieldBonus > 0 && (
                          <span className="text-[9px] text-amber-300 font-bold ml-0.5">
                            (+{shieldBonus})
                          </span>
                        )}
                      </span>
                    </div>

                    {/* SAVES MINI BADGES */}
                    <div className="flex items-center gap-1 bg-background/50 px-2 py-1 rounded-lg border border-border/30 shrink-0">
                      <span className="text-[9px] font-mono font-bold text-emerald-300" title="Fortitude Save">
                        <span className="text-[8px] font-bold text-emerald-500 mr-0.5">F</span>
                        {fort.bonus >= 0 ? `+${fort.bonus}` : fort.bonus}
                      </span>
                      <span className="text-border/60 text-[10px]">|</span>
                      <span className="text-[9px] font-mono font-bold text-blue-300" title="Reflex Save">
                        <span className="text-[8px] font-bold text-blue-500 mr-0.5">R</span>
                        {ref.bonus >= 0 ? `+${ref.bonus}` : ref.bonus}
                      </span>
                      <span className="text-border/60 text-[10px]">|</span>
                      <span className="text-[9px] font-mono font-bold text-purple-300" title="Will Save">
                        <span className="text-[8px] font-bold text-purple-500 mr-0.5">W</span>
                        {will.bonus >= 0 ? `+${will.bonus}` : will.bonus}
                      </span>
                      <span className="text-border/60 text-[10px]">|</span>
                      <span
                        className={cn(
                          "text-[9px] font-mono font-bold",
                          charVision === 'darkvision'
                            ? "text-purple-300"
                            : charVision === 'low-light'
                            ? "text-cyan-300"
                            : "text-amber-300"
                        )}
                        title={`Perception: ${perc.bonus >= 0 ? `+${perc.bonus}` : perc.bonus} (${
                          charVision === 'darkvision' ? 'Darkvision' : charVision === 'low-light' ? 'Low-Light Vision' : 'Normal Vision'
                        })`}
                      >
                        <span className={cn(
                          "text-[8px] font-bold mr-0.5",
                          charVision === 'darkvision' ? "text-purple-400" : charVision === 'low-light' ? "text-cyan-400" : "text-amber-500"
                        )}>P</span>
                        {perc.bonus >= 0 ? `+${perc.bonus}` : perc.bonus}
                      </span>
                    </div>
                  </div>

                  {/* ABILITY MODIFIERS (TIGHT HORIZONTAL BAR) */}
                  <div className="grid grid-cols-6 gap-1 px-1.5 py-0.5 rounded-lg bg-background/30 border border-border/20 text-center">
                    {ABILITY_KEYS.map((ab) => {
                      const score = typeof abilities[ab] === 'number' && !isNaN(abilities[ab]) ? abilities[ab] : 10
                      const mod = Math.floor((score - 10) / 2)
                      return (
                        <div key={ab} className="flex items-center justify-center gap-1">
                          <span className="text-[8px] uppercase font-bold text-muted-foreground/60">
                            {ab}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-foreground">
                            {mod >= 0 ? `+${mod}` : mod}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: LOOT & PENDING OBJECTIVE TRACKER */}
        <div className="xl:col-span-6 2xl:col-span-7 w-full">
          {session && (
            <PartyLootSection
              session={session}
              userCharacterIds={userCharacterIds}
              showObjectiveTracker={true}
              className="pt-0 border-t-0"
            />
          )}
        </div>
      </div>

      {/* SKILLS DETAIL DIALOG */}
      {viewingSkillsCharacter && (
        <Dialog open={Boolean(viewingSkillsCharacter)} onOpenChange={(open) => !open && setViewingSkillsCharacter(null)}>
          <DialogContent className="max-w-md bg-card/95 border-purple-500/40">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground font-black">
                <BookOpen className="h-4 w-4 text-purple-400" />
                <span>{viewingSkillsCharacter.name} — Skills & Lores</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Trained and untrained skill bonuses imported from Pathbuilder.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto py-2 pr-1">
              {viewingSkillsCharacter.skills
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((sk) => (
                  <div
                    key={sk.key}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-background/50 border border-border/30 text-xs"
                  >
                    <span className="font-medium text-foreground truncate mr-2" title={sk.name}>
                      {sk.name}
                      {sk.isLore && <span className="text-[9px] text-purple-400 ml-1 font-bold">(Lore)</span>}
                    </span>
                    <span className="font-mono font-bold text-emerald-400 shrink-0">
                      {sk.modifier >= 0 ? `+${sk.modifier}` : sk.modifier}
                    </span>
                  </div>
                ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

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
    </div>
  )
}

