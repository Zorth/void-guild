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
import { FormEvent, useMemo, useState } from 'react'
import { Doc } from '@/convex/_generated/dataModel'
import { Search, Shield, User } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminCharacterList() {
  // All hooks must be called unconditionally at the top level
  const isAdmin = useQuery(api.sessions.isAdminQuery)
  const allCharacters = useQuery(api.characters.listAllCharacters, !!isAdmin ? undefined : "skip")
  const adminUpdateCharacter = useMutation(api.characters.adminUpdateCharacter)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCharacter, setSelectedCharacter] = useState<Doc<'characters'> | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editData, setEditData] = useState({
    name: '',
    title: '',
    lvl: 1,
    xp: 0,
    ancestry: '',
    class: '',
    websiteLink: '',
    rank: 'none' as 'none' | 'journeyman' | 'guildmaster',
    system: 'PF' as 'PF' | 'DnD',
  })

  // Simple fuzzy scoring function
  const filteredCharacters = useMemo(() => {
    if (!allCharacters) return []
    const q = searchQuery.trim().toLowerCase()
    if (!q) return allCharacters

    const searchTokens = q.split(/\s+/).filter(Boolean)

    return allCharacters.filter((char: any) => {
      const name = (char.name || '').toLowerCase()
      const title = (char.title || '').toLowerCase()
      const ancestry = (char.ancestry || '').toLowerCase()
      const cls = (char.class || '').toLowerCase()
      const ownerName = (char.ownerName || '').toLowerCase()
      const ownerUsername = (char.ownerUsername || '').toLowerCase()
      const ownerEmail = (char.ownerEmail || '').toLowerCase()

      const searchableText = `${name} ${title} ${ancestry} ${cls} ${ownerName} ${ownerUsername} ${ownerEmail}`

      // Check fuzzy match: every token must match somewhere in the text, or sub-sequence matching
      return searchTokens.every((token) => {
        if (searchableText.includes(token)) return true
        
        // Subsequence matching for fuzzy typo tolerance
        let tokenIdx = 0
        for (let i = 0; i < searchableText.length && tokenIdx < token.length; i++) {
          if (searchableText[i] === token[tokenIdx]) {
            tokenIdx++
          }
        }
        return tokenIdx === token.length
      })
    })
  }, [allCharacters, searchQuery])

  if (isAdmin === undefined) {
    return <Skeleton className="h-9 w-40" />
  }

  if (!isAdmin) {
    return null
  }

  function openEditDialog(character: Doc<'characters'>) {
    setSelectedCharacter(character)
    setEditData({
      name: character.name,
      title: character.title ?? '',
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
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>All Characters</DialogTitle>
          <DialogDescription>
            Admin view: Edit any character&apos;s details, including level and XP.
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative pt-2 pb-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search characters or account names..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="overflow-auto flex-grow py-2">
          <div className="space-y-3">
            {allCharacters === undefined ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : filteredCharacters.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No characters found matching &quot;{searchQuery}&quot;
              </div>
            ) : filteredCharacters.map((char: any) => (
              <Card key={char._id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openEditDialog(char)}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                        <p className="font-bold">{char.name}</p>
                        {char.rank === 'guildmaster' && <span className="text-xs text-amber-500 font-bold uppercase tracking-wider">GM</span>}
                        {char.rank === 'journeyman' && <span className="text-xs text-purple-500 font-bold uppercase tracking-wider">JRN</span>}
                    </div>
                    {char.title && (
                      <p className="text-xs text-amber-400/90 italic font-medium">{char.title}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{char.ancestry} {char.class}</p>
                    {char.ownerName && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground/80">
                        <User className="h-3 w-3 inline text-muted-foreground" />
                        <span className="font-medium text-foreground/80">{char.ownerName}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right whitespace-nowrap">
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
                  <label className="text-right text-sm">Title</label>
                  <Input
                    className="col-span-3"
                    placeholder="Title (Admin set)"
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
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
