'use client'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Doc, Id } from '@/convex/_generated/dataModel'

interface SessionJoinFormProps {
  sessionLocked: boolean
  isFull: boolean
  availableCharacters: Doc<'characters'>[]
  userCharactersCount: number
  selectedCharacterId: Id<'characters'> | ''
  hasUserCharacterInSession: boolean
  onCharacterSelect: (id: Id<'characters'> | '') => void
  onJoin: (e: React.MouseEvent) => void
}

export default function SessionJoinForm({
  sessionLocked,
  isFull,
  availableCharacters,
  userCharactersCount,
  selectedCharacterId,
  hasUserCharacterInSession,
  onCharacterSelect,
  onJoin
}: SessionJoinFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Join Session</CardTitle>
      </CardHeader>
      <CardContent>
        {sessionLocked ? (
          <div className="text-sm text-muted-foreground italic text-center p-4 bg-muted/30 rounded-md">
              This session has ended.
          </div>
        ) : isFull ? (
          <div className="text-sm text-destructive italic text-center p-4 bg-destructive/5 rounded-md">
              This session is currently full.
          </div>
        ) : availableCharacters.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center p-4 bg-muted/10 rounded-md">
            {userCharactersCount === 0 
              ? "You don't have any characters yet. Create one on the home page!" 
              : "All your characters are already in this session."}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Select Character</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedCharacterId}
                onChange={(e) => onCharacterSelect(e.target.value as Id<'characters'> | '')}
              >
                <option value="">-- Choose a character --</option>
                {availableCharacters.map((char) => (
                  <option key={char._id} value={char._id}>
                    {char.name} (Lvl {char.lvl})
                  </option>
                ))}
              </select>
            </div>
            <Button 
              className="w-full" 
              disabled={!selectedCharacterId || hasUserCharacterInSession}
              onClick={onJoin}
            >
              Join Session
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
