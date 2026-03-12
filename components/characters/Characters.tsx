'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Book, CircleHelp } from 'lucide-react'
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
import { Doc } from '@/convex/_generated/dataModel'
import Sessions from '@/components/sessions/Sessions'
import CreateCharacter from './CreateCharacter'
import AdminCharacterList from './AdminCharacterList'
import { Skeleton } from '@/components/ui/skeleton'
import { getLevelBadgeStyle, CharacterRankIcon, getXPBarStyles } from '@/lib/utils'
import { track } from '@vercel/analytics'
import { useMemo } from 'react'

export default function Characters({ filters }: { filters?: { pf: boolean, dnd: boolean } }) {
  const charactersRaw = useQuery(api.characters.listCharacters)
  const updateCharacter = useMutation(api.characters.updateCharacter)
  const deleteCharacter = useMutation(api.characters.deleteCharacter)

  const characters = useMemo(() => {
    if (!charactersRaw) return charactersRaw;
    if (!filters) return charactersRaw;
    return charactersRaw.filter(char => {
        if (char.system === 'PF' && !filters.pf) return false;
        if (char.system === 'DnD' && !filters.dnd) return false;
        return true;
    });
  }, [charactersRaw, filters]);

  const [selectedCharacter, setSelectedCharacter] = useState<Doc<'characters'> | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [editedCharacterData, setEditedCharacterData] = useState({ ancestry: '', class: '', websiteLink: '', system: 'PF' as 'PF' | 'DnD' })

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
    track('world_created', { name: newWorldName })
    setNewWorldName('')
    setShowCreateWorldDialog(false)
  }

  async function handleRenameWorld(event: FormEvent) {
    event.preventDefault()
    if (!world) return
    await renameWorld({ worldId: world._id, newName: renameWorldName })
    track('world_renamed', { oldName: world.name, newName: renameWorldName })
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
    track('character_updated', { name: selectedCharacter.name })
    setIsDetailsDialogOpen(false)
  }

  async function handleDeleteCharacter() {
    if (!selectedCharacter) return
    const name = selectedCharacter.name
    await deleteCharacter({ characterId: selectedCharacter._id })
    track('character_deleted', { name })
    setIsDetailsDialogOpen(false)
  }

  function openDetailsDialog(character: Doc<'characters'>) {
    setSelectedCharacter(character)
    setEditedCharacterData({
      ancestry: character.ancestry ?? '',
      class: character.class ?? '',
      websiteLink: character.websiteLink ?? '',
      system: (character.system as 'PF' | 'DnD') ?? 'PF',
    })
    track('character_details_expanded', { name: character.name })
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
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : !characters || characters.length === 0 ? (
              <p>You have no characters yet.</p>
            ) : (
              <ul className="space-y-2">
                {characters.map((character) => (
                  <li
                    key={character._id}
                    className="flex flex-col cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors"
                    onClick={() => openDetailsDialog(character)}
                  >
                    <div className="flex justify-between items-center w-full">
                        <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-medium">
                                {character.name}
                            </span>
                            {/* Book Icon moved here */}
                            <a 
                                href={`https://void.tarragon.be/Player-Characters/${character.name.replace(/\s+/g, '-')}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()} // Prevent dialog from opening
                                className="text-muted-foreground hover:text-blue-500" // Added styling for the icon
                            >
                                <Book size={16} />
                            </a>
                        </div>
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
                        <div className="flex items-center gap-2"> 
                            <div className="flex flex-col items-end"> {/* Vertical alignment for Level and XP */}
                                <div className="flex items-center gap-1">
                                    <CharacterRankIcon rank={character.rank} />
                                    {character.system && (
                                        <img 
                                            src={character.system === 'PF' ? '/PFVoid.svg' : '/DnDVoid.svg'} 
                                            alt={character.system} 
                                            className="h-4 w-4 mx-0.5"
                                        />
                                    )}
                                    <span 
                                        className="inline-flex align-middle justify-center w-14 rounded-full px-2 py-0.5 text-[10px] font-bold"
                                        style={getLevelBadgeStyle(character.lvl)}
                                    >
                                        Lvl {character.lvl}
                                    </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                    {character.xp} XP
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* XP Bar */}
                    <div className="w-full bg-muted/30 h-1 rounded-full mt-2 overflow-hidden">
                        <div 
                            className="h-full transition-all duration-500 ease-out" 
                            style={getXPBarStyles(character.lvl, character.xp)}
                        />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-2 mt-4">
                <CreateCharacter />
                <a 
                    href="https://void.tarragon.be/_META/_getting_started" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => track('help_getting_started_clicked')}
                >
                    <Button variant="outline" size="icon" className="h-9 w-9">
                        <CircleHelp className="h-5 w-5" />
                    </Button>
                </a>
            </div>
          </CardContent>
        </Card>

        {/* World Management */}
        {(isGM || isGM === undefined) && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Your World</CardTitle>
            </CardHeader>
            <CardContent>
              {world === undefined || isGM === undefined ? (
                <div className="flex items-center justify-between">
                  <Skeleton className="h-7 w-32" />
                  <Skeleton className="h-9 w-20" />
                </div>
              ) : world === null ? (                <>
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

      <Sessions filters={filters} />


      {selectedCharacter && (
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedCharacter.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <CharacterRankIcon rank={selectedCharacter.rank} />
                {selectedCharacter.system && (
                    <img 
                        src={selectedCharacter.system === 'PF' ? '/PFVoid.svg' : '/DnDVoid.svg'} 
                        alt={selectedCharacter.system} 
                        className="h-4 w-4"
                    />
                )}
                <span 
                  className="inline-flex align-middle justify-center w-14 rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={getLevelBadgeStyle(selectedCharacter.lvl)}
                >
                  Lvl {selectedCharacter.lvl}
                </span>
                <span>{selectedCharacter.xp} XP</span>
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateCharacter} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">System</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editedCharacterData.system}
                  onChange={(e) => setEditedCharacterData({ ...editedCharacterData, system: e.target.value as 'PF' | 'DnD' })}
                >
                  <option value="PF">Pathfinder</option>
                  <option value="DnD">Dungeons & Dragons</option>
                </select>
              </div>
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
