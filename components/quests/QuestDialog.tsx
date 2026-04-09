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
import { Scroll, Sword, Trophy, User, Hash } from 'lucide-react'

interface QuestDialogProps {
  isOpen: boolean
  onClose: () => void
  worldId?: Id<'worlds'>
  quest?: {
    _id: Id<'quests'>
    name: string
    level: number
    description?: string
    questgiver?: string
    reward?: string
    tags?: string[]
    worldId?: Id<'worlds'>
  }
}

export default function QuestDialog({ isOpen, onClose, worldId, quest }: QuestDialogProps) {
  const [name, setName] = useState('')
  const [level, setLevel] = useState(0)
  const [description, setDescription] = useState('')
  const [questgiver, setQuestgiver] = useState('')
  const [reward, setReward] = useState('')
  const [tagsString, setTagsString] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createQuest = useMutation(api.quests.createQuest)
  const updateQuest = useMutation(api.quests.updateQuest)

  useEffect(() => {
    if (quest) {
      setName(quest.name)
      setLevel(quest.level)
      setDescription(quest.description || '')
      setQuestgiver(quest.questgiver || '')
      setReward(quest.reward || '')
      setTagsString(quest.tags?.join(', ') || '')
    } else {
      setName('')
      setLevel(0)
      setDescription('')
      setQuestgiver('')
      setReward('')
      setTagsString('')
    }
  }, [quest, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const tags = tagsString
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t !== '')

    try {
      if (quest) {
        await updateQuest({
          questId: quest._id,
          name,
          level,
          description,
          questgiver,
          reward,
          tags,
          worldId: quest.worldId, // Keep original worldId when editing
        })
        toast.success('Quest updated successfully!')
      } else {
        await createQuest({
          name,
          level,
          description,
          questgiver,
          reward,
          tags,
          worldId,
        })
        toast.success('Quest created successfully!')
      }
      onClose()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to save quest')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] border-border/40 bg-card/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Scroll className="h-5 w-5 text-primary" />
            {quest ? 'Edit Quest' : 'Post a New Quest'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2">
              <Sword className="h-4 w-4 text-muted-foreground" />
              Quest Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Clear the Goblin Cave"
              required
              className="bg-muted/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                Level
              </label>
              <Input
                type="number"
                min={0}
                max={20}
                value={level}
                onChange={(e) => setLevel(parseInt(e.target.value) || 0)}
                className="bg-muted/30"
              />
              <p className="text-[10px] text-muted-foreground">Set to 0 if unknown</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Questgiver
              </label>
              <Input
                value={questgiver}
                onChange={(e) => setQuestgiver(e.target.value)}
                placeholder="NPC or Character Name"
                className="bg-muted/30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2">
                <Scroll className="h-4 w-4 text-muted-foreground" />
                Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to be done?"
              className="min-h-[100px] bg-muted/30"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              Reward
            </label>
            <Input
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              placeholder="Gold, Items, or Renown"
              className="bg-muted/30"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Tags (comma separated)</label>
            <Input
              value={tagsString}
              onChange={(e) => setTagsString(e.target.value)}
              placeholder="Combat, Stealth, Investigation"
              className="bg-muted/30"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (quest ? 'Updating...' : 'Creating...') : (quest ? 'Save Changes' : 'Post Quest')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
