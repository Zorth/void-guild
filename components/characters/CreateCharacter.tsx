'use client'

import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { FormEvent, useMemo, useState } from 'react'
import { fireVoidParticles } from '@/lib/particles'
import { track } from '@vercel/analytics'
import { toast } from 'sonner'

export default function CreateCharacter() {
  const createCharacter = useMutation(api.characters.createCharacter)
  const allWorlds = useQuery(api.worlds.getAllWorlds)
  const [newCharacterData, setNewCharacterData] = useState({ 
    name: '', 
    ancestry: '', 
    class: '', 
    websiteLink: '',
    originWorld: '',
    system: 'PF' as 'PF' | 'DnD'
  })
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ name?: string }>({})

  const sortedWorlds = useMemo(() => {
    if (!allWorlds) return []
    return [...allWorlds].sort((a, b) => a.name.localeCompare(b.name))
  }, [allWorlds])

  async function handleCreateCharacter(event: FormEvent) {
    event.preventDefault()
    
    // Validation
    const newErrors: { name?: string } = {}
    if (!newCharacterData.name.trim()) {
      newErrors.name = "Character name is required"
    } else if (newCharacterData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    setIsSubmitting(true)
    try {
      // Trigger particle effect at the mouse position
      if ('clientX' in event.nativeEvent) {
          const e = event.nativeEvent as MouseEvent;
          fireVoidParticles(e.clientX, e.clientY);
      }

      await createCharacter({
        ...newCharacterData,
        originWorld: newCharacterData.originWorld || undefined,
      })
      track('character_created', { name: newCharacterData.name, system: newCharacterData.system })
      setNewCharacterData({ name: '', ancestry: '', class: '', websiteLink: '', originWorld: '', system: 'PF' })
      setIsOpen(false)
      toast.success('Character created successfully!')
    } catch (err: any) {
      const msg = err?.message || 'Failed to create character'
      setErrors({ name: msg })
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setErrors({})
      setNewCharacterData({ name: '', ancestry: '', class: '', websiteLink: '', originWorld: '', system: 'PF' })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>New Character</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a New Character</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateCharacter} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">System</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={newCharacterData.system}
              onChange={(e) => setNewCharacterData({ ...newCharacterData, system: e.target.value as 'PF' | 'DnD' })}
            >
              <option value="PF">Pathfinder</option>
              <option value="DnD">Dungeons & Dragons</option>
            </select>
          </div>
          <div className="space-y-1">
            <Input
              value={newCharacterData.name}
              onChange={(e) => {
                setNewCharacterData({ ...newCharacterData, name: e.target.value })
                if (errors.name) setErrors({ ...errors, name: undefined })
              }}
              placeholder="Character Name"
              className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.name && <p className="text-[10px] text-destructive font-medium px-1">{errors.name}</p>}
          </div>
          <Input
            value={newCharacterData.ancestry}
            onChange={(e) => setNewCharacterData({ ...newCharacterData, ancestry: e.target.value })}
            placeholder="Ancestry"
          />
          <Input
            value={newCharacterData.class}
            onChange={(e) => setNewCharacterData({ ...newCharacterData, class: e.target.value })}
            placeholder="Class"
          />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">Home World (Optional)</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={newCharacterData.originWorld}
              onChange={(e) => setNewCharacterData({ ...newCharacterData, originWorld: e.target.value })}
            >
              <option value="">Not specified</option>
              {sortedWorlds.map((w) => (
                <option key={w._id} value={w.name}>
                  {w.name}
                </option>
              ))}
              <option value="Other">Other</option>
            </select>
          </div>
          <Input
            value={newCharacterData.websiteLink}
            onChange={(e) => setNewCharacterData({ ...newCharacterData, websiteLink: e.target.value })}
            placeholder="Website Link (Optional)"
          />
          <DialogFooter>
            <Button type="submit" disabled={!newCharacterData.name || isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Character'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
