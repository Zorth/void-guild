'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { FormEvent, useState } from 'react'
import { Doc } from '../convex/_generated/dataModel'
import Sessions from './sessions'
import CreateCharacter from './create-character'

export default function Characters() {
  const characters = useQuery(api.characters.listCharacters)
  const updateCharacter = useMutation(api.characters.updateCharacter)
  const deleteCharacter = useMutation(api.characters.deleteCharacter)

  const [selectedCharacter, setSelectedCharacter] = useState<Doc<'characters'> | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [editedCharacterData, setEditedCharacterData] = useState({ ancestry: '', class: '', websiteLink: '' })

  async function handleUpdateCharacter(event: FormEvent) {
    event.preventDefault()
    if (!selectedCharacter) return
    await updateCharacter({
      characterId: selectedCharacter._id,
      ...editedCharacterData,
    })
    setIsDetailsDialogOpen(false)
  }

  async function handleDeleteCharacter() {
    if (!selectedCharacter) return
    await deleteCharacter({ characterId: selectedCharacter._id })
    setIsDetailsDialogOpen(false)
  }

  function openDetailsDialog(character: Doc<'characters'>) {
    setSelectedCharacter(character)
    setEditedCharacterData({
      ancestry: character.ancestry ?? '',
      class: character.class ?? '',
      websiteLink: character.websiteLink ?? '',
    })
    setIsDetailsDialogOpen(true)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Your Characters</CardTitle>
          </CardHeader>
          <CardContent>
            {characters === undefined ? (
              <p>Loading...</p>
            ) : characters.length === 0 ? (
              <p>You have no characters yet.</p>
            ) : (
              <ul className="space-y-2">
                {characters.map((character) => (
                  <li
                    key={character._id}
                    className="flex justify-between items-center cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors"
                    onClick={() => openDetailsDialog(character)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">
                          {character.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                          {character.ancestry} {character.class}
                      </span>
                      {character.websiteLink && (
                        <a 
                            href={character.websiteLink} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[10px] text-blue-500 hover:underline"
                            onClick={(e) => e.stopPropagation()} // Prevent dialog from opening when clicking the link
                        >
                            {character.websiteLink}
                        </a>
                      )}
                    </div>
                    <span className="text-sm font-semibold">
                      Lvl {character.lvl}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <CreateCharacter />
          </CardContent>
        </Card>
      </div>

      <Sessions />

      {selectedCharacter && (
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedCharacter.name}</DialogTitle>
              <DialogDescription>
                Lvl {selectedCharacter.lvl} - {selectedCharacter.xp} XP
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateCharacter} className="flex flex-col gap-4">
              <Input
                value={editedCharacterData.ancestry}
                onChange={(e) => setEditedCharacterData({ ...editedCharacterData, ancestry: e.target.value })}
                placeholder="Ancestry"
              />
              <Input
                value={editedCharacterData.class}
                onChange={(e) => setEditedCharacterData({ ...editedCharacterData, class: e.target.value })}
                placeholder="Class"
              />
              <Input
                value={editedCharacterData.websiteLink}
                onChange={(e) => setEditedCharacterData({ ...editedCharacterData, websiteLink: e.target.value })}
                placeholder="Website Link"
              />
              <DialogFooter className="mt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete {selectedCharacter.name}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteCharacter}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button type="submit">Update</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
