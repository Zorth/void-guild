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
import { Scroll, Sword, Trophy, Globe, Sparkles, AlertCircle } from 'lucide-react'
import { CharacterRankIcon } from '@/lib/utils'

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
  const [reward, setReward] = useState('')
  const [tagsString, setTagsString] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const worlds = useQuery(api.worlds.listAllWorlds)
  const createQuest = useMutation(api.quests.createQuest)

  const isRankEligible = characterRank === 'journeyman' || characterRank === 'guildmaster'
  const maxSponsoredLevel = Math.max(0, characterLevel - 4)
  const effectiveQuestLevel = levelPF ?? levelDnD ?? 0
  const isQuestLevelEligible = isRankEligible && effectiveQuestLevel <= maxSponsoredLevel

  // Real-time sponsorship calculation
  const calculatedSponsorship = useMemo(() => {
    if (!isQuestLevelEligible) return null
    if (!reward) return '20% (1/5th) reimbursed by Guild of the Void upon completion'
    
    const rewardClean = reward.replace(/,/g, '')
    const match = rewardClean.match(/(\d+(?:\.\d+)?)\s*(sp|gp|cp|pp|gold|silver|copper|platinum)?/i)
    if (match) {
      const num = parseFloat(match[1])
      const unit = match[2] ? match[2].toUpperCase() : 'GP'
      const sponsorVal = Math.round(num / 5)
      return `${sponsorVal.toLocaleString()} ${unit} (1/5th Guild Sponsorship)`
    }
    return '20% (1/5th) reimbursed by Guild of the Void upon completion'
  }, [isQuestLevelEligible, reward])

  useEffect(() => {
    if (!isOpen) {
      setName('')
      setWorldId('')
      setLevelPF(null)
      setLevelDnD(null)
      setDescription('')
      setReward('')
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
        reward,
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

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              Reward Offered to Party
            </label>
            <Input
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              placeholder="e.g. 5,000 SP + loot found"
              className="bg-muted/30 border-border/40 text-xs"
            />
            {isQuestLevelEligible && (
              <div className="p-2 rounded bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>
                  <strong>Guild Sponsorship Reimbursement:</strong> {calculatedSponsorship}
                </span>
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

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !characterId || !worldId}
              className="bg-purple-600 hover:bg-purple-700 font-semibold"
            >
              {isSubmitting ? 'Posting...' : 'Issue Character Quest'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
