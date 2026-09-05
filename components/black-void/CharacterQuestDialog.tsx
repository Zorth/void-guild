'use client'

import { useState, useEffect } from 'react'
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
import { Scroll, Sword, Trophy, Globe } from 'lucide-react'

interface CharacterQuestDialogProps {
  isOpen: boolean
  onClose: () => void
  characterId: Id<'characters'> | null
  characterName?: string
}

export default function CharacterQuestDialog({
  isOpen,
  onClose,
  characterId,
  characterName,
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
      toast.success('Character quest posted successfully!')
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
      <DialogContent className="sm:max-w-[500px] border-purple-500/40 bg-card/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-purple-300">
            <Scroll className="h-5 w-5 text-purple-400" />
            Issue Character Quest
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sword className="h-3.5 w-3.5 text-purple-400" />
              Quest Title <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Investigate the Haunted Vault"
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
                PF Level
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
                D&D Level
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
              className="min-h-[90px] bg-muted/30 border-border/40 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              Reward
            </label>
            <Input
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              placeholder="Gold, magic item, or assistance in return"
              className="bg-muted/30 border-border/40 text-xs"
            />
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
