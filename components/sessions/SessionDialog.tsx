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
import { FormEvent, useState } from 'react'
import { Id, Doc } from '@/convex/_generated/dataModel'
import { fireVoidParticles } from '@/lib/particles'

interface SessionDialogProps {
  session?: Doc<'sessions'>
  trigger?: React.ReactNode
  hasWorld: boolean
}

export default function SessionDialog({ session, trigger, hasWorld }: SessionDialogProps) {
  const createSession = useMutation(api.sessions.createSession)
  const updateSession = useMutation(api.sessions.updateSession)
  const deleteSession = useMutation(api.sessions.deleteSession)
  const userCharacters = useQuery(api.characters.listCharacters)
  const worldName = useQuery(api.worlds.getWorldByOwner) // Fetch the current world details to display the name

  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  // const [world, setWorld] = useState('') // Removed: world is now derived
  const [level, setLevel] = useState(session?.level?.toString() || '1')
  const [maxPlayers, setMaxPlayers] = useState(session?.maxPlayers?.toString() || '4')
  const [gmCharacter, setGmCharacter] = useState<Id<'characters'> | ''>(session?.gmCharacter || '')
  const [location, setLocation] = useState(session?.location || '')
  const [isOpen, setIsOpen] = useState(false)

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      if (session) {
        const d = new Date(session.date)
        
        // Format YYYY-MM-DD in local time
        const year = d.getFullYear()
        const month = (d.getMonth() + 1).toString().padStart(2, '0')
        const day = d.getDate().toString().padStart(2, '0')
        setDate(`${year}-${month}-${day}`)

        // Format HH:mm in local time
        const hours = d.getHours().toString().padStart(2, '0')
        const minutes = d.getMinutes().toString().padStart(2, '0')
        setTime(`${hours}:${minutes}`)
        
        // setWorld(session.world) // Removed: world is now derived
        setLevel(session.level?.toString() || '')
        setMaxPlayers(session.maxPlayers.toString())
        setGmCharacter(session.gmCharacter || '')
        setLocation(session.location || '')
      } else {
        setDate('')
        setTime('')
        // setWorld('') // Removed: world is now derived
        setLevel('1')
        setMaxPlayers('4')
        setGmCharacter('')
        setLocation('')
      }
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!date || !time || !level || !maxPlayers) return // Removed world validation

    const sessionDateTime = new Date(`${date}T${time}`).getTime()
    if (isNaN(sessionDateTime)) return

    let levelValue: number | undefined = parseInt(level)
    if (isNaN(levelValue) || levelValue === 0) {
      levelValue = undefined
    }
    const maxPlayersNum = parseInt(maxPlayers)
    if (isNaN(maxPlayersNum)) return

    const gmCharId = gmCharacter === '' ? undefined : gmCharacter as Id<'characters'>
    const locationVal = location === '' ? undefined : location

    if (session) {
      await updateSession({
        sessionId: session._id,
        date: sessionDateTime,
        world: session.world, // Use existing session world
        level: levelValue,
        maxPlayers: maxPlayersNum,
        characters: session.characters,
        gmCharacter: gmCharId,
        location: locationVal,
      })
    } else {
      // Trigger particle effect at the mouse position for new sessions
      if ('clientX' in event.nativeEvent) {
          const e = event.nativeEvent as MouseEvent;
          fireVoidParticles(e.clientX, e.clientY);
      }

      await createSession({
        date: sessionDateTime,
        // world, // Removed: world is now derived
        level: levelValue,
        maxPlayers: maxPlayersNum,
        characters: [],
        gmCharacter: gmCharId,
        location: locationVal,
      })
    }
    setIsOpen(false)
  }

  async function handleDelete() {
    if (session) {
      await deleteSession({ sessionId: session._id })
      setIsOpen(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" disabled={!hasWorld}>
            {session ? 'Edit' : 'New Session'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{session ? 'Edit Session' : 'Create a New Session'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">World</label>
            <Input
              value={worldName?.name || 'Loading World...'} // Display world name
              disabled // World name is not editable here
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-2">
                <label className="text-sm font-medium">Level</label>
                <Input
                type="number"
                max="20"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                />
            </div>
            <div className="flex-1 flex flex-col gap-2">
                <label className="text-sm font-medium">Max Players</label>
                <Input
                type="number"
                min="1"
                max="20"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
                required
                />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Award GM XP to: (only visible to you)</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={gmCharacter}
              onChange={(e) => setGmCharacter(e.target.value as Id<'characters'> | '')}
            >
              <option value="">-- No GM Character --</option>
              {userCharacters?.map((char) => (
                <option key={char._id} value={char._id}>
                  {char.name} (Lvl {char.lvl})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Location (Google Maps Link)</label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="https://goo.gl/maps/..."
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">When can people arrive at the location? Session starts 30 min after.</label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row justify-between items-center sm:gap-2 pt-4">
            {session && (
              <Button type="button" variant="destructive" onClick={handleDelete} className="w-full sm:w-auto mt-2 sm:mt-0">
                Delete
              </Button>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={!date || !time || !maxPlayers}>
                {session ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
