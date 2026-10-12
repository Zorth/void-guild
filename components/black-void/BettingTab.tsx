'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dices,
  Swords,
  Users,
  Clock,
  XCircle,
  AlertCircle,
  Trophy,
  Skull,
  Loader2,
  Plus,
  Flame,
  Timer,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import DeathrollMatchCard, { DecoratedBet } from './DeathrollMatchCard'
import DeathrollResultOverlay, { RollReveal } from './DeathrollResultOverlay'
import { ROLL_REVEAL_MS, bustChance } from '@/convex/deathroll'

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

  const [reveal, setReveal] = useState<RollReveal | null>(null)
  // Freeze the page during a roll reveal so nothing behind the popup spoils the result
  const [heldData, setHeldData] = useState<typeof bettingData | null>(null)
  const [pendingReveal, setPendingReveal] = useState<RollReveal | null>(null)
  useEffect(() => {
    if (!pendingReveal) return
    const t = setTimeout(() => {
      setReveal(pendingReveal)
      setPendingReveal(null)
      setHeldData(null)
    }, ROLL_REVEAL_MS - 50)
    return () => clearTimeout(t)
  }, [pendingReveal])

  const [freshAcceptIds, setFreshAcceptIds] = useState<Set<string>>(new Set())

  // Detect opponent accepts and finished bets when new data arrives
  const seenBetsRef = useRef<{
    data: typeof bettingData
    characterId: string | null
    states: Map<string, string>
  } | null>(null)

  useEffect(() => {
    if (!bettingData) return

    const bets = [
      ...bettingData.activeMatches,
      ...bettingData.recentBets.filter((b) => b.status === 'completed'),
    ]
    const states = new Map(bets.map((b) => [b._id as string, `${b.status}:${b.rolls?.length ?? 0}`]))

    const prevSeen = seenBetsRef.current
    if (!prevSeen || prevSeen.characterId !== characterId) {
      setFreshAcceptIds(new Set())
    } else {
      const newFresh = new Set<string>()
      for (const b of bets) {
        if (prevSeen.states.get(b._id) === states.get(b._id)) continue
        const rolls = b.rolls || []
        const last = rolls[rolls.length - 1]
        const isTimeout = b.status === 'completed' && b.lossReason === 'timeout'
        if (!prevSeen.states.has(b._id) && rolls.length === 1 && last && last.characterId !== characterId) {
          newFresh.add(b._id)
        }
        if (b.status !== 'completed') continue
        if (!last || (last.characterId === characterId && !isTimeout)) continue
        const finishReveal: RollReveal = {
          betId: b._id,
          rollerName: last.characterId === b.senderCharacterId ? b.senderName : (b.acceptedByName ?? ''),
          rollerIsMe: last.characterId === characterId,
          outOf: last.outOf,
          roll: last.roll,
          wagerAmount: b.wagerAmount,
          isTimeout,
        }
        const prev = prevSeen.data
        if (isTimeout || !prev) {
          setReveal(finishReveal)
          continue
        }
        const wasActive = prev.activeMatches.some((m) => m._id === b._id)
        setHeldData({
          ...prev,
          activeMatches: wasActive
            ? prev.activeMatches.map((m) => (m._id === b._id ? b : m))
            : [...prev.activeMatches, b],
        })
        setPendingReveal({ ...finishReveal, skipSpin: true })
      }
      if (newFresh.size > 0) {
        setFreshAcceptIds((ids) => {
          const next = new Set(ids)
          for (const id of newFresh) next.add(id)
          return next
        })
      }
    }
    seenBetsRef.current = { data: bettingData, characterId, states }
  }, [bettingData, characterId])

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
    record = { wins: 0, losses: 0, net: 0 },
  } = heldData ?? bettingData ?? {}
  const totalPlayed = record.wins + record.losses

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

  const handleAcceptInvitation = async (bet: DecoratedBet) => {
    setActionLoadingBetId(bet._id)
    setHeldData(bettingData)
    setReveal({
      betId: bet._id,
      rollerName: selectedChar.name,
      rollerIsMe: true,
      outOf: bet.deathrollValue,
      nextName: bet.senderName,
      wagerAmount: bet.wagerAmount,
    })
    try {
      const result = await acceptBetInvitation({ betId: bet._id, characterId })
      setReveal((prev) => (prev?.betId === bet._id ? { ...prev, roll: result.roll } : prev))
    } catch (err: any) {
      setReveal(null)
      setHeldData(null)
      toast.error(err?.message || 'Failed to accept invitation.')
    } finally {
      setActionLoadingBetId(null)
    }
  }

  const handleRoll = async (match: DecoratedBet) => {
    const currentMax = match.currentRollMax !== undefined ? match.currentRollMax : match.deathrollValue
    setRollingBetId(match._id)
    setHeldData(bettingData)
    setReveal({
      betId: match._id,
      rollerName: selectedChar.name,
      rollerIsMe: true,
      outOf: currentMax,
      nextName: match.senderCharacterId === characterId ? match.acceptedByName : match.senderName,
      wagerAmount: match.wagerAmount,
    })
    try {
      const result = await rollDeathroll({ betId: match._id, characterId })
      setReveal((prev) =>
        prev?.betId === match._id
          ? { ...prev, roll: result.roll, isTimeout: 'isTimedOut' in result && result.isTimedOut }
          : prev
      )
    } catch (err: any) {
      setReveal(null)
      setHeldData(null)
      toast.error(err?.message || 'Failed to roll dice.')
    } finally {
      setRollingBetId(null)
    }
  }

  const handleClaimTimeout = async (betId: Id<'blackVoidBets'>) => {
    setActionLoadingBetId(betId)
    try {
      await claimBetTimeout({ betId, characterId })
    } catch (err: any) {
      toast.error(err?.message || 'Failed to claim timeout.')
    } finally {
      setActionLoadingBetId(null)
    }
  }

  return (
    <div className="space-y-6">
      {reveal && (
        <DeathrollResultOverlay
          key={`${reveal.betId}:${reveal.outOf}:${reveal.rollerIsMe}`}
          reveal={reveal}
          finishedBet={bettingData?.recentBets.find((b) => b._id === reveal.betId && b.status === 'completed')}
          characterId={characterId}
          onClose={() => {
            setReveal(null)
            setHeldData(null)
          }}
        />
      )}

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
          <ol className="pt-2 text-xs text-muted-foreground space-y-0.5 list-decimal list-inside sm:whitespace-nowrap marker:text-rose-400/70">
            <li>The player who accepts rolls first, from 0 up to the starting number.</li>
            <li>Then you take turns, each rolling from 0 up to the last number rolled.</li>
            <li>
              Roll a <strong className="text-rose-400">0</strong> or take longer than{' '}
              <strong className="text-rose-400 whitespace-nowrap">24 hours</strong> on your turn and you lose.
            </li>
          </ol>
          <div className="flex flex-wrap items-center gap-1 pt-1 text-[10px] font-mono text-muted-foreground">
            <span className="mr-0.5">Example:</span>
            {[
              { who: 'You', max: 1000, roll: 412 },
              { who: 'Them', max: 412, roll: 87 },
              { who: 'You', max: 87, roll: 3 },
              { who: 'Them', max: 3, roll: 0 },
            ].map((step, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground/50">→</span>}
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded border whitespace-nowrap',
                    step.roll === 0 ? 'border-rose-500/50 bg-rose-500/15' : 'border-border/40 bg-muted/20'
                  )}
                >
                  {step.who} 0-<span className="text-amber-300">{step.max}</span>:{' '}
                  <strong className={step.roll === 0 ? 'text-rose-400' : 'text-amber-300'}>
                    {step.roll === 0 ? '0 💀' : step.roll}
                  </strong>
                </span>
              </span>
            ))}
          </div>
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
            {activeMatches.map((match) => (
              <DeathrollMatchCard
                key={match._id}
                match={match}
                characterId={characterId}
                selectedCharName={selectedChar.name}
                now={now}
                rolling={rollingBetId === match._id}
                actionLoading={actionLoadingBetId === match._id}
                onRoll={() => handleRoll(match)}
                onClaimTimeout={() => handleClaimTimeout(match._id)}
                spinFirstRoll={freshAcceptIds.has(match._id)}
              />
            ))}
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
                          {' • '}<span className="text-rose-300">{bustChance(inv.deathrollValue)}% bust on accept</span>
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
                        onClick={() => handleAcceptInvitation(inv)}
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
                          <span className="text-[10px] text-rose-300 font-mono">
                            • {bustChance(chall.deathrollValue)}% bust
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
                      onClick={() => handleAcceptInvitation(chall)}
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
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              History ({recentBets.length})
            </h3>
            {totalPlayed > 0 && (
              <span className="text-[11px] text-muted-foreground font-mono">
                Win rate{' '}
                <strong className="text-amber-300">{Math.round((record.wins / totalPlayed) * 100)}%</strong>
                {' • '}
                <span className="text-emerald-400">{record.wins}W</span>
                {' / '}
                <span className="text-rose-400">{record.losses}L</span>
              </span>
            )}
          </div>

          {totalPlayed > 0 && (
            <div className="p-3 rounded-lg bg-card/60 border border-border/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground uppercase tracking-wider font-bold">Net profit</span>
                <span
                  className={cn(
                    'font-mono font-bold text-base',
                    record.net > 0 ? 'text-emerald-400' : record.net < 0 ? 'text-rose-400' : 'text-muted-foreground'
                  )}
                >
                  {record.net > 0 ? '+' : ''}
                  {record.net.toLocaleString()} GP
                </span>
              </div>
              <div className="flex h-1.5 rounded-full overflow-hidden bg-rose-500/40">
                <div className="bg-emerald-500" style={{ width: `${(record.wins / totalPlayed) * 100}%` }} />
              </div>
            </div>
          )}

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
                            {' • '}
                            {bet.lossReason === 'timeout'
                              ? `${bet.loserName} ran out of time`
                              : `${bet.loserName} rolled a 0`}
                            {' • '}{bet.rolls?.length || 0} rolls
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
