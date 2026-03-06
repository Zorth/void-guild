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
  DialogTrigger,
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

export default function Characters() {
  const characters = useQuery(api.characters.listCharacters)
  const createCharacter = useMutation(api.characters.createCharacter)
  const updateCharacter = useMutation(api.characters.updateCharacter)
  const deleteCharacter = useMutation(api.characters.deleteCharacter)

  const [newCharacterData, setNewCharacterData] = useState({ name: '', ancestry: '', class: '' })
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedCharacter, setSelectedCharacter] = useState<Doc<'characters'> | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [editedCharacterData, setEditedCharacterData] = useState({ ancestry: '', class: '' })

  async function handleCreateCharacter(event: FormEvent) {
    event.preventDefault()
    if (!newCharacterData.name) return
    await createCharacter(newCharacterData)
    setNewCharacterData({ name: '', ancestry: '', class: '' })
    setIsCreateDialogOpen(false)
  }

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
                    className="flex justify-between items-center cursor-pointer hover:bg-muted/50 p-2 rounded-md"
                    onClick={() => openDetailsDialog(character)}
                  >
                    <span>{character.name}</span>
                    <span className="text-sm text-muted-foreground">
                      Lvl {character.lvl}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="mt-4">New Character</Button>
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
                  <DialogFooter>
                    <Button type="submit" disabled={!newCharacterData.name}>
                      Create Character
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

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
