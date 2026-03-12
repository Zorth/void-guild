'use client'

import { useMutation } from 'convex/react'
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
import { FormEvent, useState } from 'react'
import { fireVoidParticles } from '@/lib/particles'

export default function CreateCharacter() {
  const createCharacter = useMutation(api.characters.createCharacter)
  const [newCharacterData, setNewCharacterData] = useState({ name: '', ancestry: '', class: '', websiteLink: '' })
  const [isOpen, setIsOpen] = useState(false)

  async function handleCreateCharacter(event: FormEvent) {
    event.preventDefault()
    if (!newCharacterData.name) return

    // Trigger particle effect at the mouse position
    if ('clientX' in event.nativeEvent) {
        const e = event.nativeEvent as MouseEvent;
        fireVoidParticles(e.clientX, e.clientY);
    }

    await createCharacter(newCharacterData)
    setNewCharacterData({ name: '', ancestry: '', class: '', websiteLink: '' })
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>New Character</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a New Character</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateCharacter} className="flex flex-col gap-4">
          <Input
            value={newCharacterData.name}
            onChange={(e) => setNewCharacterData({ ...newCharacterData, name: e.target.value })}
            placeholder="Character Name"
          />
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
          <Input
            value={newCharacterData.websiteLink}
            onChange={(e) => setNewCharacterData({ ...newCharacterData, websiteLink: e.target.value })}
            placeholder="Website Link (Optional)"
          />
          <DialogFooter>
            <Button type="submit" disabled={!newCharacterData.name}>
              Create Character
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
