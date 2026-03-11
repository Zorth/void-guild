'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Book } from 'lucide-react'
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
import AdminCharacterList from './admin-character-list'

export default function Characters() {
  const characters = useQuery(api.characters.listCharacters)
  const updateCharacter = useMutation(api.characters.updateCharacter)
  const deleteCharacter = useMutation(api.characters.deleteCharacter)

  const [selectedCharacter, setSelectedCharacter] = useState<Doc<'characters'> | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [editedCharacterData, setEditedCharacterData] = useState({ ancestry: '', class: '', websiteLink: '' })

  const [showCreateWorldDialog, setShowCreateWorldDialog] = useState(false)
  const [newWorldName, setNewWorldName] = useState('')
  const [showRenameWorldDialog, setShowRenameWorldDialog] = useState(false)
  const [renameWorldName, setRenameWorldName] = useState('')

  const world = useQuery(api.worlds.getWorldByOwner)
  const createWorld = useMutation(api.worlds.createWorld)
  const renameWorld = useMutation(api.worlds.renameWorld)

  const isGM = useQuery(api.sessions.isGameMasterQuery)

  async function handleCreateWorld(event: FormEvent) {
    event.preventDefault()
    await createWorld({ name: newWorldName })
    setNewWorldName('')
    setShowCreateWorldDialog(false)
  }

  async function handleRenameWorld(event: FormEvent) {
    event.preventDefault()
    if (!world) return
    await renameWorld({ worldId: world._id, newName: renameWorldName })
    setRenameWorldName('')
    setShowRenameWorldDialog(false)
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
      websiteLink: character.websiteLink ?? '',
    })
    setIsDetailsDialogOpen(true)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Your Characters</CardTitle>
            <AdminCharacterList />
          </CardHeader>
          <CardContent>
            {characters === undefined ? (
              <p>Loading...</p>
            ) : !characters || characters.length === 0 ? (
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
                    <div className="flex items-center gap-2"> {/* Changed to flex-row for icon and level/XP block */}
                        {/* Book Icon */}
                        <a 
                            href={`https://void.tarragon.be/Player-Characters/${character.name.replace(/\s+/g, '-')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()} // Prevent dialog from opening
                            className="text-muted-foreground hover:text-blue-500" // Added styling for the icon
                        >
                            <Book size={16} /> {/* Replaced Button with Book icon */}
                        </a>
                        <div className="flex flex-col items-end"> {/* Vertical alignment for Level and XP */}
                            <span className="text-sm font-semibold">
                                Lvl {character.lvl}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                                {character.xp} XP
                            </span>
                        </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <CreateCharacter />
          </CardContent>
        </Card>

        {/* World Management */}
        {isGM && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Your World</CardTitle>
            </CardHeader>
            <CardContent>
              {world === undefined ? (
                <p>Loading...</p>
              ) : world === null ? (
                <>
                  <p>You don&apos;t have a world yet.</p>
                  <Button className="mt-4" onClick={() => setShowCreateWorldDialog(true)}>
                    Create World
                  </Button>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-lg font-medium">{world.name}</p>
                  <Button variant="outline" onClick={() => {
                    setRenameWorldName(world.name)
                    setShowRenameWorldDialog(true)
                  }}>
                    Rename
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
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
      {/* Create World Dialog */}
      {isGM && (
        <Dialog open={showCreateWorldDialog} onOpenChange={setShowCreateWorldDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New World</DialogTitle>
              <DialogDescription>Enter a name for your new world.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateWorld} className="flex flex-col gap-4">
              <Input
                value={newWorldName}
                onChange={(e) => setNewWorldName(e.target.value)}
                placeholder="World Name"
                required
              />
              <DialogFooter>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Rename World Dialog */}
      {isGM && (
        <Dialog open={showRenameWorldDialog} onOpenChange={setShowRenameWorldDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename World</DialogTitle>
              <DialogDescription>Enter a new name for your world.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleRenameWorld} className="flex flex-col gap-4">
              <Input
                value={renameWorldName}
                onChange={(e) => setRenameWorldName(e.target.value)}
                placeholder="New World Name"
                required
              />
              <DialogFooter>
                <Button type="submit">Rename</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
