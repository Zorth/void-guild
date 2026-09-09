'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Coins,
  CheckCircle2,
  PackageCheck,
  Receipt,
  Hammer,
  AlertCircle,
  Sparkles,
  Crown,
  Scroll,
  Edit2,
  Trash2,
  CheckCheck,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  Loader2,
  ListTodo,
  Trophy,
  Skull,
  Dices,
  Save,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import ServiceListingDialog from '@/components/black-void/ServiceListingDialog'
import { useState, useMemo, useEffect } from 'react'

interface CharacterSheetLogProps {
  characterId: Id<'characters'> | null
}

function parseGpAmount(val: number | string | undefined | null): number {
  if (val === undefined || val === null) return 0
  if (typeof val === 'number') return val
  const clean = String(val).replace(/,/g, '')
  let totalGp = 0
  let matched = false
  const regex = /(\d+(?:\.\d+)?)\s*(pp|gp|sp|cp|platinum|gold|silver|copper)?/gi
  let match
  while ((match = regex.exec(clean)) !== null) {
    matched = true
    const num = parseFloat(match[1])
    const unit = (match[2] || 'GP').toUpperCase()
    if (unit === 'PP' || unit === 'PLATINUM') totalGp += num * 10
    else if (unit === 'GP' || unit === 'GOLD') totalGp += num
    else if (unit === 'SP' || unit === 'SILVER') totalGp += num / 10
    else if (unit === 'CP' || unit === 'COPPER') totalGp += num / 100
  }
  if (!matched) {
    const fallback = parseFloat(clean)
    if (!isNaN(fallback)) return fallback
  }
  return Math.round(totalGp * 100) / 100
}

