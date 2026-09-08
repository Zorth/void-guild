'use client'

import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Scroll, Sword, Trophy, Globe, Sparkles, AlertCircle, Coins, ArrowRight, Crown, Send } from 'lucide-react'
import { CharacterRankIcon, cn } from '@/lib/utils'

interface CharacterQuestDialogProps {
  isOpen: boolean
  onClose: () => void
  characterId: Id<'characters'> | null
  characterName?: string
  characterRank?: string
  characterLevel?: number
}

export default function CharacterQuestDialog({
  isOpen,
  onClose,
  characterId,
  characterName,
  characterRank = 'none',
  characterLevel = 1,
}: CharacterQuestDialogProps) {
  const [name, setName] = useState('')
  const [worldId, setWorldId] = useState<string>('')
  const [levelPF, setLevelPF] = useState<number | null>(null)
  const [levelDnD, setLevelDnD] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [rewardType, setRewardType] = useState<'party' | 'per_person'>('party')
  const [rewardMoneyGP, setRewardMoneyGP] = useState<string>('')
  const [rewardOther, setRewardOther] = useState<string>('')
  const [tagsString, setTagsString] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const worlds = useQuery(api.worlds.listAllWorlds)
  const createQuest = useMutation(api.quests.createQuest)

  const isRankEligible = characterRank === 'journeyman' || characterRank === 'guildmaster'
  const maxSponsoredLevel = Math.max(0, characterLevel - 4)
  const effectiveQuestLevel = levelPF ?? levelDnD ?? 0
  const isQuestLevelEligible = isRankEligible && effectiveQuestLevel <= maxSponsoredLevel

  // Format GP with up to 2 decimal places
  const formatGPNumber = (num: number) => {
    return num % 1 === 0
      ? `${num.toLocaleString()} GP`
      : `${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GP`
  }

  // Real-time sponsorship & payback calculation
  const calculatedBreakdown = useMemo(() => {
    const rawMoney = parseFloat(rewardMoneyGP)
    const hasMoney = !isNaN(rawMoney) && rawMoney > 0
    const moneyNum = hasMoney ? Math.round(rawMoney * 100) / 100 : 0
    const otherTrimmed = rewardOther.trim()

    if (!hasMoney && !otherTrimmed) return null

    const typeSuffix = rewardType === 'per_person' ? ' / person' : ''
    const otherSuffix = otherTrimmed ? ` + ${otherTrimmed}` : ''

    const totalLabel = hasMoney
      ? `${formatGPNumber(moneyNum)}${typeSuffix}${otherSuffix}`
      : otherTrimmed

    if (!isQuestLevelEligible) {
      return {
        hasNumeric: hasMoney,
        total: totalLabel,
        payback: '0 GP (Not eligible for sponsorship)',
        netCost: totalLabel,
        rewardType,
      }
    }

    if (!hasMoney) {
      return {
        hasNumeric: false,
        total: totalLabel,
        payback: '20% (1/5th) reimbursed by Guild',
        netCost: `${totalLabel} (net of reimbursement)`,
        rewardType,
      }
    }

    const paybackNum = Math.round((moneyNum / 5) * 100) / 100
    const netNum = Math.round((moneyNum - paybackNum) * 100) / 100

    return {
      hasNumeric: true,
      total: totalLabel,
      payback: `${formatGPNumber(paybackNum)}${typeSuffix}`,
      netCost: `${formatGPNumber(netNum)}${typeSuffix}${otherSuffix}`,
      paybackNum,
      netNum,
      rewardType,
    }
  }, [isQuestLevelEligible, rewardMoneyGP, rewardOther, rewardType])

  useEffect(() => {
    if (!isOpen) {
      setName('')
      setWorldId('')
      setLevelPF(null)
      setLevelDnD(null)
      setDescription('')
      setRewardType('party')
      setRewardMoneyGP('')
      setRewardOther('')
      setTagsString('')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!characterId) {
      toast.error('Please select an active character first.')
      return
    }

    if (!worldId) {
      toast.error('A character quest requires selecting a World.')
      return
    }

    const moneyVal = parseFloat(rewardMoneyGP)
    const hasMoney = !isNaN(moneyVal) && moneyVal > 0
    if (!hasMoney && !rewardOther.trim()) {
      toast.error('Please enter a reward (money in GP or found loot/item).')
      return
    }

    setIsSubmitting(true)

    const tags = tagsString
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t !== '')

    try {
      await createQuest({
        name,
        worldId: worldId as Id<'worlds'>,
        characterId,
        levelPF,
        levelDnD,
        description,
        questgiver: characterName ? `Character: ${characterName}` : 'Character Quest',
        rewardType,
        rewardMoneyGP: hasMoney ? Math.round(moneyVal * 100) / 100 : undefined,
        rewardOther: rewardOther.trim() || undefined,
        tags,
      })
      toast.success(
        isQuestLevelEligible
          ? 'Character quest posted with Guild Sponsorship!'
          : 'Character quest posted successfully!'
      )
      onClose()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to post quest')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSuggest = async (e: React.MouseEvent) => {
    e.preventDefault()

    if (!characterId) {
      toast.error('Please select an active character first.')
      return
    }

    if (!worldId) {
      toast.error('Suggesting a quest requires selecting a Target World.')
      return
    }

    if (!name.trim()) {
      toast.error('Please provide a Quest Title.')
      return
    }

    const moneyVal = parseFloat(rewardMoneyGP)
    const hasMoney = !isNaN(moneyVal) && moneyVal > 0
    if (!hasMoney && !rewardOther.trim()) {
      toast.error('Please enter a proposed reward (money in GP or found loot/item).')
      return
    }

    setIsSubmitting(true)

    const tags = tagsString
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t !== '')

    try {
      await createQuest({
        name,
        worldId: worldId as Id<'worlds'>,
        characterId,
        levelPF,
        levelDnD,
        description,
        questgiver: characterName ? `Guildmaster: ${characterName}` : 'Guildmaster Suggestion',
        rewardType,
        rewardMoneyGP: hasMoney ? Math.round(moneyVal * 100) / 100 : undefined,
        rewardOther: rewardOther.trim() || undefined,
        tags,
        isSuggested: true,
      })
      toast.success('Quest suggested to the World Owner! Once approved, it is paid in full by The Void (free of charge).')
      onClose()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to suggest quest')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[540px] border-purple-500/40 bg-card/95 backdrop-blur-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-purple-300">
            <Scroll className="h-5 w-5 text-purple-400" />
            Issue Character Quest
          </DialogTitle>
        </DialogHeader>

        {/* Character Rank & Guild Sponsorship Banner */}
        <div className="rounded-lg border p-3 text-xs space-y-1.5 transition-all bg-muted/20 border-purple-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold">
              <CharacterRankIcon rank={characterRank} className="h-4 w-4" />
              <span className="text-foreground">Issuer: {characterName || 'Unknown'}</span>
              <span className="text-muted-foreground font-normal">(Lvl {characterLevel})</span>
            </div>
            <span className="capitalize font-bold text-[11px] px-2 py-0.5 rounded border border-purple-500/40 bg-purple-950/40 text-purple-300">
              {characterRank === 'none' ? 'Apprentice' : characterRank}
            </span>
          </div>

          {isRankEligible ? (
            <div className="space-y-1 text-muted-foreground">
              <p className="flex items-center gap-1 text-emerald-400 font-medium">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>Guild Benefit Active:</strong> Quests up to Level{' '}
                  <strong className="text-emerald-300 font-mono">{maxSponsoredLevel}</strong> (Level - 4) are{' '}
                  <strong>20% (1/5th) reimbursed</strong> by the Guild of the Void!
                </span>
              </p>
              {effectiveQuestLevel > maxSponsoredLevel && (
                <p className="text-amber-300/90 text-[11px] flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  Current quest level ({effectiveQuestLevel}) exceeds Level {maxSponsoredLevel}. This quest will not qualify for 20% Guild sponsorship.
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-[11px]">
              {characterLevel >= 7 ? (
                <span className="text-amber-300 font-medium">
                  ★ Eligible for Journeyman Rank Quest! Pass your Journeyman Exam to unlock 20% Guild Sponsorship on posted quests.
                </span>
              ) : (
                <span>
                  Apprentice rank: Quests are paid in full by the issuer. Reach Level 7 to unlock Journeyman Guild sponsorship.
                </span>
              )}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sword className="h-3.5 w-3.5 text-purple-400" />
              Quest Title <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Clear Undead around the Sythian Inn"
              required
              className="bg-muted/30 border-border/40 focus:border-purple-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-blue-400" />
              Target World <span className="text-destructive">*</span>
            </label>
            <select
              value={worldId}
              onChange={(e) => setWorldId(e.target.value)}
              required
              className="w-full bg-muted/30 border border-border/40 text-foreground rounded-md px-3 py-2 text-xs font-medium focus:border-purple-500 focus:outline-none"
            >
              <option value="" disabled>
                Select a world for this quest...
              </option>
              {worlds?.map((w: any) => (
                <option key={w._id} value={w._id} className="bg-popover text-foreground">
                  {w.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground italic">
              Character quests require a world and will also be displayed in the linked world&apos;s quest list.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <img src="/PFVoid.svg" alt="PF" className="h-3.5 w-3.5" />
                PF Level {isRankEligible && `(≤ ${maxSponsoredLevel} for sponsor)`}
              </label>
              <Input
                type="number"
                min={0}
                max={20}
                value={levelPF !== null ? levelPF : ''}
                onChange={(e) => setLevelPF(e.target.value === '' ? null : parseInt(e.target.value))}
                placeholder="TBD"
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <img src="/DnDVoid.svg" alt="DnD" className="h-3.5 w-3.5" />
                D&D Level {isRankEligible && `(≤ ${maxSponsoredLevel} for sponsor)`}
              </label>
              <Input
                type="number"
                min={0}
                max={20}
                value={levelDnD !== null ? levelDnD : ''}
                onChange={(e) => setLevelDnD(e.target.value === '' ? null : parseInt(e.target.value))}
                placeholder="TBD"
                className="bg-muted/30"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Scroll className="h-3.5 w-3.5 text-muted-foreground" />
              Description & Objectives
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does your character need help with?"
              className="min-h-[85px] bg-muted/30 border-border/40 text-xs"
            />
          </div>

          <div className="space-y-3 p-3 rounded-lg border border-purple-500/30 bg-purple-950/15">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                Quest Reward
              </label>

              {/* Reward Distribution Toggle: Per Person vs Party as a whole */}
              <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-md border border-border/40 text-xs">
                <button
                  type="button"
                  onClick={() => setRewardType('party')}
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] font-semibold transition-all",
                    rewardType === 'party'
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Party Total
                </button>
                <button
                  type="button"
                  onClick={() => setRewardType('per_person')}
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] font-semibold transition-all",
                    rewardType === 'per_person'
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Per Person
                </button>
              </div>
            </div>

            {/* Split loot inputs: Money (GP) and Other (Items/Loot) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-amber-400" />
                  Money ({rewardType === 'per_person' ? 'GP / person' : 'GP party total'})
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rewardMoneyGP}
                    onChange={(e) => setRewardMoneyGP(e.target.value)}
                    placeholder="e.g. 50.00"
                    className="bg-muted/30 border-border/40 text-xs pr-10 font-mono font-bold text-amber-300"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] font-bold text-muted-foreground">
                    GP
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  Number in GP (up to 2 decimal places).
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  Other Loot / Special Reward
                </label>
                <Input
                  value={rewardOther}
                  onChange={(e) => setRewardOther(e.target.value)}
                  placeholder="e.g. +1 Striking Dagger, Potion"
                  className="bg-muted/30 border-border/40 text-xs"
                />
                <p className="text-[10px] text-muted-foreground italic">
                  Found loot, magic items, titles, or renown.
                </p>
              </div>
            </div>

            {calculatedBreakdown && (
              <div className="rounded-lg border bg-gradient-to-br from-purple-950/40 via-muted/30 to-emerald-950/20 border-purple-500/30 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-foreground">
                  <span className="flex items-center gap-1.5 text-purple-300">
                    <Coins className="h-4 w-4 text-amber-400" />
                    Payment & Sponsorship Breakdown ({rewardType === 'per_person' ? 'Per Person' : 'Party Total'})
                  </span>
                  {isQuestLevelEligible ? (
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded">
                      20% Reimbursed
                    </span>
                  ) : (
                    <span className="bg-muted text-muted-foreground border border-border/40 text-[10px] font-medium px-2 py-0.5 rounded">
                      100% Poster Cost
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {/* Step 1: Upfront Agreed Reward */}
                  <div className="bg-background/60 p-2 rounded border border-border/30">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Agreed Reward
                    </span>
                    <span className="text-xs font-bold text-amber-300 font-mono">
                      {calculatedBreakdown.total}
                    </span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      {rewardType === 'per_person' ? 'Per adventurer' : 'To party'}
                    </span>
                  </div>

                  {/* Step 2: Guild Sponsorship Payback */}
                  <div className="bg-emerald-950/30 p-2 rounded border border-emerald-500/30">
                    <span className="text-[10px] text-emerald-400 uppercase font-bold block flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Guild Payback
                    </span>
                    <span className="text-xs font-bold text-emerald-300 font-mono">
                      + {calculatedBreakdown.payback}
                    </span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      {isQuestLevelEligible ? 'Reimbursed by Void' : 'No reimbursement'}
                    </span>
                  </div>

                  {/* Step 3: Actual Out-of-Pocket Net Cost */}
                  <div className="bg-purple-950/30 p-2 rounded border border-purple-500/40">
                    <span className="text-[10px] text-purple-300 uppercase font-bold block">
                      Actual Cost to You
                    </span>
                    <span className="text-xs font-bold text-white font-mono">
                      {calculatedBreakdown.netCost}
                    </span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      Net expense after quest
                    </span>
                  </div>
                </div>

                {isQuestLevelEligible ? (
                  <p className="text-[11px] text-muted-foreground italic pt-0.5">
                    Upon quest completion in a session, you pay the party the agreed reward ({rewardType === 'per_person' ? 'per adventurer' : 'party total'}), and the Guild of the Void immediately reimburses you <strong>{calculatedBreakdown.payback}</strong> in your character log!
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic pt-0.5">
                    Quests above Level {maxSponsoredLevel} or posted without Journeyman rank are not eligible for 1/5th Guild reimbursement.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tags (comma separated)
            </label>
            <Input
              value={tagsString}
              onChange={(e) => setTagsString(e.target.value)}
              placeholder="Combat, Stealth, Investigation, Crafting"
              className="bg-muted/30 text-xs"
            />
          </div>

          <DialogFooter className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <div className="flex items-center gap-2 justify-end">
              {characterRank === 'guildmaster' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSuggest}
                  disabled={isSubmitting || !characterId || !worldId}
                  className="border-amber-500/40 text-amber-300 hover:bg-amber-950/40 font-semibold gap-1.5"
                  title="Suggest this quest to the World Owner. If approved, it is paid in full by The Void (free of charge to you)."
                >
                  <Crown className="h-4 w-4 text-amber-400" />
                  Suggest to World Owner (Free)
                </Button>
              )}
              <Button
                type="submit"
                disabled={isSubmitting || !characterId || !worldId}
                className="bg-purple-600 hover:bg-purple-700 font-semibold"
              >
                {isSubmitting ? 'Posting...' : 'Issue Character Quest'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
