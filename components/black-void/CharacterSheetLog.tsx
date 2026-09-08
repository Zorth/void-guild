'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Coins, CheckCircle2, PackageCheck, Receipt, Hammer, AlertCircle, Sparkles, Crown, Scroll } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CharacterSheetLogProps {
  characterId: Id<'characters'> | null
}

export default function CharacterSheetLog({ characterId }: CharacterSheetLogProps) {
  const transactions = useQuery(api.blackVoid.getCharacterTransactions, { characterId: characterId || undefined })
  const toggleSellerClaimed = useMutation(api.blackVoid.toggleSellerClaimed)
  const toggleBuyerClaimed = useMutation(api.blackVoid.toggleBuyerClaimed)
  const toggleQuestClaimed = useMutation(api.quests.toggleQuestReimbursementClaimed)
  const togglePaymentClaimed = useMutation(api.quests.toggleQuestPaymentClaimed)

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

  const {
    createdItems = [],
    wonItems = [],
    servicesOffered = [],
    sponsoredQuestReimbursements = [],
    completedQuestsToPay = [],
    guildmasterAreaGains = [],
    isGuildmaster = false,
  } = (transactions as any) || {}

  const handleToggleSellerClaimed = async (listingId: Id<'blackVoidListings'>) => {
    try {
      await toggleSellerClaimed({ listingId, characterId })
      toast.success('Updated character sheet log state!')
    } catch (error) {
      toast.error('Failed to update character sheet status')
    }
  }

  const handleToggleBuyerClaimed = async (listingId: Id<'blackVoidListings'>) => {
    try {
      await toggleBuyerClaimed({ listingId, characterId })
      toast.success('Updated character sheet log state!')
    } catch (error) {
      toast.error('Failed to update character sheet status')
    }
  }

  const handleToggleQuestClaimed = async (questId: Id<'quests'>) => {
    try {
      await toggleQuestClaimed({ questId, characterId })
      toast.success('Updated quest reimbursement log state!')
    } catch (error) {
      toast.error('Failed to update quest reimbursement status')
    }
  }

  const handleTogglePaymentClaimed = async (questId: Id<'quests'>) => {
    try {
      await togglePaymentClaimed({ questId, characterId })
      toast.success('Updated quest payout status!')
    } catch (error) {
      toast.error('Failed to update quest payout status')
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Items Sold & Earnings */}
      <Card className="border-purple-500/30 bg-card/60">
        <CardHeader className="pb-3 border-b border-border/20">
          <CardTitle className="text-base font-bold flex items-center justify-between text-purple-300">
            <span className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-400" />
              Listings Sold & Revenue Earned
            </span>
            <span className="text-xs font-mono text-muted-foreground font-normal">
              0% Black Market Tax Applied
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
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
                      "p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all",
                      isClaimed
                        ? "bg-emerald-950/20 border-emerald-500/30"
                        : "bg-muted/20 border-border/30"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{item.name}</span>
                        <span
                          className={cn(
                            "text-[10px] uppercase font-bold px-2 py-0.5 rounded",
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
                      <p className="text-xs text-muted-foreground">
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
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <label className="flex items-center gap-2 cursor-pointer bg-background/60 hover:bg-background px-3 py-1.5 rounded-md border border-purple-500/30 text-xs">
                          <Checkbox
                            checked={isClaimed}
                            onCheckedChange={() => handleToggleSellerClaimed(item._id)}
                            className="border-purple-400 data-[state=checked]:bg-emerald-600"
                          />
                          <span className={cn("font-medium", isClaimed ? "text-emerald-300" : "text-muted-foreground")}>
                            {isClaimed ? 'Added to Character Sheet ✓' : 'Add to Character Sheet'}
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
      <Card className="border-purple-500/30 bg-card/60">
        <CardHeader className="pb-3 border-b border-border/20">
          <CardTitle className="text-base font-bold flex items-center justify-between text-purple-300">
            <span className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-400" />
              Auctions Won & Expenses Paid
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
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
                      "p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all",
                      isClaimed
                        ? "bg-emerald-950/20 border-emerald-500/30"
                        : "bg-muted/20 border-border/30"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{item.name}</span>
                        <span className="text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                          Won ({item.winningType || 'Auction'})
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Seller: <strong className="text-purple-300">{item.sellerName}</strong> | Amount Paid:{' '}
                        <strong className="text-amber-400 font-mono">{item.winningAmount} GP</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <label className="flex items-center gap-2 cursor-pointer bg-background/60 hover:bg-background px-3 py-1.5 rounded-md border border-purple-500/30 text-xs">
                        <Checkbox
                          checked={isClaimed}
                          onCheckedChange={() => handleToggleBuyerClaimed(item._id)}
                          className="border-purple-400 data-[state=checked]:bg-emerald-600"
                        />
                        <span className={cn("font-medium", isClaimed ? "text-emerald-300" : "text-muted-foreground")}>
                          {isClaimed ? 'Added to Character Sheet ✓' : 'Add to Character Sheet'}
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
      <Card className="border-purple-500/30 bg-card/60">
        <CardHeader className="pb-3 border-b border-border/20">
          <CardTitle className="text-base font-bold flex items-center justify-between text-purple-300">
            <span className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              Guild Sponsorship Reimbursements (20% Perk)
            </span>
            <span className="text-xs text-muted-foreground font-normal">
              1/5th Cost Sponsored by The Void
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {sponsoredQuestReimbursements.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No completed sponsored character quests to reimburse yet. (Quests up to Level - 4 issued by Journeymen / Guildmasters are sponsored 20% by the Guild).
            </p>
          ) : (
            <div className="space-y-3">
              {sponsoredQuestReimbursements.map((quest: any) => {
                const isClaimed = !!quest.reimbursementClaimed

                return (
                  <div
                    key={quest._id}
                    className={cn(
                      "p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all",
                      isClaimed
                        ? "bg-emerald-950/20 border-emerald-500/30"
                        : "bg-purple-950/20 border-purple-500/30"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{quest.name}</span>
                        <span className="text-[10px] uppercase font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                          20% Reimbursed
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        World: <strong className="text-blue-300">{quest.worldName}</strong> | Agreed Reward:{' '}
                        <span className="text-amber-300 font-semibold">{quest.reward || 'Custom'}</span>
                      </p>
                      <div className="flex items-center gap-3 text-xs pt-0.5 flex-wrap">
                        <span className="text-emerald-300 font-mono font-medium">
                          Guild Payback: <strong>{quest.sponsoredAmount}</strong>
                        </span>
                        {quest.netCost && (
                          <span className="text-purple-300 font-mono font-medium">
                            Net Out-of-Pocket: <strong>{quest.netCost}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <label className="flex items-center gap-2 cursor-pointer bg-background/60 hover:bg-background px-3 py-1.5 rounded-md border border-purple-500/30 text-xs">
                        <Checkbox
                          checked={isClaimed}
                          onCheckedChange={() => handleToggleQuestClaimed(quest._id)}
                          className="border-purple-400 data-[state=checked]:bg-emerald-600"
                        />
                        <span className={cn("font-medium", isClaimed ? "text-emerald-300" : "text-muted-foreground")}>
                          {isClaimed ? 'Added to Character Sheet ✓' : 'Add to Character Sheet'}
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
      <Card className="border-purple-500/30 bg-card/60">
        <CardHeader className="pb-3 border-b border-border/20">
          <CardTitle className="text-base font-bold flex items-center justify-between text-purple-300">
            <span className="flex items-center gap-2">
              <Scroll className="h-5 w-5 text-amber-400" />
              Completed Quests: To Be Paid to Adventurers
            </span>
            <span className="text-xs text-muted-foreground font-normal">
              Actual Out-of-Pocket Expense
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
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
                      "p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all",
                      isClaimed
                        ? "bg-emerald-950/20 border-emerald-500/30"
                        : "bg-amber-950/20 border-amber-500/30"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{quest.name}</span>
                        <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                          To Be Paid
                        </span>
                        {quest.isSponsored && (
                          <span className="text-[10px] uppercase font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                            20% Guild Reimbursed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        World: <strong className="text-blue-300">{quest.worldName}</strong> | Agreed Total Reward:{' '}
                        <span className="text-amber-300 font-semibold">{quest.reward}</span>
                      </p>
                      <p className="text-xs text-amber-300 font-mono font-medium">
                        Actual Price Character Has to Pay:{' '}
                        <strong className="text-white text-sm">{quest.actualToPay}</strong>
                        {quest.isSponsored && (
                          <span className="text-muted-foreground text-[11px] ml-1.5 font-normal">
                            (after 20% Guild payback of {quest.sponsoredAmount})
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <label className="flex items-center gap-2 cursor-pointer bg-background/60 hover:bg-background px-3 py-1.5 rounded-md border border-purple-500/30 text-xs">
                        <Checkbox
                          checked={isClaimed}
                          onCheckedChange={() => handleTogglePaymentClaimed(quest._id)}
                          className="border-purple-400 data-[state=checked]:bg-emerald-600"
                        />
                        <span className={cn("font-medium", isClaimed ? "text-emerald-300" : "text-muted-foreground")}>
                          {isClaimed ? 'Paid & Added to Sheet ✓' : 'Add Expense to Sheet'}
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

      {/* 5. Guildmaster Regional Quest Cuts (Level 14+ Guildmaster Perk) */}
      {isGuildmaster && (
        <Card className="border-amber-500/30 bg-card/60">
          <CardHeader className="pb-3 border-b border-border/20">
            <CardTitle className="text-base font-bold flex items-center justify-between text-amber-300">
              <span className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-400" />
                Guildmaster Regional Quest Gains (1/5th of all Area Quests)
              </span>
              <span className="text-xs text-muted-foreground font-normal">
                Paid by Guild of the Void
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {guildmasterAreaGains.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No completed regional quests up to Level - 4 found yet.
              </p>
            ) : (
              <div className="space-y-3">
                {guildmasterAreaGains.map((quest: any) => {
                  const isClaimed = !!quest.reimbursementClaimed

                  return (
                    <div
                      key={quest._id}
                      className={cn(
                        "p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all",
                        isClaimed
                          ? "bg-emerald-950/20 border-emerald-500/30"
                          : "bg-amber-950/20 border-amber-500/30"
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{quest.name}</span>
                          <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                            Lvl {quest.level} Area Quest
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Region: <strong className="text-blue-300">{quest.worldName}</strong> | Quest Gains:{' '}
                          <span className="text-amber-300 font-semibold">{quest.reward}</span>
                        </p>
                        <p className="text-xs text-amber-300 font-mono font-medium">
                          Guildmaster 1/5th Cut: <strong>{quest.guildmasterCut}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <label className="flex items-center gap-2 cursor-pointer bg-background/60 hover:bg-background px-3 py-1.5 rounded-md border border-amber-500/30 text-xs">
                          <Checkbox
                            checked={isClaimed}
                            onCheckedChange={() => handleToggleQuestClaimed(quest._id)}
                            className="border-amber-400 data-[state=checked]:bg-emerald-600"
                          />
                          <span className={cn("font-medium", isClaimed ? "text-emerald-300" : "text-muted-foreground")}>
                            {isClaimed ? 'Added to Character Sheet ✓' : 'Add to Character Sheet'}
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

      {/* 5. Crafting Services Offered */}
      {servicesOffered.length > 0 && (
        <Card className="border-amber-500/30 bg-card/60">
          <CardHeader className="pb-3 border-b border-border/20">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-amber-300">
              <Hammer className="h-5 w-5 text-amber-400" />
              Offered Crafting & Services
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {servicesOffered.map((svc: any) => (
                <div
                  key={svc._id}
                  className="p-3 rounded-lg border bg-muted/20 border-border/30 flex items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{svc.name}</h4>
                    <p className="text-xs text-amber-300/80 font-mono mt-0.5">
                      Price: {svc.priceDetails || 'Custom'} | Level: {svc.minLevel ? `Lvl ${svc.minLevel} - ${svc.maxLevel ?? 'Any'}` : `Up to Lvl ${svc.maxLevel ?? 'Any'}`}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                    {svc.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
