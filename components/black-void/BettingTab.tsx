'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dices,
  Coins,
  Swords,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Trophy,
  Skull,
  Loader2,
  Plus,
  Flame,
  Hourglass,
  Timer,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface BettingTabProps {
  characterId: Id<'characters'> | null
  selectedChar: any
  characterWealth?: {
    cp: number
    sp: number
    gp: number
    pp: number
    totalInGold: number
  } | null
  onOpenSendBet: () => void
}

function formatRemainingTime(timeLeftMs: number): string {
  if (timeLeftMs <= 0) return 'Expired'
  const totalSeconds = Math.floor(timeLeftMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m left`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s left`
  }
  return `${seconds}s left`
}

export default function BettingTab({
  characterId,
  selectedChar,
  characterWealth,
  onOpenSendBet,
}: BettingTabProps) {
  const [rollingBetId, setRollingBetId] = useState<string | null>(null)
  const [actionLoadingBetId, setActionLoadingBetId] = useState<string | null>(null)
  const [now, setNow] = useState<number>(Date.now())

  // Keep countdown timer ticking every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const bettingData = useQuery(api.blackVoidBets.getBettingData, {
    characterId: characterId || undefined,
  })

  const cancelBetInvitation = useMutation(api.blackVoidBets.cancelBetInvitation)
  const declineBetInvitation = useMutation(api.blackVoidBets.declineBetInvitation)
  const acceptBetInvitation = useMutation(api.blackVoidBets.acceptBetInvitation)
  const rollDeathroll = useMutation(api.blackVoidBets.rollDeathroll)
  const claimBetTimeout = useMutation(api.blackVoidBets.claimBetTimeout)

  if (!characterId || !selectedChar) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] p-8 text-center rounded-2xl border border-dashed border-rose-500/30 bg-rose-950/10">
        <Dices className="h-12 w-12 text-rose-400 mb-3 opacity-60 animate-pulse" />
        <h3 className="text-lg font-bold text-foreground mb-1">No Character Selected</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Select an active character above to participate in Deathroll betting duels and high-stakes wagers.
        </p>
      </div>
    )
  }

  const {
    sentInvitation,
    receivedInvitations = [],
    openChallenges = [],
    activeMatches = [],
    recentBets = [],
  } = bettingData || {}

  const handleCancelInvitation = async (betId: Id<'blackVoidBets'>) => {
    setActionLoadingBetId(betId)
    try {
      await cancelBetInvitation({ betId, characterId })
      toast.success('Betting invitation cancelled.')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to cancel invitation.')
    } finally {
      setActionLoadingBetId(null)
    }
  }

  const handleDeclineInvitation = async (betId: Id<'blackVoidBets'>) => {
    setActionLoadingBetId(betId)
    try {
      await declineBetInvitation({ betId, characterId })
      toast.info('Betting invitation declined.')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to decline invitation.')
    } finally {
      setActionLoadingBetId(null)
    }
  }

  const handleAcceptInvitation = async (betId: Id<'blackVoidBets'>) => {
    setActionLoadingBetId(betId)
    try {
      const result = await acceptBetInvitation({ betId, characterId })
      if (result.isGameOver) {
        if (result.winnerId === characterId) {
          toast.success(`VICTORY! You won the bet!`)
        } else {
          toast.error(`DEFEAT! You rolled a 0 on accept and lost the bet!`)
        }
      } else {
        toast.success(
          `Bet Accepted! You rolled ${result.roll.toLocaleString()} (0-${result.outOf.toLocaleString()}). Challenger has 24h to roll.`
        )
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to accept invitation.')
    } finally {
      setActionLoadingBetId(null)
    }
  }

  const handleRoll = async (betId: Id<'blackVoidBets'>) => {
    setRollingBetId(betId)
    try {
      const result = await rollDeathroll({ betId, characterId })
      if (result.isGameOver) {
        if (result.isTimedOut) {
          toast.error(result.message || '24-hour turn window expired. Opponent wins.')
        } else if (result.winnerId === characterId) {
          toast.success(`VICTORY! Opponent rolled a 0! You won the Deathroll!`)
        } else {
          toast.error(`DEFEAT! You rolled a 0 and lost the Deathroll!`)
        }
      } else if (result.roll !== undefined && result.outOf !== undefined) {
        toast.info(
          `You rolled ${result.roll.toLocaleString()} (out of 0-${result.outOf.toLocaleString()})! Sent back to opponent with 24 hours.`
        )
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to roll dice.')
    } finally {
      setRollingBetId(null)
    }
  }

  const handleClaimTimeout = async (betId: Id<'blackVoidBets'>) => {
    setActionLoadingBetId(betId)
    try {
      await claimBetTimeout({ betId, characterId })
      toast.success('Timeout claimed! Victory awarded because opponent missed the 24-hour window.')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to claim timeout.')
    } finally {
      setActionLoadingBetId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="rounded-xl border border-rose-500/20 bg-gradient-to-r from-rose-950/40 via-card to-rose-950/20 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <Dices className="h-5 w-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
              Deathroll Betting Arena
            </h2>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            Accepting starts the bet immediately by rolling between 0 and the max value. Players then alternate rolling between 0 and the previous result with a <strong className="text-rose-400">24-hour deadline</strong>. Rolling a <strong className="text-rose-400">0</strong> or missing the 24h window forfeits the bet!
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {sentInvitation ? (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 font-semibold shadow-inner">
              <Clock className="h-4 w-4 text-rose-400 animate-spin" />
              <span>1 Invitation Active</span>
            </div>
          ) : (
            <Button
              onClick={onOpenSendBet}
              className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs h-9 px-4 gap-2 shadow-md shadow-rose-900/30"
            >
              <Plus className="h-4 w-4" />
              Start New Bet
            </Button>
          )}
        </div>
      </div>

      {/* 1. ACTIVE BETS SECTION (With 24hr Deadlines) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Swords className="h-4 w-4 text-amber-400" />
            Active Bets ({activeMatches.length})
          </h3>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Timer className="h-3.5 w-3.5 text-amber-400" />
            24-hour turn windows
          </span>
        </div>

        {activeMatches.length === 0 ? (
          <div className="text-center py-7 px-4 rounded-xl border border-dashed border-border/40 bg-muted/5 text-xs text-muted-foreground">
            No active Deathroll duels currently in progress. Start a new bet or accept a challenge below!
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeMatches.map((match) => {
              const isMyTurn = match.currentTurnCharacterId === characterId
              const isChallenger = match.senderCharacterId === characterId
              const opponentName = isChallenger ? match.acceptedByName : match.senderName
              const currentMax = match.currentRollMax !== undefined ? match.currentRollMax : match.deathrollValue
              const rollsList = match.rolls || []

              const deadline = match.turnDeadline || (match.updatedAt || match.createdAt) + 24 * 60 * 60 * 1000
              const timeLeftMs = Math.max(0, deadline - now)
              const isExpired = timeLeftMs <= 0

              return (
                <Card
                  key={match._id}
                  className={cn(
                    'border transition-all duration-200 bg-card/95 overflow-hidden',
                    isMyTurn && !isExpired
                      ? 'border-amber-500/60 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/30'
                      : 'border-border/60'
                  )}
                >
                  <div className="p-4 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                          <Dices className="h-5 w-5" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">
                              {selectedChar.name} vs {opponentName}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            Wager: <span className="text-amber-400 font-bold">{match.wagerAmount} GP</span> • Starting: 0-{match.deathrollValue.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Turn & Timer Status Badge */}
                      <div className="flex flex-col items-end gap-1">
                        {isExpired ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Time Expired!
                          </span>
                        ) : isMyTurn ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> Your Turn
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted/40 text-muted-foreground border border-border/40 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Opponent&apos;s Turn
                          </span>
                        )}

                        <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                          <Hourglass className="h-3 w-3 text-amber-400/80" />
                          {formatRemainingTime(timeLeftMs)}
                        </span>
                      </div>
                    </div>

                    {/* Current Roll Range Banner */}
                    <div className="p-3 rounded-xl bg-background/80 border border-border/40 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                          Current Roll Range
                        </span>
                        <span className="text-xl font-black font-mono text-rose-400 tracking-tight">
                          0 &mdash; {currentMax.toLocaleString()}
                        </span>
                      </div>

                      {/* Action: Roll Dice or Claim Timeout */}
                      {isExpired ? (
                        <Button
                          onClick={() => handleClaimTimeout(match._id)}
                          disabled={actionLoadingBetId === match._id}
                          className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs h-9 px-3 gap-1.5 shadow-md shadow-rose-900/30"
                        >
                          {actionLoadingBetId === match._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trophy className="h-3.5 w-3.5" />
                          )}
                          Claim Timeout Win
                        </Button>
                      ) : isMyTurn ? (
                        <Button
                          onClick={() => handleRoll(match._id)}
                          disabled={rollingBetId === match._id}
                          className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-md shadow-amber-900/30"
                        >
                          {rollingBetId === match._id ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Rolling...
                            </>
                          ) : (
                            <>
                              <Dices className="h-4 w-4" />
                              Roll (0 - {currentMax.toLocaleString()})
                            </>
                          )}
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">
                          Awaiting roll...
                        </span>
                      )}
                    </div>

                    {/* Roll History Ladder */}
                    {rollsList.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Roll History ({rollsList.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 rounded-lg bg-muted/10 border border-border/30">
                          {rollsList.map((r: any, idx: number) => {
                            const isMe = r.characterId === characterId
                            const isZero = r.roll === 0
                            return (
                              <div
                                key={idx}
                                className={cn(
                                  'px-2 py-0.5 rounded text-[10px] font-mono border flex items-center gap-1',
                                  isZero
                                    ? 'border-rose-500/60 bg-rose-500/20 text-rose-300 font-bold'
                                    : isMe
                                      ? 'border-purple-500/40 bg-purple-500/10 text-purple-200'
                                      : 'border-border/40 bg-muted/20 text-muted-foreground'
                                )}
                              >
                                <span>{isMe ? 'You' : opponentName}:</span>
                                <strong className={isZero ? 'text-rose-400' : 'text-foreground'}>
                                  {r.roll.toLocaleString()}
                                </strong>
                                <span className="text-[9px] opacity-70">
                                  (0-{r.outOf.toLocaleString()})
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* 2. OPEN INVITATIONS SECTION (Sent, Direct Received & Open Challenges) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-rose-400" />
            Invitations & Challenges
          </h3>
          <span className="text-[11px] text-muted-foreground">
            Direct challenges and open bets
          </span>
        </div>

        {/* 2A. ACTIVE SENT INVITATION (Max 1) */}
        {sentInvitation && (
          <Card className="border-rose-500/30 bg-card/90 shadow-md">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
                  {sentInvitation.targetName ? (
                    <Swords className="h-5 w-5" />
                  ) : (
                    <Users className="h-5 w-5" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground">
                      {sentInvitation.targetName ? (
                        <>
                          Direct challenge to{' '}
                          <span className="text-purple-300 font-semibold">
                            {sentInvitation.targetName}
                          </span>
                        </>
                      ) : (
                        <span className="text-rose-300 font-semibold">
                          Open Challenge to The Void
                        </span>
                      )}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                      {sentInvitation.wagerAmount.toLocaleString()} GP
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono">
                      0 - {sentInvitation.deathrollValue.toLocaleString()}
                    </span>
                  </div>

                  {sentInvitation.message && (
                    <p className="text-xs text-muted-foreground italic">
                      &ldquo;{sentInvitation.message}&rdquo;
                    </p>
                  )}

                  <p className="text-[11px] text-muted-foreground">
                    Sent {new Date(sentInvitation.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • You have 1 active sent invitation limit.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCancelInvitation(sentInvitation._id)}
                disabled={actionLoadingBetId === sentInvitation._id}
                className="border-border/60 hover:border-rose-500/50 hover:bg-rose-950/20 text-xs h-8 text-muted-foreground hover:text-rose-300 shrink-0"
              >
                {actionLoadingBetId === sentInvitation._id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 mr-1 text-rose-400" />
                )}
                Cancel Invitation
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 2B. DIRECT INVITATIONS RECEIVED */}
        {receivedInvitations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1">
              <Swords className="h-3.5 w-3.5" />
              Direct Challenges Received ({receivedInvitations.length})
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {receivedInvitations.map((inv) => (
                <Card key={inv._id} className="border-rose-500/30 bg-card/80">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-foreground">
                            {inv.senderName}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            (Lvl {inv.senderLevel} {inv.senderClass || 'Adventurer'})
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          Wager: <span className="text-amber-400 font-bold">{inv.wagerAmount} GP</span> • Starting: 0-{inv.deathrollValue.toLocaleString()}
                        </p>
                      </div>

                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        Direct
                      </span>
                    </div>

                    {inv.message && (
                      <p className="text-xs text-muted-foreground italic bg-muted/20 p-2 rounded border border-border/30">
                        &ldquo;{inv.message}&rdquo;
                      </p>
                    )}

                    {characterWealth && inv.wagerAmount > characterWealth.totalInGold && (
                      <div className="p-2 rounded bg-amber-500/15 border border-amber-500/40 text-[10px] text-amber-200 flex items-start gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>Low Funds:</strong> Wager is <strong className="font-mono">{inv.wagerAmount} GP</strong> but you have <strong className="font-mono">{characterWealth.totalInGold.toLocaleString()} GP</strong>.
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeclineInvitation(inv._id)}
                        disabled={actionLoadingBetId === inv._id}
                        className="text-xs h-8 text-muted-foreground hover:text-foreground"
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAcceptInvitation(inv._id)}
                        disabled={actionLoadingBetId === inv._id}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs h-8 gap-1.5"
                      >
                        {actionLoadingBetId === inv._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Swords className="h-3.5 w-3.5" />
                        )}
                        Accept & Roll (0-{inv.deathrollValue.toLocaleString()})
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 2C. OPEN CHALLENGES BOARD */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-purple-400" />
              Open Void Challenges ({openChallenges.length})
            </h4>
          </div>

          {openChallenges.length === 0 ? (
            <div className="text-center py-6 px-4 rounded-xl border border-dashed border-border/40 bg-muted/5 text-xs text-muted-foreground">
              No open challenges posted right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {openChallenges.map((chall) => (
                <Card key={chall._id} className="border-border/60 bg-card/80 hover:border-purple-500/30 transition-all">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-foreground">
                            {chall.senderName}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            (Lvl {chall.senderLevel} {chall.senderClass || 'Adventurer'})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-mono text-amber-400 font-bold">
                            {chall.wagerAmount} GP
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            • 0-{chall.deathrollValue.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        Open
                      </span>
                    </div>

                    {chall.message && (
                      <p className="text-xs text-muted-foreground italic line-clamp-2">
                        &ldquo;{chall.message}&rdquo;
                      </p>
                    )}

                    {characterWealth && chall.wagerAmount > characterWealth.totalInGold && (
                      <div className="p-1.5 rounded bg-amber-500/15 border border-amber-500/40 text-[10px] text-amber-200 flex items-start gap-1.5">
                        <AlertCircle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>Low Funds:</strong> Wager is <strong className="font-mono">{chall.wagerAmount} GP</strong>, you have <strong className="font-mono">{characterWealth.totalInGold.toLocaleString()} GP</strong>.
                        </span>
                      </div>
                    )}

                    <Button
                      size="sm"
                      onClick={() => handleAcceptInvitation(chall._id)}
                      disabled={actionLoadingBetId === chall._id}
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs h-8 gap-1.5"
                    >
                      {actionLoadingBetId === chall._id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Swords className="h-3.5 w-3.5" />
                      )}
                      Accept & Roll (0-{chall.deathrollValue.toLocaleString()})
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. HISTORY SECTION */}
      {recentBets.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            History ({recentBets.length})
          </h3>

          <div className="space-y-2">
            {recentBets.map((bet) => {
              const isWinner = bet.winnerCharacterId === characterId
              const isCompleted = bet.status === 'completed'

              return (
                <div
                  key={bet._id}
                  className="flex items-center justify-between p-3 rounded-lg bg-card/60 border border-border/40 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {isCompleted ? (
                      isWinner ? (
                        <span className="p-1.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <Trophy className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span className="p-1.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          <Skull className="h-3.5 w-3.5" />
                        </span>
                      )
                    ) : (
                      <span className="p-1.5 rounded bg-muted/40 text-muted-foreground border border-border/30">
                        <XCircle className="h-3.5 w-3.5" />
                      </span>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {bet.senderName} vs {bet.acceptedByName || bet.targetName || 'Void Challenger'}
                        </span>
                        {isCompleted && (
                          <span
                            className={cn(
                              'text-[10px] px-1.5 py-0.2 rounded font-bold uppercase',
                              isWinner
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            )}
                          >
                            {isWinner ? 'Won' : 'Lost'}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {isCompleted ? (
                          <>
                            Winner: <strong className="text-amber-300">{bet.winnerName}</strong>
                            {bet.lossReason === 'timeout' ? ' (by 24h Timeout)' : ' (Rolled a 0)'} • {bet.rolls?.length || 0} rolls
                          </>
                        ) : (
                          <span className="capitalize">{bet.status}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={cn(
                        'font-mono font-bold',
                        isCompleted
                          ? isWinner
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                          : 'text-amber-400'
                      )}
                    >
                      {isCompleted ? (isWinner ? `+${bet.wagerAmount}` : `-${bet.wagerAmount}`) : bet.wagerAmount} GP
                    </span>
                    <span className="block text-[10px] text-muted-foreground font-mono">
                      0-{bet.deathrollValue.toLocaleString()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
