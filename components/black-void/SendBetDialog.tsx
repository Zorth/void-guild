'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Coins, Dices, User, Users, Swords, AlertCircle, Loader2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SendBetDialogProps {
  isOpen: boolean
  onClose: () => void
  senderCharacterId: Id<'characters'>
  senderName?: string
  characterWealth?: {
    cp: number
    sp: number
    gp: number
    pp: number
    totalInGold: number
  } | null
  availableOpponents: Array<{
    _id: Id<'characters'>
    name: string
    lvl: number
    class: string
    ancestry: string
  }>
}

const WAGER_PRESETS = [10, 50, 100, 250, 500, 1000]
const DEATHROLL_PRESETS = [100, 1000, 10000, 100000, 1000000]

export default function SendBetDialog({
  isOpen,
  onClose,
  senderCharacterId,
  senderName = 'Active Character',
  characterWealth,
  availableOpponents,
}: SendBetDialogProps) {
  const [targetType, setTargetType] = useState<'open' | 'direct'>('open')
  const [selectedTargetId, setSelectedTargetId] = useState<string>('')
  const [wagerAmount, setWagerAmount] = useState<string>('50')
  const [deathrollValue, setDeathrollValue] = useState<string>('1000')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const sendBetInvitation = useMutation(api.blackVoidBets.sendBetInvitation)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const wager = parseFloat(wagerAmount)
    if (isNaN(wager) || wager <= 0) {
      toast.error('Please enter a valid wager amount (at least 1 GP).')
      return
    }

    const deathroll = parseInt(deathrollValue, 10)
    if (isNaN(deathroll) || deathroll < 2) {
      toast.error('Starting Deathroll value must be at least 2.')
      return
    }

    if (deathroll > 1000000) {
      toast.error('Starting Deathroll value cannot exceed 1,000,000.')
      return
    }

    if (targetType === 'direct' && !selectedTargetId) {
      toast.error('Please select an opponent character to challenge.')
      return
    }

    setIsSubmitting(true)
    try {
      await sendBetInvitation({
        senderCharacterId,
        targetCharacterId: targetType === 'direct' ? (selectedTargetId as Id<'characters'>) : undefined,
        wagerAmount: wager,
        deathrollValue: deathroll,
        message: message.trim() || undefined,
      })

      toast.success(
        targetType === 'direct'
          ? 'Betting invitation sent to opponent!'
          : 'Open betting challenge posted to The Black Void!'
      )
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send betting invitation.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-card border-rose-500/30 text-foreground">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <Dices className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-rose-300">
                  Send Betting Invitation
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Challenge an adventurer or post an open Deathroll wager from <strong className="text-purple-300">{senderName}</strong>.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* 1. Challenge Target Type */}
          <div className="space-y-2">
            <label className="text-xs font-semibold">Opponent Target</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTargetType('open')
                  setSelectedTargetId('')
                }}
                className={cn(
                  'p-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer',
                  targetType === 'open'
                    ? 'border-rose-500 bg-rose-950/40 text-rose-200 shadow-sm'
                    : 'border-border/40 bg-muted/20 text-muted-foreground hover:border-border/80'
                )}
              >
                <Users className="h-4 w-4 text-rose-400" />
                <span>Open Challenge</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('direct')}
                className={cn(
                  'p-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer',
                  targetType === 'direct'
                    ? 'border-rose-500 bg-rose-950/40 text-rose-200 shadow-sm'
                    : 'border-border/40 bg-muted/20 text-muted-foreground hover:border-border/80'
                )}
              >
                <Swords className="h-4 w-4 text-rose-400" />
                <span>Direct Invitation</span>
              </button>
            </div>

            {targetType === 'direct' && (
              <div className="pt-1.5 space-y-1">
                <select
                  value={selectedTargetId}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                  className="w-full h-9 rounded-md border border-rose-500/30 bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-rose-400 text-foreground"
                >
                  <option value="">-- Choose an Opponent Character --</option>
                  {availableOpponents.map((opp) => (
                    <option key={opp._id} value={opp._id}>
                      {opp.name} (Lvl {opp.lvl} {opp.class || 'Adventurer'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. Wager Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <Coins className="h-3.5 w-3.5 text-amber-400" />
                Wager Amount (GP)
              </label>
              <span className="text-[11px] text-amber-400 font-mono font-semibold">
                {parseFloat(wagerAmount) > 0 ? `${parseFloat(wagerAmount).toLocaleString()} GP` : '0 GP'}
              </span>
            </div>

            <div className="relative">
              <Input
                type="number"
                min="1"
                step="1"
                value={wagerAmount}
                onChange={(e) => setWagerAmount(e.target.value)}
                placeholder="e.g. 50"
                className="pl-8 bg-background/80 border-border/60 focus-visible:ring-rose-500 font-mono text-sm"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400">
                GP
              </span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {WAGER_PRESETS.map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setWagerAmount(String(val))}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer',
                    wagerAmount === String(val)
                      ? 'border-amber-400/60 bg-amber-500/20 text-amber-300 font-bold'
                      : 'border-border/30 bg-muted/20 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {val} GP
                </button>
              ))}
            </div>
          </div>

          {/* 3. Starting Deathroll Value */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <Dices className="h-3.5 w-3.5 text-rose-400" />
                Starting Deathroll Value (Max Roll)
              </label>
              <span className="text-[11px] text-rose-300 font-mono font-semibold">
                1 - {parseInt(deathrollValue, 10) > 0 ? parseInt(deathrollValue, 10).toLocaleString() : '1,000'}
              </span>
            </div>

            <div className="relative">
              <Input
                type="number"
                min="2"
                step="1"
                value={deathrollValue}
                onChange={(e) => setDeathrollValue(e.target.value)}
                placeholder="e.g. 1000"
                className="pl-8 bg-background/80 border-border/60 focus-visible:ring-rose-500 font-mono text-sm"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-400">
                1-
              </span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {DEATHROLL_PRESETS.map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setDeathrollValue(String(val))}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer',
                    deathrollValue === String(val)
                      ? 'border-rose-400/60 bg-rose-500/20 text-rose-300 font-bold'
                      : 'border-border/30 bg-muted/20 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {val.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Optional Note */}
          <div className="space-y-1">
            <label className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              Challenge Message (Optional)
            </label>
            <Input
              type="text"
              maxLength={100}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Ready to test your luck in the Void?"
              className="bg-background/80 border-border/60 text-xs"
            />
          </div>

          {/* Insufficient Funds Warning */}
          {(() => {
            const wager = parseFloat(wagerAmount)
            const hasFunds = characterWealth?.totalInGold !== undefined
            const insufficientFunds = hasFunds && !isNaN(wager) && wager > 0 && wager > characterWealth!.totalInGold
            if (!insufficientFunds) return null
            return (
              <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-[11px] text-amber-200 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Insufficient Funds:</strong> Your character has{' '}
                  <strong className="text-amber-300 font-mono">{characterWealth!.totalInGold.toLocaleString()} GP</strong>{' '}
                  but the wager is{' '}
                  <strong className="text-amber-300 font-mono">{wager.toLocaleString()} GP</strong>.
                  Ensure your character has enough gold before the bet settles.
                </span>
              </div>
            )
          })()}

          {/* Rule Note */}
          <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/20 text-[11px] text-muted-foreground flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <span>
              <strong>Rule Notice:</strong> Max 1 sent invitation at a time. Upon accepting, the opponent rolls between 0 and {deathrollValue || '1,000'}. Players alternate rolling 0 to the previous roll with a <strong>24-hour deadline</strong> per turn. Rolling a <strong>0</strong> or missing the 24h window loses the bet!
            </span>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold gap-1.5 text-xs shadow-md shadow-rose-900/30"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Swords className="h-3.5 w-3.5" />
                  Send Betting Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
