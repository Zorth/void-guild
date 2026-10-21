'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { Loader2, LogOut, UserCheck, Lock, Sprout, Sparkles, ExternalLink, RefreshCw } from 'lucide-react'

interface BusyCharacterInfo {
  character: Doc<'characters'>
  sessionId: Id<'sessions'>
  worldName: string
  date?: number
}

interface OutOfLevelCharacterInfo {
  character: Doc<'characters'>
  reason: 'high' | 'low'
}

interface SessionJoinFormProps {
  sessionLocked: boolean
  sessionPlanning?: boolean
  sessionIsPrivate?: boolean
  sessionIsIntro?: boolean
  sessionSystem?: 'PF' | 'DnD'
  sessionLevel?: number
  hasCharactersOutOfLevelRange?: boolean
  isFull: boolean
  availableCharacters: Doc<'characters'>[]
  busyCharacters?: BusyCharacterInfo[]
  outOfLevelCharacters?: OutOfLevelCharacterInfo[]
  userCharactersCount: number
  matchingSystemCharactersCount?: number
  selectedCharacterId: Id<'characters'> | ''
  hasUserCharacterInSession: boolean
  userCharactersInSession?: Doc<'characters'>[]
  onCharacterSelect: (id: Id<'characters'> | '') => void
  onJoin: (e: React.MouseEvent) => void
  onJoinIntro?: (e: React.MouseEvent) => void
  onLeave?: (characterId: Id<'characters'>) => void
  onChangeCharacter?: (oldCharacterId: Id<'characters'>, newCharacterId: Id<'characters'>) => Promise<void>
  isJoining?: boolean
  leavingCharacterId?: string | null
  eligibility?: { eligible: boolean; reason?: string; isFreeTier?: boolean } | null
}

