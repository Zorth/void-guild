'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Coins, Zap, ExternalLink, User, Bot, HelpCircle, AlertCircle } from 'lucide-react'
import { roundToTwoSigFigs, getNextValidBid } from '@/lib/blackVoidUtils'

interface BidDialogProps {
  isOpen: boolean
  onClose: () => void
  listing: any
  characterId: Id<'characters'> | null
  characterName?: string
  characterWealth?: {
    cp: number
    sp: number
    gp: number
    pp: number
    totalInGold: number
  } | null
  onSelectCharacter?: (id: Id<'characters'>) => void
}

export default function BidDialog({
  isOpen,
  onClose,
  listing,
  characterId,
  characterName,
  characterWealth,
  onSelectCharacter,
}: BidDialogProps) {
  const [selectedCharId, setSelectedCharId] = useState<Id<'characters'> | null>(characterId)
  const [bidAmount, setBidAmount] = useState<string>('')
  const [enableAutoBid, setEnableAutoBid] = useState<boolean>(false)
  const [maxAutoBidAmount, setMaxAutoBidAmount] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const userCharacters = useQuery(api.blackVoid.getUserCharacters)
  const placeBid = useMutation(api.blackVoid.placeBid)

  useEffect(() => {
    if (characterId) {
      setSelectedCharId(characterId)
    } else if (userCharacters && userCharacters.length > 0 && !selectedCharId) {
      setSelectedCharId(userCharacters[0]._id)
    }
  }, [characterId, userCharacters, isOpen])

  if (!listing) return null

  const activeChar = userCharacters?.find((c: any) => c._id === selectedCharId)
  const effectiveWealth = activeChar?.money || characterWealth
  const effectiveCharName = activeChar?.name || characterName

  const currentHighest = listing.winningAmount || 0
  const startingBid = listing.startingBid || 0
  const minRequired = currentHighest > 0 ? getNextValidBid(currentHighest) : startingBid || 1

  const parsedBid = parseFloat(bidAmount)
  const roundedBidPreview = !isNaN(parsedBid) && parsedBid > 0 ? roundToTwoSigFigs(parsedBid) : null

  const parsedMax = parseFloat(maxAutoBidAmount)
  const roundedMaxPreview = !isNaN(parsedMax) && parsedMax > 0 ? roundToTwoSigFigs(parsedMax) : null

  const handleCharacterChange = (newId: Id<'characters'>) => {
    setSelectedCharId(newId)
    onSelectCharacter?.(newId)
  }

  const handlePlaceBid = async (isBuyout: boolean) => {
    const targetCharId = selectedCharId || characterId
    if (!targetCharId) {
      toast.error('Please select an active character to place a bid.')
      return
    }

    let amount = isBuyout ? listing.buyoutPrice : parseFloat(bidAmount)

    if (!isBuyout && (!amount || amount < minRequired)) {
      toast.error(`Bid must be at least ${minRequired} GP.`)
      return
    }

    let autoBidCap: number | undefined = undefined
    if (!isBuyout && enableAutoBid) {
      const maxVal = parseFloat(maxAutoBidAmount)
      if (!maxVal || maxVal < (amount || minRequired)) {
        toast.error(`Auto-bid cap must be at least your current bid (${amount || minRequired} GP).`)
        return
      }
      autoBidCap = maxVal
    }

    setIsSubmitting(true)
    try {
      const res = await placeBid({
        listingId: listing._id,
        characterId: targetCharId,
        amount: amount || 0,
        maxAutoBid: autoBidCap,
        isBuyout,
      })

      if (res.isBuyout) {
        toast.success(`Purchased ${listing.name} via Buyout for ${res.amount} GP!`)
      } else if (res.isTopBidder) {
        toast.success(res.message || `Placed winning bid of ${res.amount} GP on ${listing.name}!`)
      } else {
        toast.warning(res.message || `Outbid on ${listing.name}. Current bid is ${res.amount} GP.`)
      }
      setBidAmount('')
      setMaxAutoBidAmount('')
      setEnableAutoBid(false)
      onClose()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to place bid')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isOwnListing = listing.characterId === selectedCharId

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] border-purple-500/40 bg-card/95 backdrop-blur-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-purple-300">
            <Coins className="h-5 w-5 text-amber-400" />
            Place Bid / Auto-Bid
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Character Selector */}
          <div className="space-y-1.5 bg-purple-950/20 border border-purple-500/30 p-2.5 rounded-lg">
            <label className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-purple-400" />
              Bidding Character
            </label>
            <select
              value={selectedCharId || ''}
              onChange={(e) => handleCharacterChange(e.target.value as Id<'characters'>)}
              className="w-full h-9 rounded-md border border-purple-500/40 bg-background/90 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 text-foreground"
            >
              {(userCharacters || []).map((char: any) => (
                <option key={char._id} value={char._id}>
                  {char.name} (Lvl {char.lvl} {char.class || 'Adventurer'})
                </option>
              ))}
            </select>
          </div>

          {/* Listing Summary */}
          <div className="p-3 rounded-lg bg-muted/20 border border-border/30 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-base text-foreground">{listing.name}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <User className="h-3 w-3" /> Seller: {listing.sellerName} (Lvl {listing.sellerLevel})
                </p>
              </div>
              {listing.nethysUrl && (
                <a
                  href={listing.nethysUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded shrink-0"
                >
                  AoN Link <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {listing.description && (
              <p className="text-xs text-muted-foreground line-clamp-3 pt-1 border-t border-border/20">
                {listing.description}
              </p>
            )}
          </div>

          {/* Current Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-md bg-purple-950/30 border border-purple-500/20 text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                Current Winning Bid
              </span>
              <span className="text-xl font-bold text-amber-400 font-mono">
                {currentHighest > 0 ? `${currentHighest} GP` : startingBid > 0 ? `${startingBid} GP (Start)` : 'No bids'}
              </span>
              {listing.winningBidderName && (
                <span className="text-[10px] text-purple-300 block truncate mt-0.5">
                  by {listing.winningBidderName}
                </span>
              )}
            </div>

            <div className="p-3 rounded-md bg-emerald-950/30 border border-emerald-500/20 text-center">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                Buyout Price
              </span>
              <span className="text-xl font-bold text-emerald-400 font-mono">
                {listing.buyoutPrice ? `${listing.buyoutPrice} GP` : 'N/A'}
              </span>
              <span className="text-[10px] text-emerald-300/70 block mt-0.5">
                {listing.buyoutPrice ? 'Instant Win' : 'Auction only'}
              </span>
            </div>
          </div>

          {/* Explanation Banner */}
          <div className="p-3 rounded-lg bg-purple-950/40 border border-purple-500/30 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-purple-300">
              <Bot className="h-4 w-4 text-purple-400 shrink-0" />
              Auto-Bidding & 2-Significant-Digit Rounding
            </div>
            <p className="text-[11px] text-purple-200/90 leading-relaxed">
              Auto-bidding automatically increases your bid up to your maximum cap whenever another player bids on this item.
            </p>
            <div className="text-[10px] text-purple-300/80 border-t border-purple-500/20 pt-1.5 flex items-start gap-1">
              <HelpCircle className="h-3 w-3 text-purple-400 shrink-0 mt-0.5" />
              <span>
                All bids use whole GP numbers rounded to <strong>2 significant figures</strong> (e.g., 1–99 GP in 1 GP steps; 100–990 GP in 10 GP steps; 1,000+ GP in 100 GP steps). Amounts like 101 or 1,010 GP are rounded to 100 or 1,000 GP.
              </span>
            </div>
          </div>

          {/* Active Character Wealth Display */}
          {effectiveWealth && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-amber-500/20 text-amber-300">
                  <Coins className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] text-amber-200/80 block uppercase font-bold tracking-wider">
                    {effectiveCharName ? `${effectiveCharName}'s Funds` : 'Character Funds'}
                  </span>
                  <span className="text-sm font-bold text-amber-300 font-mono">
                    {effectiveWealth.totalInGold % 1 === 0
                      ? effectiveWealth.totalInGold.toLocaleString()
                      : effectiveWealth.totalInGold.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} GP
                  </span>
                </div>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground text-right space-x-1.5">
                {effectiveWealth.pp > 0 && <span className="text-purple-300">{effectiveWealth.pp}pp</span>}
                <span className="text-amber-300">{effectiveWealth.gp}gp</span>
                {effectiveWealth.sp > 0 && <span className="text-slate-300">{effectiveWealth.sp}sp</span>}
                {effectiveWealth.cp > 0 && <span className="text-amber-600">{effectiveWealth.cp}cp</span>}
              </div>
            </div>
          )}

          {/* Bid Form */}
          <div className="space-y-3 pt-2 border-t border-border/20">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span>Initial Bid (Min {minRequired} GP)</span>
                {roundedBidPreview !== null && (
                  <span className="text-amber-400 font-mono text-[11px] normal-case">
                    Rounded: <strong>{roundedBidPreview} GP</strong>
                  </span>
                )}
              </div>
              <Input
                type="number"
                min={minRequired}
                step="1"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={`Min ${minRequired} GP`}
                className="bg-muted/30 font-mono text-sm"
              />
            </div>

            {/* Auto-Bid Toggle & Cap Input */}
            <div className="p-3 rounded-lg bg-muted/20 border border-purple-500/20 space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-purple-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enableAutoBid}
                  onChange={(e) => {
                    setEnableAutoBid(e.target.checked)
                    if (e.target.checked && !maxAutoBidAmount && bidAmount) {
                      setMaxAutoBidAmount(bidAmount)
                    }
                  }}
                  className="rounded border-purple-500 text-purple-600 focus:ring-purple-500 h-4 w-4"
                />
                Enable Maximum Auto-Bid Cap
              </label>

              {enableAutoBid && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span className="font-semibold text-purple-300">Max Cap You Are Willing To Pay</span>
                    {roundedMaxPreview !== null && (
                      <span className="text-purple-300 font-mono text-[11px]">
                        Rounded: <strong>{roundedMaxPreview} GP</strong>
                      </span>
                    )}
                  </div>
                  <Input
                    type="number"
                    min={parsedBid || minRequired}
                    step="1"
                    value={maxAutoBidAmount}
                    onChange={(e) => setMaxAutoBidAmount(e.target.value)}
                    placeholder={`Max Cap (e.g. ${Math.max(100, (parsedBid || minRequired) * 2)} GP)`}
                    className="bg-purple-950/30 border-purple-500/40 font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    The system will automatically bid the minimum necessary amount up to this cap.
                  </p>
                </div>
              )}
            </div>

            {/* Insufficient Funds Warning for Bid */}
            {(() => {
              const bidVal = parseFloat(bidAmount)
              const maxAutoVal = enableAutoBid ? parseFloat(maxAutoBidAmount) : 0
              const effectiveAmount = Math.max(bidVal || 0, maxAutoVal || 0)
              if (!effectiveWealth || effectiveAmount <= 0 || effectiveAmount <= effectiveWealth.totalInGold) return null
              return (
                <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-[10px] text-amber-200 flex items-start gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Insufficient Funds:</strong> Your {enableAutoBid ? 'auto-bid cap' : 'bid'} of{' '}
                    <strong className="font-mono">{effectiveAmount.toLocaleString()} GP</strong> exceeds your{' '}
                    <strong className="font-mono">{effectiveWealth.totalInGold.toLocaleString()} GP</strong> balance.
                  </span>
                </div>
              )
            })()}

            <Button
              type="button"
              onClick={() => handlePlaceBid(false)}
              disabled={isSubmitting || !selectedCharId || isOwnListing}
              className="w-full bg-purple-600 hover:bg-purple-700 font-bold text-xs h-10 gap-2 shadow-md"
            >
              <Coins className="h-4 w-4" />
              {enableAutoBid ? 'Place Auto-Bid' : 'Place Bid'}
            </Button>
          </div>

          {/* Buyout Button */}
          {listing.buyoutPrice && (
            <div className="pt-2 space-y-2">
              {effectiveWealth && listing.buyoutPrice > effectiveWealth.totalInGold && (
                <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-[10px] text-amber-200 flex items-start gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Insufficient Funds for Buyout:</strong> Price is{' '}
                    <strong className="font-mono">{listing.buyoutPrice.toLocaleString()} GP</strong> but you have{' '}
                    <strong className="font-mono">{effectiveWealth.totalInGold.toLocaleString()} GP</strong>.
                  </span>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => handlePlaceBid(true)}
                disabled={isSubmitting || !selectedCharId || isOwnListing}
                className="w-full border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 font-bold text-xs flex items-center justify-center gap-1.5 h-10"
              >
                <Zap className="h-4 w-4 text-emerald-400" />
                Buy Out Now for {listing.buyoutPrice} GP
              </Button>
            </div>
          )}

          {isOwnListing && (
            <p className="text-[11px] text-amber-400 text-center italic">
              You cannot bid on your own character listing.
            </p>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
