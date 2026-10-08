'use client'

import React, { useState } from 'react'
import {
  Shield,
  Heart,
  Sparkles,
  User,
  Trash2,
  Plus,
  Loader2,
  Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Doc } from '@/convex/_generated/dataModel'

interface CharacterStatsEditModalProps {
  character: Doc<'characters'>
  details: any
  playerName: string
  isOpen: boolean
  onClose: () => void
}

type ProficiencyCode = 'U' | 'T' | 'E' | 'M' | 'L'
const PROFICIENCY_OPTIONS: ProficiencyCode[] = ['U', 'T', 'E', 'M', 'L']

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const

export default function CharacterStatsEditModal({
  character,
  details,
  playerName,
  isOpen,
  onClose,
}: CharacterStatsEditModalProps) {
  const updateStatsMutation = useMutation(api.characters.updatePartyCharacterStats)

  // Hit Points
  const [currentHP, setCurrentHP] = useState<number>(details?.hitPoints?.current ?? 20)
  const [maxHP, setMaxHP] = useState<number>(details?.hitPoints?.max ?? 20)
  const [tempHP, setTempHP] = useState<number>(details?.hitPoints?.temporary ?? 0)

  // Armor Class
  const [acTotal, setAcTotal] = useState<number>(details?.armorClass?.total ?? 15)
  const [shieldBonus, setShieldBonus] = useState<number>(details?.armorClass?.shieldBonus ?? 0)

  // Ability Scores
  const [abilities, setAbilities] = useState({
    str: details?.abilities?.str ?? 10,
    dex: details?.abilities?.dex ?? 10,
    con: details?.abilities?.con ?? 10,
    int: details?.abilities?.int ?? 10,
    wis: details?.abilities?.wis ?? 10,
    cha: details?.abilities?.cha ?? 10,
  })

  // Saves
  const [fortBonus, setFortBonus] = useState<number>(details?.saves?.fortitude?.bonus ?? 0)
  const [fortProf, setFortProf] = useState<ProficiencyCode>(details?.saves?.fortitude?.proficiency ?? 'T')

  const [refBonus, setRefBonus] = useState<number>(details?.saves?.reflex?.bonus ?? 0)
  const [refProf, setRefProf] = useState<ProficiencyCode>(details?.saves?.reflex?.proficiency ?? 'T')

  const [willBonus, setWillBonus] = useState<number>(details?.saves?.will?.bonus ?? 0)
  const [willProf, setWillProf] = useState<ProficiencyCode>(details?.saves?.will?.proficiency ?? 'T')

  const [percBonus, setPercBonus] = useState<number>(details?.saves?.perception?.bonus ?? 0)
  const [percProf, setPercProf] = useState<ProficiencyCode>(details?.saves?.perception?.proficiency ?? 'T')

  // Skills
  const [skills, setSkills] = useState<
    Record<
      string,
      {
        name: string
        modifier: number
        proficiency?: ProficiencyCode
        ability?: string
        isLore?: boolean
      }
    >
  >(details?.skills ? { ...details.skills } : {})

  // New Skill inputs
  const [newSkillName, setNewSkillName] = useState('')
  const [newSkillMod, setNewSkillMod] = useState<number>(0)
  const [newSkillProf, setNewSkillProf] = useState<ProficiencyCode>('T')

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddSkill = () => {
    const trimmed = newSkillName.trim()
    if (!trimmed) {
      toast.error('Skill name is required')
      return
    }
    const key = trimmed.toLowerCase().replace(/\s+/g, '_')
    setSkills((prev) => ({
      ...prev,
      [key]: {
        name: trimmed,
        modifier: newSkillMod,
        proficiency: newSkillProf,
      },
    }))
    setNewSkillName('')
    setNewSkillMod(0)
    setNewSkillProf('T')
    toast.success(`Skill "${trimmed}" added to form`)
  }

  const handleRemoveSkill = (skillKey: string) => {
    setSkills((prev) => {
      const copy = { ...prev }
      delete copy[skillKey]
      return copy
    })
  }

  const handleSave = async () => {
    try {
      setIsSubmitting(true)
      await updateStatsMutation({
        characterId: character._id,
        hitPoints: {
          current: currentHP,
          max: maxHP,
          temporary: tempHP,
        },
        armorClass: {
          total: acTotal,
          shieldBonus,
        },
        abilities,
        saves: {
          fortitude: { bonus: fortBonus, proficiency: fortProf },
          reflex: { bonus: refBonus, proficiency: refProf },
          will: { bonus: willBonus, proficiency: willProf },
          perception: { bonus: percBonus, proficiency: percProf },
        },
        skills,
      })
      toast.success(`Stats updated for ${character.name}!`)
      onClose()
    } catch (err: any) {
      console.error('Error saving character stats:', err)
      toast.error(err?.message || 'Failed to update stats')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] flex flex-col p-0 overflow-hidden bg-zinc-950 border-purple-500/30 text-foreground">
        <DialogHeader className="p-5 border-b border-border/50 bg-gradient-to-r from-purple-950/40 via-background to-background shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-black text-purple-200 flex items-center gap-2">
                <span>Edit Character Sheet:</span>
                <span className="text-amber-300 font-extrabold">{character.name}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Player: <span className="text-foreground/90 font-medium">{playerName}</span> • Level {character.lvl} {character.class}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          {/* HIT POINTS & ARMOR CLASS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* HP */}
            <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/10 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-300">
                <Heart className="h-3.5 w-3.5" />
                <span>Hit Points</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Current</label>
                  <Input
                    type="number"
                    value={currentHP}
                    onChange={(e) => setCurrentHP(parseInt(e.target.value) || 0)}
                    className="h-8 font-bold text-sm bg-background/60"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Max</label>
                  <Input
                    type="number"
                    value={maxHP}
                    onChange={(e) => setMaxHP(parseInt(e.target.value) || 0)}
                    className="h-8 font-bold text-sm bg-background/60"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Temp</label>
                  <Input
                    type="number"
                    value={tempHP}
                    onChange={(e) => setTempHP(parseInt(e.target.value) || 0)}
                    className="h-8 font-bold text-sm bg-background/60"
                  />
                </div>
              </div>
            </div>

            {/* AC */}
            <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-950/10 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-300">
                <Shield className="h-3.5 w-3.5" />
                <span>Armor Class (AC)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Total AC</label>
                  <Input
                    type="number"
                    value={acTotal}
                    onChange={(e) => setAcTotal(parseInt(e.target.value) || 0)}
                    className="h-8 font-bold text-sm bg-background/60"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Shield (+)</label>
                  <Input
                    type="number"
                    value={shieldBonus}
                    onChange={(e) => setShieldBonus(parseInt(e.target.value) || 0)}
                    className="h-8 font-bold text-sm bg-background/60"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ABILITY SCORES */}
          <div className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-950/10 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span>Ability Scores</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
              {ABILITY_KEYS.map((ab) => (
                <div key={ab} className="flex flex-col items-center">
                  <span className="text-[10px] font-black uppercase text-muted-foreground mb-1">
                    {ab}
                  </span>
                  <Input
                    type="number"
                    value={abilities[ab]}
                    onChange={(e) =>
                      setAbilities((prev) => ({
                        ...prev,
                        [ab]: parseInt(e.target.value) || 10,
                      }))
                    }
                    className="h-8 text-center font-bold text-sm bg-background/60"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* SAVES & PERCEPTION */}
          <div className="p-3.5 rounded-xl border border-border/50 bg-card/40 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-foreground/80">
              Saving Throws & Perception
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Fortitude */}
              <div className="space-y-1.5 bg-background/40 p-2.5 rounded-lg border border-border/40">
                <span className="text-[11px] font-bold text-emerald-300">Fortitude</span>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={fortBonus}
                    onChange={(e) => setFortBonus(parseInt(e.target.value) || 0)}
                    className="h-7 text-xs font-mono"
                    placeholder="Bonus"
                  />
                  <select
                    value={fortProf}
                    onChange={(e) => setFortProf(e.target.value as ProficiencyCode)}
                    className="h-7 px-1.5 text-xs rounded bg-muted border border-border/40"
                  >
                    {PROFICIENCY_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reflex */}
              <div className="space-y-1.5 bg-background/40 p-2.5 rounded-lg border border-border/40">
                <span className="text-[11px] font-bold text-blue-300">Reflex</span>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={refBonus}
                    onChange={(e) => setRefBonus(parseInt(e.target.value) || 0)}
                    className="h-7 text-xs font-mono"
                    placeholder="Bonus"
                  />
                  <select
                    value={refProf}
                    onChange={(e) => setRefProf(e.target.value as ProficiencyCode)}
                    className="h-7 px-1.5 text-xs rounded bg-muted border border-border/40"
                  >
                    {PROFICIENCY_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Will */}
              <div className="space-y-1.5 bg-background/40 p-2.5 rounded-lg border border-border/40">
                <span className="text-[11px] font-bold text-purple-300">Will</span>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={willBonus}
                    onChange={(e) => setWillBonus(parseInt(e.target.value) || 0)}
                    className="h-7 text-xs font-mono"
                    placeholder="Bonus"
                  />
                  <select
                    value={willProf}
                    onChange={(e) => setWillProf(e.target.value as ProficiencyCode)}
                    className="h-7 px-1.5 text-xs rounded bg-muted border border-border/40"
                  >
                    {PROFICIENCY_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Perception */}
              <div className="space-y-1.5 bg-background/40 p-2.5 rounded-lg border border-border/40">
                <span className="text-[11px] font-bold text-amber-300">Perception</span>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={percBonus}
                    onChange={(e) => setPercBonus(parseInt(e.target.value) || 0)}
                    className="h-7 text-xs font-mono"
                    placeholder="Bonus"
                  />
                  <select
                    value={percProf}
                    onChange={(e) => setPercProf(e.target.value as ProficiencyCode)}
                    className="h-7 px-1.5 text-xs rounded bg-muted border border-border/40"
                  >
                    {PROFICIENCY_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SKILLS */}
          <div className="p-3.5 rounded-xl border border-border/50 bg-card/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/80 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                Skills & Proficiencies ({Object.keys(skills).length})
              </span>
            </div>

            {/* Existing Skills List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
              {Object.entries(skills).map(([key, sk]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background/60 border border-border/30 text-xs"
                >
                  <span className="font-semibold truncate">{sk.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-950/60 text-purple-300 border border-purple-800/80">
                      {sk.proficiency || 'T'}
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {sk.modifier >= 0 ? `+${sk.modifier}` : sk.modifier}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(key)}
                      className="text-muted-foreground hover:text-rose-400 ml-1 p-0.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {Object.keys(skills).length === 0 && (
                <div className="col-span-full text-center py-3 text-xs text-muted-foreground italic">
                  No skills recorded yet. Add one below.
                </div>
              )}
            </div>

            {/* Add New Skill Input Row */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/30">
              <Input
                placeholder="Skill name (e.g. Athletics, Arcana)"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                className="h-8 text-xs flex-1"
              />
              <Input
                type="number"
                placeholder="Mod"
                value={newSkillMod}
                onChange={(e) => setNewSkillMod(parseInt(e.target.value) || 0)}
                className="h-8 text-xs font-mono w-16 text-center"
              />
              <select
                value={newSkillProf}
                onChange={(e) => setNewSkillProf(e.target.value as ProficiencyCode)}
                className="h-8 px-2 text-xs rounded bg-muted border border-border/40 font-semibold"
              >
                {PROFICIENCY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddSkill}
                className="h-8 text-xs gap-1 shrink-0 border-purple-500/40 text-purple-300 hover:bg-purple-950/40"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border/50 bg-muted/20 shrink-0 flex items-center justify-between sm:justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSubmitting}
            className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5 font-bold shadow-md shadow-purple-900/30"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>Save Character</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