export default function SessionJoinForm({
  sessionLocked,
  sessionPlanning,
  sessionIsPrivate,
  sessionIsIntro,
  sessionSystem,
  sessionLevel,
  hasCharactersOutOfLevelRange,
  isFull,
  availableCharacters,
  busyCharacters = [],
  outOfLevelCharacters = [],
  userCharactersCount,
  matchingSystemCharactersCount,
  selectedCharacterId,
  hasUserCharacterInSession,
  userCharactersInSession = [],
  onCharacterSelect,
  onJoin,
  onJoinIntro,
  onLeave,
  onChangeCharacter,
  isJoining,
  leavingCharacterId,
  eligibility,
}: SessionJoinFormProps) {
  const { user } = useUser()
  const [isRefreshingMembership, setIsRefreshingMembership] = useState(false)
  const [changeDialogOpen, setChangeDialogOpen] = useState(false)
  const [characterToChange, setCharacterToChange] = useState<Doc<'characters'> | null>(null)
  const [targetCharacterId, setTargetCharacterId] = useState<Id<'characters'> | ''>('')
  const [isSwapping, setIsSwapping] = useState(false)

  const handleOpenChangeDialog = (char: Doc<'characters'>) => {
    setCharacterToChange(char)
    setTargetCharacterId(availableCharacters[0]?._id || '')
    setChangeDialogOpen(true)
  }

  const handleConfirmChange = async () => {
    if (!characterToChange || !targetCharacterId || !onChangeCharacter) return
    setIsSwapping(true)
    try {
      await onChangeCharacter(characterToChange._id, targetCharacterId)
      setChangeDialogOpen(false)
    } finally {
      setIsSwapping(false)
    }
  }

  return (
    <>
      <Card className={sessionIsIntro && !hasUserCharacterInSession ? "border-emerald-500/30" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {hasUserCharacterInSession ? (
                <>
                  <UserCheck className="h-5 w-5 text-emerald-500" />
                  Joined Session
                </>
              ) : sessionIsPrivate ? (
                <>
                  <Lock className="h-5 w-5 text-amber-500" />
                  Private Session
                </>
              ) : sessionIsIntro ? (
                <>
                  <Sprout className="h-5 w-5 text-emerald-400" />
                  Join Intro Session
                </>
              ) : (
                'Join Session'
              )}
            </div>
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
                <div key={char._id} className="space-y-2">
                  {onChangeCharacter && (
                    <Button
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2"
                      onClick={() => handleOpenChangeDialog(char)}
                      disabled={leavingCharacterId === char._id || isSwapping}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Change Character
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => onLeave?.(char._id)}
                    disabled={leavingCharacterId === char._id || isSwapping}
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
                </div>
              ))}
            </div>
        ) : sessionPlanning ? (
          <div className="text-sm text-purple-600 dark:text-purple-400 italic text-center p-4 bg-purple-500/10 rounded-md border border-purple-200 dark:border-purple-800">
            This session is currently in the <b>planning phase</b> and cannot be joined yet.
            <p className="mt-2 not-italic text-xs text-muted-foreground font-medium">
              Express interest above to let the GM know you want to play!
            </p>
          </div>
        ) : sessionIsPrivate ? (
          <div className="text-sm text-amber-600 dark:text-amber-400 p-4 bg-amber-500/10 rounded-md border border-amber-500/20 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 font-bold">
              <Lock className="h-4 w-4 text-amber-500" />
              Private Session (Unlisted)
            </div>
            <p className="text-xs text-muted-foreground">
              This session is private and not listed in the session list. Players and characters can only join when added manually by the session&apos;s owner.
            </p>
          </div>
        ) : isFull ? (
          <div className="text-sm text-destructive italic text-center p-4 bg-destructive/5 rounded-md">
            This session is currently full.
          </div>
        ) : eligibility && eligibility.eligible === false ? (
          <div className="text-sm p-5 bg-gradient-to-b from-amber-500/15 to-amber-500/5 rounded-lg border border-amber-500/30 space-y-3.5 text-center shadow-inner">
            <div className="flex items-center justify-center gap-2 font-bold text-amber-300 text-base">
              <Sparkles className="h-5 w-5 text-amber-400 shrink-0" />
              <span>Monthly Session Limit Reached</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed px-1">
              {eligibility.reason || 'Free accounts are limited to 1 session per calendar month. Upgrade to a Kobold Membership on Tarragon.be to play unlimited sessions each month and unlock all member perks!'}
            </p>
            <a
              href="https://tarragon.be"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wide shadow-md shadow-amber-500/20 hover:shadow-amber-500/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>Buy Kobold Membership on Tarragon.be (€10/year)</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-70 shrink-0" />
            </a>
            <div className="pt-0.5">
              <button
                type="button"
                onClick={async () => {
                  if (!user) return
                  setIsRefreshingMembership(true)
                  try {
                    await user.reload()
                  } finally {
                    setIsRefreshingMembership(false)
                  }
                }}
                disabled={isRefreshingMembership}
                className="text-[11px] text-amber-400/90 hover:text-amber-300 underline cursor-pointer disabled:opacity-50 transition-colors"
              >
                {isRefreshingMembership ? 'Refreshing membership status...' : 'Already purchased? Click to refresh'}
              </button>
            </div>
          </div>
        ) : availableCharacters.length === 0 && busyCharacters.length === 0 && outOfLevelCharacters.length === 0 ? (
          <div className="text-sm text-muted-foreground italic text-center p-4 bg-muted/10 rounded-md flex flex-col items-center gap-2">
            {sessionIsIntro ? (
              <div className="space-y-3 not-italic text-center w-full">
                <p className="text-xs text-muted-foreground">
                  {userCharactersCount === 0 
                    ? "You don't have a character yet. The Voidmaster will help you create one during the intro session!"
                    : "You can sign up directly without selecting an existing character."}
                </p>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2"
                  onClick={onJoinIntro || onJoin}
                  disabled={isJoining}
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing up...
                    </>
                  ) : (
                    <>
                      <Sprout className="h-4 w-4" />
                      Sign Up as New Player
                    </>
                  )}
                </Button>
              </div>
            ) : userCharactersCount === 0 ? (
              <>
                <p>You don&apos;t have any characters yet.</p>
                <a href="/" className="text-primary hover:underline font-semibold not-italic">
                  Create one on the home page →
                </a>
              </>
            ) : matchingSystemCharactersCount === 0 ? (
              <>
                <p>
                  You don&apos;t have any {sessionSystem === 'PF' ? 'Pathfinder' : sessionSystem === 'DnD' ? 'D&D 5e' : ''} characters eligible to join.
                </p>
                <a href="/" className="text-primary hover:underline font-semibold not-italic">
                  Create one on the home page →
                </a>
              </>
            ) : (
              <p>All your {sessionSystem === 'PF' ? 'Pathfinder' : sessionSystem === 'DnD' ? 'D&D 5e' : ''} characters are already in this session.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {eligibility?.isFreeTier && (
              <div className="text-[11px] text-muted-foreground/80 leading-tight px-1 flex items-center justify-between gap-1">
                <span>Free tier: 1 free session / month</span>
                <a
                  href="https://tarragon.be"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:underline font-medium"
                >
                  Buy Membership
                </a>
              </div>
            )}
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
                {busyCharacters.map(({ character: char, worldName }) => (
                  <option key={char._id} value={char._id} disabled>
                    {char.name} (Lvl {char.lvl}) — Signed up in {worldName}
                  </option>
                ))}
                {outOfLevelCharacters.map(({ character: char, reason }) => (
                  <option key={char._id} value={char._id} disabled>
                    {char.name} (Lvl {char.lvl}) -- level too {reason}
                  </option>
                ))}
              </select>
            </div>
            {availableCharacters.length === 0 && (
              <div className="text-xs text-muted-foreground p-3 bg-muted/10 rounded-md border border-border/40 space-y-2">
                {busyCharacters.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-amber-400 font-medium text-center">
                      Your eligible character{busyCharacters.length > 1 ? 's are' : ' is'} already signed up for another open session:
                    </p>
                    {busyCharacters.map(({ character: c, sessionId: busySessionId, worldName, date }) => (
                      <div
                        key={c._id}
                        className="bg-amber-500/10 border border-amber-500/20 rounded-md p-2 flex items-center justify-between gap-2"
                      >
                        <span className="font-semibold text-foreground truncate">{c.name} (Lvl {c.lvl})</span>
                        <a
                          href={`/sessions/${busySessionId}`}
                          className="text-amber-400 hover:underline font-medium shrink-0"
                        >
                          {worldName}
                          {date
                            ? ` (${new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`
                            : ''}{' '}
                          →
                        </a>
                      </div>
                    ))}
                    <p className="text-[11px] text-muted-foreground text-center pt-0.5">
                      A character cannot sign up for another session until their current session closes.
                    </p>
                  </div>
                )}
                {outOfLevelCharacters.length > 0 && typeof sessionLevel === 'number' && sessionLevel > 0 && (
                  <p className="text-center italic">
                    Only characters between Level {Math.max(1, sessionLevel - 4)} and Level {sessionLevel + 4} can join this Level {sessionLevel} session.
                  </p>
                )}
                <div className="text-center pt-0.5">
                  <a href="/" className="text-primary hover:underline font-semibold">
                    Create another character on the home page →
                  </a>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Button
                className="w-full"
                disabled={!selectedCharacterId || isJoining}
                onClick={onJoin}
              >
                {isJoining ? 'Joining...' : 'Join Session'}
              </Button>
              {sessionIsIntro && (
                <Button
                  variant="outline"
                  className="w-full text-xs text-muted-foreground flex items-center justify-center gap-1.5"
                  onClick={onJoinIntro || onJoin}
                  disabled={isJoining}
                >
                  <Sprout className="h-3.5 w-3.5 text-emerald-400" />
                  Or Sign Up as New Player (Intro)
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    <Dialog open={changeDialogOpen} onOpenChange={setChangeDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Change Character
          </DialogTitle>
          <DialogDescription>
            Switch out <b>{characterToChange?.name}</b> (Lvl {characterToChange?.lvl}) for another one of your characters in this session.
          </DialogDescription>
        </DialogHeader>

        {availableCharacters.length > 0 || busyCharacters.length > 0 || outOfLevelCharacters.length > 0 ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select New Character</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={targetCharacterId}
                onChange={(e) => setTargetCharacterId(e.target.value as Id<'characters'> | '')}
                disabled={isSwapping}
              >
                {availableCharacters.length === 0 && (
                  <option value="">-- No eligible character available --</option>
                )}
                {availableCharacters.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} (Lvl {c.lvl}{c.class ? ` ${c.class}` : ''})
                  </option>
                ))}
                {busyCharacters.map(({ character: c, worldName }) => (
                  <option key={c._id} value={c._id} disabled>
                    {c.name} (Lvl {c.lvl}{c.class ? ` ${c.class}` : ''}) — Signed up in {worldName}
                  </option>
                ))}
                {outOfLevelCharacters.map(({ character: c, reason }) => (
                  <option key={c._id} value={c._id} disabled>
                    {c.name} (Lvl {c.lvl}{c.class ? ` ${c.class}` : ''}) -- level too {reason}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setChangeDialogOpen(false)} disabled={isSwapping}>
                Cancel
              </Button>
              <Button onClick={handleConfirmChange} disabled={!targetCharacterId || isSwapping}>
                {isSwapping ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Switching...
                  </>
                ) : (
                  'Confirm Switch'
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              You do not have any other characters matching this session&apos;s system to switch to.
            </p>
            <div className="flex justify-between items-center pt-2">
              <a href="/" className="text-sm text-primary hover:underline font-semibold">
                Go to Home to create one →
              </a>
              <Button variant="ghost" onClick={() => setChangeDialogOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  )
}

