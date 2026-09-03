'use client'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { Loader2, LogOut, UserCheck } from 'lucide-react'

interface SessionJoinFormProps {
  sessionLocked: boolean
  sessionPlanning?: boolean
  isFull: boolean
  availableCharacters: Doc<'characters'>[]
  userCharactersCount: number
  selectedCharacterId: Id<'characters'> | ''
  hasUserCharacterInSession: boolean
  userCharactersInSession?: Doc<'characters'>[]
  onCharacterSelect: (id: Id<'characters'> | '') => void
  onJoin: (e: React.MouseEvent) => void
  onLeave?: (characterId: Id<'characters'>) => void
  isJoining?: boolean
  leavingCharacterId?: string | null
}

export default function SessionJoinForm({
  sessionLocked,
  sessionPlanning,
  isFull,
  availableCharacters,
  userCharactersCount,
  selectedCharacterId,
  hasUserCharacterInSession,
  userCharactersInSession = [],
  onCharacterSelect,
  onJoin,
  onLeave,
  isJoining,
  leavingCharacterId
}: SessionJoinFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {hasUserCharacterInSession ? (
            <>
              <UserCheck className="h-5 w-5 text-emerald-500" />
              Joined Session
            </>
          ) : (
            'Join Session'
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sessionLocked ? (
          <div className="text-sm text-muted-foreground italic text-center p-4 bg-muted/30 rounded-md">
            This session has ended.
          </div>
        ) : hasUserCharacterInSession ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md space-y-1">
              <p className="font-medium text-emerald-700 dark:text-emerald-400">You are in this session!</p>
              {userCharactersInSession.map((char) => (
                <p key={char._id} className="text-xs text-foreground font-semibold">
                  • {char.name} (Lvl {char.lvl})
                </p>
              ))}
            </div>
            {userCharactersInSession.map((char) => (
              <Button
                key={char._id}
                variant="destructive"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => onLeave?.(char._id)}
                disabled={leavingCharacterId === char._id}
              >
                {leavingCharacterId === char._id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Leaving...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4" />
                    Leave Session
                  </>
                )}
              </Button>
            ))}
          </div>
        ) : sessionPlanning ? (
          <div className="text-sm text-purple-600 dark:text-purple-400 italic text-center p-4 bg-purple-500/10 rounded-md border border-purple-200 dark:border-purple-800">
            This session is currently in the <b>planning phase</b> and cannot be joined yet.
            <p className="mt-2 not-italic text-xs text-muted-foreground font-medium">
              Express interest above to let the GM know you want to play!
            </p>
          </div>
        ) : isFull ? (
          <div className="text-sm text-destructive italic text-center p-4 bg-destructive/5 rounded-md">
            This session is currently full.
          </div>
        ) : availableCharacters.length === 0 ? (
          <div className="text-sm text-muted-foreground italic text-center p-4 bg-muted/10 rounded-md flex flex-col items-center gap-2">
            {userCharactersCount === 0 ? (
              <>
                <p>You don&apos;t have any characters yet.</p>
                <a href="/" className="text-primary hover:underline font-semibold not-italic">
                  Go to Home to create one!
                </a>
              </>
            ) : (
              <p>All your characters are already in this session.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Select Character</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedCharacterId}
                onChange={(e) => onCharacterSelect(e.target.value as Id<'characters'> | '')}
                disabled={isJoining}
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
              disabled={!selectedCharacterId || isJoining}
              onClick={onJoin}
            >
              {isJoining ? 'Joining...' : 'Join Session'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

