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
import { track } from '@vercel/analytics'

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
  const [system, setSystem] = useState<'PF' | 'DnD'>(session?.system || 'PF')
  const [planning, setPlanning] = useState(session?.planning || false)
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setErrors({})
    }
    if (open) {
      if (session) {
        if (session.date) {
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
        } else {
            setDate('')
            setTime('')
        }
        
        // setWorld(session.world) // Removed: world is now derived
        setLevel(session.level?.toString() || '')
        setMaxPlayers(session.maxPlayers.toString())
        setGmCharacter(session.gmCharacter || '')
        setLocation(session.location || '')
        setSystem(session.system || 'PF')
        setPlanning(session.planning || false)
      } else {
        setDate('')
        setTime('')
        // setWorld('') // Removed: world is now derived
        setLevel('1')
        setMaxPlayers('4')
        setGmCharacter('')
        setLocation('')
        setSystem('PF')
        setPlanning(false)
      }
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    
    // Validation
    const newErrors: Record<string, string> = {}
    if (!planning) {
        if (!date) newErrors.date = "Date is required"
        if (!time) newErrors.time = "Time is required"
    }
    
    const maxPlayersNum = parseInt(maxPlayers)
    if (isNaN(maxPlayersNum) || maxPlayersNum < 1) {
      newErrors.maxPlayers = "At least 1 player required"
    } else if (maxPlayersNum > 20) {
      newErrors.maxPlayers = "Max 20 players"
    }

    const levelNum = parseInt(level)
    if (level && levelNum !== 0 && (isNaN(levelNum) || levelNum < 1 || levelNum > 20)) {
      newErrors.level = "Level must be 1-20"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    let sessionDateTime: number | undefined = undefined;
    if (date && time) {
        sessionDateTime = new Date(`${date}T${time}`).getTime()
        if (isNaN(sessionDateTime)) sessionDateTime = undefined
    }

    let levelValue: number | undefined = parseInt(level)
    if (isNaN(levelValue) || levelValue === 0) {
      levelValue = undefined
    }

    const gmCharId = gmCharacter === '' ? undefined : gmCharacter as Id<'characters'>
    const locationVal = location === '' ? undefined : location

    setIsSubmitting(true)
    try {
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
          system: system,
          planning: planning,
        })
        track('session_updated', { worldName: worldName?.name, system, planning });
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
          system: system,
          planning: planning,
        })
        track('session_created', { worldName: worldName?.name, system, planning });
      }
      setIsOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (session) {
      await deleteSession({ sessionId: session._id })
      track('session_deleted', { worldName: worldName?.name });
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{session ? 'Edit Session' : 'Create a New Session'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center space-x-2 bg-muted/30 p-3 rounded-lg border border-primary/20">
            <input 
              type="checkbox" 
              id="planning-toggle" 
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              checked={planning}
              onChange={(e) => setPlanning(e.target.checked)}
            />
            <div className="grid gap-1.5 leading-none">
                <label
                    htmlFor="planning-toggle"
                    className="text-sm font-bold leading-none cursor-pointer"
                >
                    Planning Phase
                </label>
                <p className="text-[10px] text-muted-foreground">
                    Gauge interest before setting a firm date. Signups will be disabled.
                </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">System</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={system}
              onChange={(e) => setSystem(e.target.value as 'PF' | 'DnD')}
            >
              <option value="PF">Pathfinder</option>
              <option value="DnD">Dungeons & Dragons</option>
            </select>
          </div>
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
                <p className="text-[10px] text-muted-foreground -mt-1 italic">
                  Level can be 0 or empty to set TBD
                </p>
                <Input
                type="number"
                min="0"
                max="20"
                placeholder="TBD"
                value={level}
                onChange={(e) => {
                  setLevel(e.target.value)
                  if (errors.level) setErrors({ ...errors, level: '' })
                }}
                className={errors.level ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.level && <p className="text-[10px] text-destructive font-medium">{errors.level}</p>}
            </div>
            <div className="flex-1 flex flex-col gap-2">
                <label className="text-sm font-medium">Max Players</label>
                <Input
                type="number"
                min="1"
                max="20"
                value={maxPlayers}
                onChange={(e) => {
                  setMaxPlayers(e.target.value)
                  if (errors.maxPlayers) setErrors({ ...errors, maxPlayers: '' })
                }}
                required
                className={errors.maxPlayers ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.maxPlayers && <p className="text-[10px] text-destructive font-medium">{errors.maxPlayers}</p>}
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
              {userCharacters?.filter(c => c.system === system).map((char) => (
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
            <label className="text-sm font-medium">Date {planning && "(Optional)"}</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                if (errors.date) setErrors({ ...errors, date: '' })
              }}
              required={!planning}
              className={errors.date ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.date && <p className="text-[10px] text-destructive font-medium">{errors.date}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Arrival Time {planning && "(Optional)"}</label>
            <p className="text-[10px] text-muted-foreground -mt-1 italic">
                Session starts 30 minutes after.
            </p>
            <Input
              type="time"
              value={time}
              onChange={(e) => {
                setTime(e.target.value)
                if (errors.time) setErrors({ ...errors, time: '' })
              }}
              required={!planning}
              className={errors.time ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.time && <p className="text-[10px] text-destructive font-medium">{errors.time}</p>}
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row justify-between items-center sm:gap-2 pt-4">
            {session && (
              <Button type="button" variant="destructive" onClick={handleDelete} className="w-full sm:w-auto mt-2 sm:mt-0">
                Delete
              </Button>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="flex-1" disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={(!planning && (!date || !time)) || !maxPlayers || isSubmitting}>
                {isSubmitting ? (session ? 'Updating...' : 'Creating...') : (session ? 'Update' : 'Create')}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