function formatGpAmount(amount: number): string {
  if (amount % 1 === 0) {
    return `${amount.toLocaleString()} GP`
  }
  return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GP`
}

export default function CharacterSheetLog({ characterId }: CharacterSheetLogProps) {
  const [editingService, setEditingService] = useState<any | null>(null)
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  // Manual currency states
  const [ppVal, setPpVal] = useState<string>('0')
  const [gpVal, setGpVal] = useState<string>('0')
  const [spVal, setSpVal] = useState<string>('0')
  const [cpVal, setCpVal] = useState<string>('0')
  const [isSavingCurrency, setIsSavingCurrency] = useState(false)

  const transactions = useQuery(api.blackVoid.getCharacterTransactions, characterId ? { characterId } : 'skip')
  const toggleSellerClaimed = useMutation(api.blackVoid.toggleSellerClaimed)
  const toggleBuyerClaimed = useMutation(api.blackVoid.toggleBuyerClaimed)
  const toggleQuestClaimed = useMutation(api.quests.toggleQuestReimbursementClaimed)
  const togglePaymentClaimed = useMutation(api.quests.toggleQuestPaymentClaimed)
  const toggleSessionCutClaimed = useMutation(api.sessions.toggleGuildmasterCutClaimed)
  const toggleBetWinnerClaimed = useMutation(api.blackVoidBets.toggleBetWinnerClaimed)
  const toggleBetLoserClaimed = useMutation(api.blackVoidBets.toggleBetLoserClaimed)
  const markAllClaimed = useMutation(api.blackVoid.markAllCharacterTransactionsClaimed)
  const deleteServiceListing = useMutation(api.blackVoid.deleteServiceListing)
  const updateCharacterCurrency = useMutation(api.blackVoid.updateCharacterCurrency)

  const {
    createdItems = [],
    wonItems = [],
    servicesOffered = [],
    sponsoredQuestReimbursements = [],
    completedQuestsToPay = [],
    guildmasterAreaGains = [],
    betsWon = [],
    betsLost = [],
    currentMoney,
    isGuildmaster = false,
  } = (transactions as any) || {}

  // Sync manual currency inputs when character changes or transactions load
  useEffect(() => {
    if (currentMoney) {
      setPpVal(String(currentMoney.pp ?? 0))
      setGpVal(String(currentMoney.gp ?? 0))
      setSpVal(String(currentMoney.sp ?? 0))
      setCpVal(String(currentMoney.cp ?? 0))
    }
  }, [currentMoney, characterId])

  // Filter pending items that need to be added to the character sheet
  const pendingSoldItems = useMemo(
    () => createdItems.filter((item: any) => item.status === 'completed' && item.winningAmount && !item.sellerClaimed),
    [createdItems]
  )

  const pendingWonItems = useMemo(
    () => wonItems.filter((item: any) => !item.buyerClaimed),
    [wonItems]
  )

  const pendingSponsoredQuests = useMemo(
    () => sponsoredQuestReimbursements.filter((quest: any) => !quest.reimbursementClaimed),
    [sponsoredQuestReimbursements]
  )

  const pendingQuestsToPay = useMemo(
    () => completedQuestsToPay.filter((quest: any) => !quest.paymentClaimed),
    [completedQuestsToPay]
  )

  const pendingGuildmasterGains = useMemo(
    () => (isGuildmaster ? guildmasterAreaGains.filter((item: any) => !item.reimbursementClaimed) : []),
    [isGuildmaster, guildmasterAreaGains]
  )

  const pendingWonBets = useMemo(
    () => betsWon.filter((bet: any) => !bet.winnerClaimed),
    [betsWon]
  )

  const pendingLostBets = useMemo(
    () => betsLost.filter((bet: any) => !bet.loserClaimed),
    [betsLost]
  )

  // Calculations for summary metrics
  const { totalPendingIncome, totalPendingExpense, netPendingGold, totalPendingCount } = useMemo(() => {
    let income = 0
    for (const item of pendingSoldItems) income += parseGpAmount(item.winningAmount)
    for (const q of pendingSponsoredQuests) income += parseGpAmount(q.sponsoredAmount)
    for (const g of pendingGuildmasterGains) income += parseGpAmount(g.guildmasterCut)
    for (const b of pendingWonBets) income += b.wagerAmount

    let expense = 0
    for (const item of pendingWonItems) expense += parseGpAmount(item.winningAmount)
    for (const q of pendingQuestsToPay) expense += parseGpAmount(q.actualToPay)
    for (const b of pendingLostBets) expense += b.wagerAmount

    const count =
      pendingSoldItems.length +
      pendingWonItems.length +
      pendingSponsoredQuests.length +
      pendingQuestsToPay.length +
      pendingGuildmasterGains.length +
      pendingWonBets.length +
      pendingLostBets.length

    return {
      totalPendingIncome: Math.round(income * 100) / 100,
      totalPendingExpense: Math.round(expense * 100) / 100,
      netPendingGold: Math.round((income - expense) * 100) / 100,
      totalPendingCount: count,
    }
  }, [pendingSoldItems, pendingWonItems, pendingSponsoredQuests, pendingQuestsToPay, pendingGuildmasterGains, pendingWonBets, pendingLostBets])

  // Manual currency calculated total
  const calculatedManualGold = useMemo(() => {
    const pp = parseFloat(ppVal) || 0
    const gp = parseFloat(gpVal) || 0
    const sp = parseFloat(spVal) || 0
    const cp = parseFloat(cpVal) || 0
    return Math.round((gp + pp * 10 + sp / 10 + cp / 100) * 100) / 100
  }, [ppVal, gpVal, spVal, cpVal])

  if (!characterId) {
    return (
      <Card className="border-purple-500/20 bg-card/50 text-center py-12">
        <CardContent className="space-y-3">
          <AlertCircle className="h-8 w-8 text-purple-400 mx-auto" />
          <p className="text-muted-foreground text-sm font-medium">
            Please select an active character above to view financial logs & character sheet checkmarks.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (transactions === undefined) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading transaction logs...</div>
  }

  const handleToggleSellerClaimed = async (listingId: Id<'blackVoidListings'>) => {
    try {
      await toggleSellerClaimed({ listingId, characterId })
      toast.success('Updated character sheet log state!')
    } catch {
      toast.error('Failed to update character sheet status')
    }
  }

  const handleToggleBuyerClaimed = async (listingId: Id<'blackVoidListings'>) => {
    try {
      await toggleBuyerClaimed({ listingId, characterId })
      toast.success('Updated character sheet log state!')
    } catch {
      toast.error('Failed to update character sheet status')
    }
  }

  const handleToggleQuestClaimed = async (questId: Id<'quests'>) => {
    try {
      await toggleQuestClaimed({ questId, characterId })
      toast.success('Updated quest reimbursement log state!')
    } catch {
      toast.error('Failed to update quest reimbursement status')
    }
  }

  const handleTogglePaymentClaimed = async (questId: Id<'quests'>) => {
    try {
      await togglePaymentClaimed({ questId, characterId })
      toast.success('Updated quest payout status!')
    } catch {
      toast.error('Failed to update quest payout status')
    }
  }

  const handleToggleGuildmasterGain = async (item: any) => {
    try {
      if (item.sessionId) {
        await toggleSessionCutClaimed({ sessionId: item.sessionId, characterId })
        toast.success('Updated regional gains status!')
      }
    } catch {
      toast.error('Failed to update regional gains status')
    }
  }

  const handleToggleBetWinnerClaimed = async (betId: Id<'blackVoidBets'>) => {
    try {
      await toggleBetWinnerClaimed({ betId, characterId })
      toast.success('Updated betting winnings log state!')
    } catch {
      toast.error('Failed to update betting winnings status')
    }
  }

  const handleToggleBetLoserClaimed = async (betId: Id<'blackVoidBets'>) => {
    try {
      await toggleBetLoserClaimed({ betId, characterId })
      toast.success('Updated betting loss log state!')
    } catch {
      toast.error('Failed to update betting loss status')
    }
  }

  const handleMarkAllClaimed = async () => {
    if (!characterId || totalPendingCount === 0 || isMarkingAll) return
    setIsMarkingAll(true)
    try {
      const res = await markAllClaimed({ characterId })
      toast.success(`Marked all ${res.count} pending item${res.count === 1 ? '' : 's'} as added to character sheet!`)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to mark all items as complete')
    } finally {
      setIsMarkingAll(false)
    }
  }

  const handleSaveCurrency = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!characterId) return

    const pp = Math.max(0, parseInt(ppVal, 10) || 0)
    const gp = Math.max(0, parseInt(gpVal, 10) || 0)
    const sp = Math.max(0, parseInt(spVal, 10) || 0)
    const cp = Math.max(0, parseInt(cpVal, 10) || 0)

    setIsSavingCurrency(true)
    try {
      const res = await updateCharacterCurrency({
        characterId,
        pp,
        gp,
        sp,
        cp,
      })
      toast.success(`Character purse updated to ${formatGpAmount(res.totalInGold)}!`)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update character currency.')
    } finally {
      setIsSavingCurrency(false)
    }
  }

  const handleAddGold = (amount: number) => {
    const current = parseInt(gpVal, 10) || 0
    setGpVal(String(Math.max(0, current + amount)))
  }

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* 0. SUMMARY & EASY LIST OF GOLD & ITEMS TO BE ADDED */}
      <Card className="border-purple-500/40 bg-gradient-to-b from-purple-950/25 to-card/90 shadow-md overflow-hidden">
        <CardHeader className="p-3.5 sm:p-5 border-b border-border/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-purple-200 truncate">
                <ListTodo className="h-5 w-5 text-purple-400 shrink-0" />
                <span>Quick Transfer List</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Consolidated overview of pending items and gold to record.
              </CardDescription>
            </div>

            <Button
              variant={totalPendingCount > 0 ? 'default' : 'outline'}
              size="sm"
              disabled={totalPendingCount === 0 || isMarkingAll}
              onClick={handleMarkAllClaimed}
              className={cn(
                'w-full sm:w-auto gap-2 font-semibold shrink-0 transition-all cursor-pointer text-xs h-8 sm:h-9',
                totalPendingCount > 0
                  ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400/40 shadow-sm'
                  : 'border-emerald-500/40 text-emerald-300 bg-emerald-950/20 opacity-90 cursor-default'
              )}
            >
              {isMarkingAll ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating Sheet...
                </>
              ) : totalPendingCount > 0 ? (
                <>
                  <CheckCheck className="h-4 w-4" />
                  Mark All as Complete ({totalPendingCount})
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  All Items Up to Date
                </>
              )}
            </Button>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
            <div className="p-2 sm:p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 flex flex-col min-w-0">
              <span className="text-[10px] sm:text-[11px] font-medium text-emerald-400/90 flex items-center gap-1 truncate">
                <ArrowDownLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" /> Gold to Add
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-emerald-300 mt-0.5 truncate">
                +{formatGpAmount(totalPendingIncome)}
              </span>
            </div>

            <div className="p-2 sm:p-2.5 rounded-lg border border-amber-500/30 bg-amber-950/20 flex flex-col min-w-0">
              <span className="text-[10px] sm:text-[11px] font-medium text-amber-400/90 flex items-center gap-1 truncate">
                <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" /> Gold to Deduct
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-amber-300 mt-0.5 truncate">
                -{formatGpAmount(totalPendingExpense)}
              </span>
            </div>

            <div className="p-2 sm:p-2.5 rounded-lg border border-purple-500/30 bg-purple-950/20 flex flex-col min-w-0">
              <span className="text-[10px] sm:text-[11px] font-medium text-purple-300/90 flex items-center gap-1 truncate">
                <Coins className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" /> Net Gold
              </span>
              <span
                className={cn(
                  'text-sm sm:text-base font-bold font-mono mt-0.5 truncate',
                  netPendingGold > 0
                    ? 'text-emerald-300'
                    : netPendingGold < 0
                    ? 'text-amber-300'
                    : 'text-muted-foreground'
                )}
              >
                {netPendingGold >= 0 ? '+' : ''}
                {formatGpAmount(netPendingGold)}
              </span>
            </div>

            <div className="p-2 sm:p-2.5 rounded-lg border border-cyan-500/30 bg-cyan-950/20 flex flex-col min-w-0">
              <span className="text-[10px] sm:text-[11px] font-medium text-cyan-300/90 flex items-center gap-1 truncate">
                <Package className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" /> Items to Add
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-cyan-200 mt-0.5 truncate">
                {pendingWonItems.length} {pendingWonItems.length === 1 ? 'Item' : 'Items'}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3.5 sm:p-5 space-y-4">
          {totalPendingCount === 0 ? (
            <div className="py-5 text-center space-y-1 bg-emerald-950/10 border border-emerald-500/20 rounded-lg px-3">
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-semibold text-xs sm:text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>All Character Sheet Updates Complete!</span>
              </div>
              <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
                No pending gold transfers or acquired items waiting to be recorded. Everything is synchronized.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 1. Pending Items to Add to Inventory */}
              {pendingWonItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <PackageCheck className="h-4 w-4 shrink-0" />
                    Items to Add to Inventory ({pendingWonItems.length})
                  </h4>
                  <div className="grid gap-2">
                    {pendingWonItems.map((item: any) => (
                      <div
                        key={item._id}
                        className="p-2.5 rounded-md border border-cyan-500/30 bg-cyan-950/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs"
                      >
                        <div className="flex items-start sm:items-center gap-2 min-w-0">
                          <Package className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5 sm:mt-0" />
                          <div className="min-w-0 break-words">
                            <span className="font-bold text-foreground">{item.name}</span>
                            <span className="text-muted-foreground block sm:inline sm:ml-2">
                              (Won for <span className="text-amber-300 font-mono font-medium">{item.winningAmount} GP</span> from {item.sellerName})
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleBuyerClaimed(item._id)}
                          className="h-7 px-2.5 text-[11px] border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200 self-end sm:self-auto shrink-0 gap-1"
                        >
                          <CheckCheck className="h-3 w-3" />
                          Mark Added
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Pending Gold Income */}
              {(pendingSoldItems.length > 0 || pendingSponsoredQuests.length > 0 || pendingGuildmasterGains.length > 0 || pendingWonBets.length > 0) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <ArrowDownLeft className="h-4 w-4 shrink-0" />
                    Pending Gold Income (+{formatGpAmount(totalPendingIncome)})
                  </h4>
                  <div className="grid gap-2">
                    {pendingWonBets.map((bet: any) => (
                      <div
                        key={bet._id}
                        className="p-2.5 rounded-md border border-emerald-500/30 bg-emerald-950/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs"
                      >
                        <div className="flex items-start sm:items-center gap-2 min-w-0">
                          <Trophy className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                          <div className="min-w-0 break-words">
                            <span className="font-bold text-foreground">Deathroll Bet Won</span>
                            <span className="text-muted-foreground block sm:inline sm:ml-2">
                              vs {bet.opponentName} ({bet.lossReason === 'timeout' ? 'by 24h Timeout' : 'Rolled a 0'})
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/20">
                          <span className="font-mono font-bold text-emerald-300">+{bet.wagerAmount} GP</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleBetWinnerClaimed(bet._id)}
                            className="h-7 px-2.5 text-[11px] border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300 gap-1"
                          >
                            <CheckCheck className="h-3 w-3" />
                            Mark Added
                          </Button>
                        </div>
                      </div>
                    ))}

                    {pendingSoldItems.map((item: any) => (
                      <div
                        key={item._id}
                        className="p-2.5 rounded-md border border-emerald-500/30 bg-emerald-950/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs"
                      >
                        <div className="flex items-start sm:items-center gap-2 min-w-0">
                          <Coins className="h-4 w-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                          <div className="min-w-0 break-words">
                            <span className="font-bold text-foreground">Sold: {item.name}</span>
                            <span className="text-muted-foreground block sm:inline sm:ml-2">to {item.winningBidderName}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/20">
                          <span className="font-mono font-bold text-emerald-300">+{item.winningAmount} GP</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleSellerClaimed(item._id)}
                            className="h-7 px-2.5 text-[11px] border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300 gap-1"
                          >
                            <CheckCheck className="h-3 w-3" />
                            Mark Added
                          </Button>
                        </div>
                      </div>
                    ))}

                    {pendingSponsoredQuests.map((quest: any) => (
                      <div
                        key={quest._id}
                        className="p-2.5 rounded-md border border-emerald-500/30 bg-emerald-950/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs"
                      >
                        <div className="flex items-start sm:items-center gap-2 min-w-0">
                          <Sparkles className="h-4 w-4 text-purple-400 shrink-0 mt-0.5 sm:mt-0" />
                          <div className="min-w-0 break-words">
                            <span className="font-bold text-foreground">Guild Sponsorship: {quest.name}</span>
                            <span className="text-muted-foreground block sm:inline sm:ml-2">({quest.worldName})</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/20">
                          <span className="font-mono font-bold text-emerald-300">+{quest.sponsoredAmount}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleQuestClaimed(quest._id)}
                            className="h-7 px-2.5 text-[11px] border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300 gap-1"
                          >
                            <CheckCheck className="h-3 w-3" />
                            Mark Added
                          </Button>
                        </div>
                      </div>
                    ))}

                    {pendingGuildmasterGains.map((gain: any) => (
                      <div
                        key={gain._id}
                        className="p-2.5 rounded-md border border-emerald-500/30 bg-emerald-950/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs"
                      >
                        <div className="flex items-start sm:items-center gap-2 min-w-0">
                          <Crown className="h-4 w-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                          <div className="min-w-0 break-words">
                            <span className="font-bold text-foreground">GM Regional Gain: {gain.name}</span>
                            <span className="text-muted-foreground block sm:inline sm:ml-2">({gain.worldName})</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/20">
                          <span className="font-mono font-bold text-emerald-300">+{gain.guildmasterCut}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleGuildmasterGain(gain)}
                            className="h-7 px-2.5 text-[11px] border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300 gap-1"
                          >
                            <CheckCheck className="h-3 w-3" />
                            Mark Added
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Pending Gold Expenses */}
              {(pendingWonItems.length > 0 || pendingQuestsToPay.length > 0 || pendingLostBets.length > 0) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <ArrowUpRight className="h-4 w-4 shrink-0" />
                    Pending Gold Expenses (-{formatGpAmount(totalPendingExpense)})
                  </h4>
                  <div className="grid gap-2">
                    {pendingLostBets.map((bet: any) => (
                      <div
                        key={bet._id}
                        className="p-2.5 rounded-md border border-rose-500/30 bg-rose-950/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs"
                      >
                        <div className="flex items-start sm:items-center gap-2 min-w-0">
                          <Skull className="h-4 w-4 text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
                          <div className="min-w-0 break-words">
                            <span className="font-bold text-foreground">Deathroll Bet Lost</span>
                            <span className="text-muted-foreground block sm:inline sm:ml-2">
                              vs {bet.opponentName} ({bet.lossReason === 'timeout' ? 'Missed 24h Window' : 'Rolled a 0'})
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/20">
                          <span className="font-mono font-bold text-rose-300">-{bet.wagerAmount} GP</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleBetLoserClaimed(bet._id)}
                            className="h-7 px-2.5 text-[11px] border-rose-500/30 hover:bg-rose-500/20 text-rose-300 gap-1"
                          >
                            <CheckCheck className="h-3 w-3" />
                            Mark Deducted
                          </Button>
                        </div>
                      </div>
                    ))}

                    {pendingWonItems.map((item: any) => (
                      <div
                        key={item._id}
                        className="p-2.5 rounded-md border border-amber-500/30 bg-amber-950/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs"
                      >
                        <div className="flex items-start sm:items-center gap-2 min-w-0">
                          <Receipt className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                          <div className="min-w-0 break-words">
                            <span className="font-bold text-foreground">Purchased: {item.name}</span>
                            <span className="text-muted-foreground block sm:inline sm:ml-2">from {item.sellerName}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/20">
                          <span className="font-mono font-bold text-amber-300">-{item.winningAmount} GP</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleBuyerClaimed(item._id)}
                            className="h-7 px-2.5 text-[11px] border-amber-500/30 hover:bg-amber-500/20 text-amber-300 gap-1"
                          >
                            <CheckCheck className="h-3 w-3" />
                            Mark Deducted
                          </Button>
                        </div>
                      </div>
                    ))}

                    {pendingQuestsToPay.map((quest: any) => (
                      <div
                        key={quest._id}
                        className="p-2.5 rounded-md border border-amber-500/30 bg-amber-950/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs"
                      >
                        <div className="flex items-start sm:items-center gap-2 min-w-0">
                          <Scroll className="h-4 w-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                          <div className="min-w-0 break-words">
                            <span className="font-bold text-foreground">Quest Payout: {quest.name}</span>
                            <span className="text-muted-foreground block sm:inline sm:ml-2">({quest.worldName})</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/20">
                          <span className="font-mono font-bold text-amber-300">-{quest.actualToPay}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTogglePaymentClaimed(quest._id)}
                            className="h-7 px-2.5 text-[11px] border-amber-500/30 hover:bg-amber-500/20 text-amber-300 gap-1"
                          >
                            <CheckCheck className="h-3 w-3" />
                            Mark Paid
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 1. Items Sold & Earnings */}
      <Card className="border-purple-500/30 bg-card/60 overflow-hidden">
        <CardHeader className="p-3.5 sm:p-5 border-b border-border/20">
          <CardTitle className="text-sm sm:text-base font-bold flex flex-wrap items-center justify-between gap-2 text-purple-300">
            <span className="flex items-center gap-2">
              <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 shrink-0" />
              <span>Listings Sold & Revenue</span>
            </span>
            <span className="text-[11px] font-mono text-muted-foreground font-normal">
              0% Black Market Tax
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-5">
          {createdItems.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No item listings created by this character yet.
            </p>
          ) : (
            <div className="space-y-3">
              {createdItems.map((item: any) => {
                const isSold = item.status === 'completed' && item.winningAmount
                const isClaimed = !!item.sellerClaimed

                return (
                  <div
                    key={item._id}
                    className={cn(
                      "p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 transition-all",
                      isClaimed
                        ? "bg-emerald-950/20 border-emerald-500/30"
                        : "bg-muted/20 border-border/30"
                    )}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-foreground break-words">{item.name}</span>
                        <span
                          className={cn(
                            "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded",
                            isSold
                              ? "bg-emerald-500/20 text-emerald-300"
                              : item.status === 'active'
                              ? "bg-purple-500/20 text-purple-300"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {isSold ? 'Sold' : item.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground break-words">
                        {isSold ? (
                          <span>
                            Sold to <strong className="text-purple-300">{item.winningBidderName}</strong> for{' '}
                            <strong className="text-amber-400 font-mono">{item.winningAmount} GP</strong>
                          </span>
                        ) : (
                          <span>
                            Start Bid: {item.startingBid || 'N/A'} GP | Buyout: {item.buyoutPrice || 'N/A'} GP
                          </span>
                        )}
                      </p>
                    </div>

                    {isSold && (
                      <div className="self-end sm:self-auto shrink-0 pt-1 sm:pt-0">
                        <label className="flex items-center gap-2 cursor-pointer bg-background/60 hover:bg-background px-2.5 py-1.5 rounded-md border border-purple-500/30 text-xs">
                          <Checkbox
                            checked={isClaimed}
                            onCheckedChange={() => handleToggleSellerClaimed(item._id)}
                            className="border-purple-400 data-[state=checked]:bg-emerald-600"
                          />
                          <span className={cn("font-medium text-[11px]", isClaimed ? "text-emerald-300" : "text-muted-foreground")}>
                            {isClaimed ? 'Added to Sheet ✓' : 'Add to Sheet'}
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Items Won & Expenses Paid */}
      <Card className="border-purple-500/30 bg-card/60 overflow-hidden">
        <CardHeader className="p-3.5 sm:p-5 border-b border-border/20">
          <CardTitle className="text-sm sm:text-base font-bold flex items-center justify-between text-purple-300">
            <span className="flex items-center gap-2">
              <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 shrink-0" />
              <span>Auctions Won & Expenses Paid</span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-5">
          {wonItems.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No won auctions or items purchased by this character yet.
            </p>
          ) : (
            <div className="space-y-3">
              {wonItems.map((item: any) => {
                const isClaimed = !!item.buyerClaimed

                return (
                  <div
                    key={item._id}
                    className={cn(
                      "p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 transition-all",
                      isClaimed
                        ? "bg-emerald-950/20 border-emerald-500/30"
                        : "bg-muted/20 border-border/30"
                    )}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-foreground break-words">{item.name}</span>
                        <span className="text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                          Won ({item.winningType || 'Auction'})
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground break-words">
                        Seller: <strong className="text-purple-300">{item.sellerName}</strong> | Amount Paid:{' '}
                        <strong className="text-amber-400 font-mono">{item.winningAmount} GP</strong>
                      </p>
                    </div>

                    <div className="self-end sm:self-auto shrink-0 pt-1 sm:pt-0">
                      <label className="flex items-center gap-2 cursor-pointer bg-background/60 hover:bg-background px-2.5 py-1.5 rounded-md border border-purple-500/30 text-xs">
                        <Checkbox
                          checked={isClaimed}
                          onCheckedChange={() => handleToggleBuyerClaimed(item._id)}
                          className="border-purple-400 data-[state=checked]:bg-emerald-600"
                        />
                        <span className={cn("font-medium text-[11px]", isClaimed ? "text-emerald-300" : "text-muted-foreground")}>
                          {isClaimed ? 'Added to Sheet ✓' : 'Add to Sheet'}
                        </span>
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Guild Sponsorship Reimbursements (Journeyman / Guildmaster Perk) */}
      <Card className="border-purple-500/30 bg-card/60 overflow-hidden">
        <CardHeader className="p-3.5 sm:p-5 border-b border-border/20">
          <CardTitle className="text-sm sm:text-base font-bold flex flex-wrap items-center justify-between gap-2 text-purple-300">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400 shrink-0" />
              <span>Guild Sponsorship (20% Perk)</span>
            </span>
            <span className="text-[11px] text-muted-foreground font-normal">
              1/5th Cost Sponsored
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-5">
          {sponsoredQuestReimbursements.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No completed sponsored character quests to reimburse yet.
            </p>
          ) : (
            <div className="space-y-3">
              {sponsoredQuestReimbursements.map((quest: any) => {
                const isClaimed = !!quest.reimbursementClaimed

                return (
                  <div
                    key={quest._id}
                    className={cn(
                      "p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 transition-all",
                      isClaimed
                        ? "bg-emerald-950/20 border-emerald-500/30"
                        : "bg-purple-950/20 border-purple-500/30"
                    )}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-foreground break-words">{quest.name}</span>
                        <span className="text-[10px] uppercase font-bold bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                          20% Reimbursed
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground break-words">
                        World: <strong className="text-blue-300">{quest.worldName}</strong> | Agreed Reward:{' '}
                        <span className="text-amber-300 font-semibold">{quest.reward || 'Custom'}</span>
                      </p>
                      <div className="flex items-center gap-3 text-xs pt-0.5 flex-wrap">
                        <span className="text-emerald-300 font-mono font-medium">
                          Payback: <strong>{quest.sponsoredAmount}</strong>
                        </span>
                        {quest.netCost && (
                          <span className="text-purple-300 font-mono font-medium">
                            Net Out-of-Pocket: <strong>{quest.netCost}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="self-end sm:self-auto shrink-0 pt-1 sm:pt-0">
                      <label className="flex items-center gap-2 cursor-pointer bg-background/60 hover:bg-background px-2.5 py-1.5 rounded-md border border-purple-500/30 text-xs">
                        <Checkbox
                          checked={isClaimed}
                          onCheckedChange={() => handleToggleQuestClaimed(quest._id)}
                          className="border-purple-400 data-[state=checked]:bg-emerald-600"
                        />
                        <span className={cn("font-medium text-[11px]", isClaimed ? "text-emerald-300" : "text-muted-foreground")}>
                          {isClaimed ? 'Added to Sheet ✓' : 'Add to Sheet'}
                        </span>
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Quests Completed: To Be Paid (Party Reward Expenses) */}
      <Card className="border-purple-500/30 bg-card/60 overflow-hidden">
        <CardHeader className="p-3.5 sm:p-5 border-b border-border/20">
          <CardTitle className="text-sm sm:text-base font-bold flex flex-wrap items-center justify-between gap-2 text-purple-300">
            <span className="flex items-center gap-2">
              <Scroll className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 shrink-0" />
              <span>Completed Quests: Payouts</span>
            </span>
            <span className="text-[11px] text-muted-foreground font-normal">
              Party Reward Expense
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-5">
          {completedQuestsToPay.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No completed quests issued by this character requiring payment.
            </p>
          ) : (
            <div className="space-y-3">
              {completedQuestsToPay.map((quest: any) => {
                const isClaimed = !!quest.paymentClaimed

                return (
                  <div
                    key={quest._id}
                    className={cn(
                      "p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 transition-all",
                      isClaimed
                        ? "bg-emerald-950/20 border-emerald-500/30"
                        : "bg-amber-950/20 border-amber-500/30"
                    )}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-foreground break-words">{quest.name}</span>
                        <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                          To Be Paid
                        </span>
                        {quest.isSponsored && (
                          <span className="text-[10px] uppercase font-bold bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                            20% Reimbursed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground break-words">
                        World: <strong className="text-blue-300">{quest.worldName}</strong> | Agreed Reward:{' '}
                        <span className="text-amber-300 font-semibold">{quest.reward}</span>
                      </p>
                      <p className="text-xs text-amber-300 font-mono font-medium break-words">
                        Actual Payout Cost:{' '}
                        <strong className="text-white text-sm">{quest.actualToPay}</strong>
                      </p>
                    </div>

                    <div className="self-end sm:self-auto shrink-0 pt-1 sm:pt-0">
                      <label className="flex items-center gap-2 cursor-pointer bg-background/60 hover:bg-background px-2.5 py-1.5 rounded-md border border-purple-500/30 text-xs">
                        <Checkbox
                          checked={isClaimed}
                          onCheckedChange={() => handleTogglePaymentClaimed(quest._id)}
                          className="border-purple-400 data-[state=checked]:bg-emerald-600"
                        />
                        <span className={cn("font-medium text-[11px]", isClaimed ? "text-emerald-300" : "text-muted-foreground")}>
                          {isClaimed ? 'Paid ✓' : 'Mark Paid'}
                        </span>
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Guildmaster Regional Quest & Loot Gains (Level 14+ Guildmaster Perk) */}
      {isGuildmaster && (
        <Card className="border-amber-500/30 bg-card/60 overflow-hidden">
          <CardHeader className="p-3.5 sm:p-5 border-b border-border/20">
            <CardTitle className="text-sm sm:text-base font-bold flex flex-wrap items-center justify-between gap-2 text-amber-300">
              <span className="flex items-center gap-2">
                <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 shrink-0" />
                <span>Guildmaster Regional Gains (20%)</span>
              </span>
              <span className="text-[11px] text-muted-foreground font-normal">
                Compensated by The Void
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5">
            {guildmasterAreaGains.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No completed regional quests or session loot cuts awarded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {guildmasterAreaGains.map((item: any) => {
                  const isClaimed = !!item.reimbursementClaimed

                  return (
                    <div
                      key={item._id}
                      className={cn(
                        "p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 transition-all",
                        isClaimed
                          ? "bg-emerald-950/20 border-emerald-500/30"
                          : "bg-amber-950/20 border-amber-500/30"
                      )}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-foreground break-words">{item.name}</span>
                          <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                            {item.isSessionLootCut ? 'Session Loot Cut' : `Lvl ${item.level} Area`}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground break-words">
                          Region: <strong className="text-blue-300">{item.worldName}</strong> | Value:{' '}
                          <span className="text-amber-300 font-semibold">{item.reward}</span>
                        </p>
                        <p className="text-xs text-amber-300 font-mono font-medium break-words">
                          GM Cut: <strong>{item.guildmasterCut}</strong>
                        </p>
                      </div>

                      <div className="self-end sm:self-auto shrink-0 pt-1 sm:pt-0">
                        <label className="flex items-center gap-2 cursor-pointer bg-background/60 hover:bg-background px-2.5 py-1.5 rounded-md border border-amber-500/30 text-xs">
                          <Checkbox
                            checked={isClaimed}
                            onCheckedChange={() => handleToggleGuildmasterGain(item)}
                            className="border-amber-400 data-[state=checked]:bg-emerald-600"
                          />
                          <span className={cn("font-medium text-[11px]", isClaimed ? "text-emerald-300" : "text-muted-foreground")}>
                            {isClaimed ? 'Added to Sheet ✓' : 'Add to Sheet'}
                          </span>
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 6. Deathroll Betting & Void Wagers */}
      {(betsWon.length > 0 || betsLost.length > 0) && (
        <Card className="border-rose-500/30 bg-card/60 overflow-hidden">
          <CardHeader className="p-3.5 sm:p-5 border-b border-border/20">
            <CardTitle className="text-sm sm:text-base font-bold flex flex-wrap items-center justify-between gap-2 text-rose-300">
              <span className="flex items-center gap-2">
                <Dices className="h-4 w-4 sm:h-5 sm:w-5 text-rose-400 shrink-0" />
                <span>Deathroll Betting & Void Wagers</span>
              </span>
              <span className="text-[11px] font-mono text-muted-foreground font-normal">
                Duel Ledger
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5">
            <div className="space-y-3">
              {/* Bets Won */}
              {betsWon.map((bet: any) => {
                const isClaimed = !!bet.winnerClaimed
                return (
                  <div
                    key={bet._id}
                    className={cn(
                      "p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 transition-all",
                      isClaimed
                        ? "bg-emerald-950/20 border-emerald-500/30"
                        : "bg-emerald-950/15 border-emerald-500/40"
                    )}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-foreground break-words">
                          Won vs {bet.opponentName}
                        </span>
                        <span className="text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                          Duel Won
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground break-words">
                        Wager Won:{' '}
                        <strong className="text-emerald-300 font-mono font-bold">+{bet.wagerAmount} GP</strong> •
                        0-{bet.deathrollValue?.toLocaleString()} • {bet.lossReason === 'timeout' ? 'Opponent Timed Out (24h)' : 'Opponent Rolled 0'} ({bet.rollsCount} rolls)
                      </p>
                    </div>

                    <div className="self-end sm:self-auto shrink-0 pt-1 sm:pt-0">
                      <label className="flex items-center gap-2 cursor-pointer bg-background/60 hover:bg-background px-2.5 py-1.5 rounded-md border border-emerald-500/30 text-xs">
                        <Checkbox
                          checked={isClaimed}
                          onCheckedChange={() => handleToggleBetWinnerClaimed(bet._id)}
                          className="border-emerald-400 data-[state=checked]:bg-emerald-600"
                        />
                        <span className={cn("font-medium text-[11px]", isClaimed ? "text-emerald-300" : "text-muted-foreground")}>
                          {isClaimed ? 'Added to Sheet ✓' : 'Add to Sheet'}
                        </span>
                      </label>
                    </div>
                  </div>
                )
              })}

              {/* Bets Lost */}
              {betsLost.map((bet: any) => {
                const isClaimed = !!bet.loserClaimed
                return (
                  <div
                    key={bet._id}
                    className={cn(
                      "p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 transition-all",
                      isClaimed
                        ? "bg-emerald-950/20 border-emerald-500/30"
                        : "bg-rose-950/15 border-rose-500/40"
                    )}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-foreground break-words">
                          Lost vs {bet.opponentName}
                        </span>
                        <span className="text-[10px] uppercase font-bold bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">
                          Duel Lost
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground break-words">
                        Wager Lost:{' '}
                        <strong className="text-rose-300 font-mono font-bold">-{bet.wagerAmount} GP</strong> •
                        0-{bet.deathrollValue?.toLocaleString()} • {bet.lossReason === 'timeout' ? 'Missed 24h Window' : 'Rolled 0'} ({bet.rollsCount} rolls)
                      </p>
                    </div>

                    <div className="self-end sm:self-auto shrink-0 pt-1 sm:pt-0">
                      <label className="flex items-center gap-2 cursor-pointer bg-background/60 hover:bg-background px-2.5 py-1.5 rounded-md border border-rose-500/30 text-xs">
                        <Checkbox
                          checked={isClaimed}
                          onCheckedChange={() => handleToggleBetLoserClaimed(bet._id)}
                          className="border-rose-400 data-[state=checked]:bg-emerald-600"
                        />
                        <span className={cn("font-medium text-[11px]", isClaimed ? "text-emerald-300" : "text-muted-foreground")}>
                          {isClaimed ? 'Deducted from Sheet ✓' : 'Deduct from Sheet'}
                        </span>
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 7. Crafting Services Offered */}
      {servicesOffered.length > 0 && (
        <Card className="border-amber-500/30 bg-card/60 overflow-hidden">
          <CardHeader className="p-3.5 sm:p-5 border-b border-border/20">
            <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-amber-300">
              <Hammer className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 shrink-0" />
              <span>Offered Crafting & Services</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5">
            <div className="space-y-3">
              {servicesOffered.map((svc: any) => (
                <div
                  key={svc._id}
                  className="p-3 rounded-lg border bg-muted/20 border-border/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-xs sm:text-sm text-foreground break-words">{svc.name}</h4>
                      <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                        {svc.status}
                      </span>
                    </div>
                    <p className="text-xs text-amber-300/80 font-mono mt-0.5 break-words">
                      Price: {svc.priceDetails || 'Custom'} | Level: {svc.minLevel ? `Lvl ${svc.minLevel} - ${svc.maxLevel ?? 'Any'}` : `Up to Lvl ${svc.maxLevel ?? 'Any'}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 border border-amber-500/30 gap-1"
                      onClick={() => setEditingService(svc)}
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20 border border-red-500/30 gap-1"
                      onClick={async () => {
                        if (!window.confirm(`Are you sure you want to delete "${svc.name}"?`)) return
                        try {
                          await deleteServiceListing({
                            listingId: svc._id,
                            characterId,
                          })
                          toast.success('Service listing deleted.')
                        } catch (err: any) {
                          toast.error(err.message || 'Failed to delete service listing.')
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 8. MANUAL CURRENCY ADJUSTMENT FIELD AT THE BOTTOM */}
      <Card className="border-amber-500/40 bg-gradient-to-b from-amber-950/20 via-card/80 to-background shadow-lg overflow-hidden">
        <CardHeader className="p-3.5 sm:p-5 border-b border-border/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-amber-300">
                <Wallet className="h-5 w-5 text-amber-400 shrink-0" />
                <span>Manual Currency Adjustment</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Directly adjust and save your character&apos;s coin purse (Platinum, Gold, Silver, Copper).
              </CardDescription>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold self-start sm:self-auto">
              Total: {formatGpAmount(calculatedManualGold)}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3.5 sm:p-5">
          <form onSubmit={handleSaveCurrency} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* PP */}
              <div className="space-y-1.5 p-2.5 rounded-lg bg-purple-950/20 border border-purple-500/30">
                <label className="text-[11px] font-bold uppercase tracking-wider text-purple-300 flex items-center justify-between">
                  <span>Platinum (PP)</span>
                  <span className="text-[10px] text-purple-400/70 font-normal">10 GP</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={ppVal}
                    onChange={(e) => setPpVal(e.target.value)}
                    className="bg-background font-mono text-sm pl-7 text-purple-200 border-purple-500/30 focus-visible:ring-purple-400"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-purple-400">
                    PP
                  </span>
                </div>
              </div>

              {/* GP */}
              <div className="space-y-1.5 p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/30">
                <label className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center justify-between">
                  <span>Gold (GP)</span>
                  <span className="text-[10px] text-amber-400/70 font-normal">1 GP</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={gpVal}
                    onChange={(e) => setGpVal(e.target.value)}
                    className="bg-background font-mono text-sm pl-7 text-amber-200 border-amber-500/30 focus-visible:ring-amber-400"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400">
                    GP
                  </span>
                </div>
              </div>

              {/* SP */}
              <div className="space-y-1.5 p-2.5 rounded-lg bg-slate-900/40 border border-slate-500/30">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span>Silver (SP)</span>
                  <span className="text-[10px] text-slate-400/70 font-normal">0.1 GP</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={spVal}
                    onChange={(e) => setSpVal(e.target.value)}
                    className="bg-background font-mono text-sm pl-7 text-slate-200 border-slate-500/30 focus-visible:ring-slate-400"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    SP
                  </span>
                </div>
              </div>

              {/* CP */}
              <div className="space-y-1.5 p-2.5 rounded-lg bg-amber-950/30 border border-amber-700/30">
                <label className="text-[11px] font-bold uppercase tracking-wider text-amber-600 flex items-center justify-between">
                  <span>Copper (CP)</span>
                  <span className="text-[10px] text-amber-600/70 font-normal">0.01 GP</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={cpVal}
                    onChange={(e) => setCpVal(e.target.value)}
                    className="bg-background font-mono text-sm pl-7 text-amber-500 border-amber-700/30 focus-visible:ring-amber-600"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-600">
                    CP
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Adjust Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/20">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground mr-1">Quick Add:</span>
                {[10, 50, 100, 500].map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddGold(amount)}
                    className="h-7 px-2 text-[10px] font-mono border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                  >
                    +{amount} GP
                  </Button>
                ))}
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={isSavingCurrency}
                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-md shadow-amber-900/30"
              >
                {isSavingCurrency ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Purse Currency
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {editingService && (
        <ServiceListingDialog
          isOpen={!!editingService}
          onClose={() => setEditingService(null)}
          characterId={characterId}
          characterLevel={editingService.maxLevel || 20}
          editingService={editingService}
        />
      )}
    </div>
  )
}
