'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { FormEvent, useState } from 'react'
import { Doc } from '@/convex/_generated/dataModel'
import { Shield } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminCharacterList() {
  // All hooks must be called unconditionally at the top level
  const isAdmin = useQuery(api.sessions.isAdminQuery)
  const allCharacters = useQuery(api.characters.listAllCharacters, isAdmin === true ? undefined : "skip")
  const adminUpdateCharacter = useMutation(api.characters.adminUpdateCharacter)

  const [selectedCharacter, setSelectedCharacter] = useState<Doc<'characters'> | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editData, setEditData] = useState({
    name: '',
    lvl: 1,
    xp: 0,
    ancestry: '',
    class: '',
    websiteLink: '',
    rank: 'none' as 'none' | 'journeyman' | 'guildmaster',
    system: 'PF' as 'PF' | 'DnD',
  })

  // Handle loading states and non-admin access after all hooks are called
  if (isAdmin === undefined || (isAdmin && allCharacters === undefined)) {
    return <Skeleton className="h-9 w-40" />
  }

  if (!isAdmin) {
    return null
  }



  function openEditDialog(character: Doc<'characters'>) {
    setSelectedCharacter(character)
    setEditData({
      name: character.name,
      lvl: character.lvl,
      xp: character.xp,
      ancestry: character.ancestry ?? '',
      class: character.class ?? '',
      websiteLink: character.websiteLink ?? '',
      rank: (character.rank as any) ?? 'none',
      system: (character.system as 'PF' | 'DnD') ?? 'PF',
    })
    setIsEditDialogOpen(true)
  }

  async function handleAdminUpdate(event: FormEvent) {
    event.preventDefault()
    if (!selectedCharacter) return

    await adminUpdateCharacter({
      characterId: selectedCharacter._id,
      ...editData,
    })
    setIsEditDialogOpen(false)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Shield className="h-4 w-4" /> All Characters (Admin)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>All Characters</DialogTitle>
          <DialogDescription>
            Admin view: Edit any character&apos;s details, including level and XP.
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-auto flex-grow py-4">
          <div className="space-y-4">
            {allCharacters === undefined ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : allCharacters.map((char) => (
              <Card key={char._id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openEditDialog(char)}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                        <p className="font-bold">{char.name}</p>
                        {char.rank === 'guildmaster' && <span className="text-xs text-amber-500 font-bold uppercase tracking-wider">GM</span>}
                        {char.rank === 'journeyman' && <span className="text-xs text-blue-500 font-bold uppercase tracking-wider">JRN</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{char.ancestry} {char.class}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">Lvl {char.lvl}</p>
                    <p className="text-[10px] text-muted-foreground">{char.xp} XP</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {selectedCharacter && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Character: {selectedCharacter.name}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdminUpdate} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">Name</label>
                  <Input
                    className="col-span-3"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">System</label>
                  <select
                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={editData.system}
                    onChange={(e) => setEditData({ ...editData, system: e.target.value as any })}
                  >
                    <option value="PF">Pathfinder</option>
                    <option value="DnD">Dungeons & Dragons</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">Rank</label>
                  <select
                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={editData.rank}
                    onChange={(e) => setEditData({ ...editData, rank: e.target.value as any })}
                  >
                    <option value="none">None</option>
                    <option value="journeyman">Journeyman</option>
                    <option value="guildmaster">Guildmaster</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">Level</label>
                  <Input
                    className="col-span-3"
                    type="number"
                    value={editData.lvl}
                    onChange={(e) => setEditData({ ...editData, lvl: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">XP</label>
                  <Input
                    className="col-span-3"
                    type="number"
                    value={editData.xp}
                    onChange={(e) => setEditData({ ...editData, xp: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">Ancestry</label>
                  <Input
                    className="col-span-3"
                    value={editData.ancestry}
                    onChange={(e) => setEditData({ ...editData, ancestry: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">Class</label>
                  <Input
                    className="col-span-3"
                    value={editData.class}
                    onChange={(e) => setEditData({ ...editData, class: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">Website</label>
                  <Input
                    className="col-span-3"
                    value={editData.websiteLink}
                    onChange={(e) => setEditData({ ...editData, websiteLink: e.target.value })}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Save Changes</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}
