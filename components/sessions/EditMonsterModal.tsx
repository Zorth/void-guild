'use client'

import { useState, useEffect } from 'react'
import { Pencil, ExternalLink, Shield, Heart } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  MonsterAdjustment,
  calculateAdjustedStats,
  getHpAdjustment,
} from './tacticalMonsterUtils'
import type { MonsterInstance } from '@/app/sessions/[sessionId]/gm/TacticalClient'

interface EditMonsterModalProps {
  isOpen: boolean
  onClose: () => void
  groupId: string | null
  monster: MonsterInstance | null
  onSave: (groupId: string, updatedMonster: MonsterInstance) => void
}

export default function EditMonsterModal({
  isOpen,
  onClose,
  groupId,
  monster,
  onSave,
}: EditMonsterModalProps) {
  const [name, setName] = useState('')
  const [level, setLevel] = useState(1)
  const [currentHp, setCurrentHp] = useState(20)
  const [maxHp, setMaxHp] = useState(20)
  const [ac, setAc] = useState(15)
  const [adjustment, setAdjustment] = useState<MonsterAdjustment>('normal')
  const [baseHp, setBaseHp] = useState(20)
  const [baseAc, setBaseAc] = useState(15)
  const [baseLevel, setBaseLevel] = useState(1)
  const [nethysUrl, setNethysUrl] = useState('')
  const [immunities, setImmunities] = useState('')
  const [resistances, setResistances] = useState('')
  const [weaknesses, setWeaknesses] = useState('')

  useEffect(() => {
    if (!monster) return

    const adj = monster.adjustment ?? 'normal'
    const bLevel = monster.baseLevel ?? monster.level ?? 1
    const bHp =
      monster.baseHp ??
      (adj === 'normal'
        ? monster.maxHp
        : adj === 'elite'
        ? Math.max(1, monster.maxHp - getHpAdjustment(bLevel, 'elite'))
        : monster.maxHp + getHpAdjustment(bLevel, 'weak'))
    const bAc =
      monster.baseAc ??
      (adj === 'normal'
        ? monster.ac
        : adj === 'elite'
        ? monster.ac - 2
        : monster.ac + 2)

    setName(monster.name)
    setLevel(monster.level ?? bLevel)
    setCurrentHp(monster.currentHp)
    setMaxHp(monster.maxHp)
    setAc(monster.ac)
    setAdjustment(adj)
    setBaseHp(bHp)
    setBaseAc(bAc)
    setBaseLevel(bLevel)
    setNethysUrl(monster.nethysUrl || '')
    setImmunities(monster.immunities || '')
    setResistances(monster.resistances || '')
    setWeaknesses(monster.weaknesses || '')
  }, [monster])

  const handleAdjustmentChange = (newAdj: MonsterAdjustment) => {
    setAdjustment(newAdj)
    const adjusted = calculateAdjustedStats(baseHp, baseAc, baseLevel, newAdj)

    // Preserve damage taken rather than resetting HP blindly
    const oldMax = maxHp
    const damageTaken = Math.max(0, oldMax - currentHp)
    const newMax = adjusted.hp
    const newCurrent = Math.max(0, newMax - damageTaken)

    setMaxHp(newMax)
    setCurrentHp(newCurrent)
    setAc(adjusted.ac)
    setLevel(adjusted.level)
  }

  const handleSave = () => {
    if (!groupId || !monster) return
    if (!name.trim()) {
      toast.error('Monster name cannot be empty')
      return
    }

    const updated: MonsterInstance = {
      ...monster,
      name: name.trim(),
      currentHp: Math.max(0, currentHp),
      maxHp: Math.max(1, maxHp),
      ac,
      level,
      adjustment,
      baseHp,
      baseAc,
      baseLevel,
      nethysUrl: nethysUrl.trim() || undefined,
      immunities: immunities.trim() || undefined,
      resistances: resistances.trim() || undefined,
      weaknesses: weaknesses.trim() || undefined,
    }

    onSave(groupId, updated)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col bg-card border-border/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Pencil className="h-4 w-4 text-purple-400" />
            Edit Monster
          </DialogTitle>
          <DialogDescription>
            Modify stats, apply Weak or Elite templates, and update immunities/resistances.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 flex-1 overflow-y-auto pr-1">
          {/* Weak / Elite Template Selector */}
          <div className="p-3 bg-muted/30 rounded-xl border border-border/50 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Pathfinder 2e Template Adjustment
              </label>
              <span className="text-[10px] font-mono text-purple-400 font-semibold">
                {adjustment === 'elite'
                  ? 'Elite (+2 AC, HP boost, +1 Level)'
                  : adjustment === 'weak'
                  ? 'Weak (-2 AC, HP reduction, -1 Level)'
                  : 'Normal (Base stats)'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                size="sm"
                variant={adjustment === 'weak' ? 'default' : 'outline'}
                className={cn(
                  'h-8 text-xs font-bold transition-all',
                  adjustment === 'weak'
                    ? 'bg-sky-600 hover:bg-sky-700 text-white border-sky-500 shadow-sm'
                    : 'text-sky-400 border-sky-500/30 hover:bg-sky-950/30 hover:text-sky-300'
                )}
                onClick={() => handleAdjustmentChange('weak')}
              >
                Weak (-2 AC / HP)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={adjustment === 'normal' ? 'default' : 'outline'}
                className={cn(
                  'h-8 text-xs font-bold transition-all',
                  adjustment === 'normal'
                    ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-500 shadow-sm'
                    : 'text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground'
                )}
                onClick={() => handleAdjustmentChange('normal')}
              >
                Normal
              </Button>
              <Button
                type="button"
                size="sm"
                variant={adjustment === 'elite' ? 'default' : 'outline'}
                className={cn(
                  'h-8 text-xs font-bold transition-all',
                  adjustment === 'elite'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-500 shadow-sm'
                    : 'text-amber-400 border-amber-500/30 hover:bg-amber-950/30 hover:text-amber-300'
                )}
                onClick={() => handleAdjustmentChange('elite')}
              >
                Elite (+2 AC / HP)
              </Button>
            </div>
          </div>

          {/* Stats Inputs */}
          <div className="p-3 bg-muted/30 rounded-xl border border-border/50 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-3 space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground">Monster Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs"
                  placeholder="e.g. Goblin Warrior 1"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground">Level</label>
                <Input
                  type="number"
                  value={level}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    const newLvl = isNaN(val) ? 0 : val
                    setLevel(newLvl)
                    if (adjustment === 'normal') {
                      setBaseLevel(newLvl)
                    }
                  }}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                  <Heart className="h-3 w-3 text-red-500" />
                  <span>Current HP</span>
                </label>
                <Input
                  type="number"
                  value={currentHp}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    setCurrentHp(isNaN(val) ? 0 : val)
                  }}
                  className="text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                  <Heart className="h-3 w-3 text-red-400" />
                  <span>Max HP</span>
                </label>
                <Input
                  type="number"
                  value={maxHp}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    const newMax = isNaN(val) ? 1 : Math.max(1, val)
                    setMaxHp(newMax)
                    if (adjustment === 'normal') {
                      setBaseHp(newMax)
                    }
                  }}
                  className="text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                  <Shield className="h-3 w-3 text-blue-400" />
                  <span>AC</span>
                </label>
                <Input
                  type="number"
                  value={ac}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    const newAc = isNaN(val) ? 10 : val
                    setAc(newAc)
                    if (adjustment === 'normal') {
                      setBaseAc(newAc)
                    }
                  }}
                  className="text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                  <span>Nethys URL</span>
                  {nethysUrl && (
                    <a
                      href={nethysUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </label>
                <Input
                  value={nethysUrl}
                  onChange={(e) => setNethysUrl(e.target.value)}
                  placeholder="https://2e.aonprd.com/..."
                  className="text-xs font-mono"
                />
              </div>

              {/* Immunities, Resistances, Weaknesses */}
              <div className="sm:col-span-4 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-border/30">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-emerald-400">Immunities</label>
                  <Input
                    placeholder="e.g. bleed, poison"
                    value={immunities}
                    onChange={(e) => setImmunities(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-sky-400">Resistances</label>
                  <Input
                    placeholder="e.g. fire 5, cold 5"
                    value={resistances}
                    onChange={(e) => setResistances(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-rose-400">Weaknesses</label>
                  <Input
                    placeholder="e.g. bludgeoning 5"
                    value={weaknesses}
                    onChange={(e) => setWeaknesses(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center sm:justify-between">
          <Button variant="ghost" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
