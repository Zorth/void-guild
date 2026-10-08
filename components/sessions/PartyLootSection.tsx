'use client'

import React, { useState, useMemo } from 'react'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Plus,
  Edit2,
  Trash2,
  Coins,
  Link as LinkIcon,
  X,
  User,
  Crown,
  Search,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface LootItem {
  id: string
  name: string
  link?: string
  valueGP: number
  isGood: boolean
  isPerCharacter?: boolean
  claimedBy?: Id<'characters'>
}

interface PartyLootSectionProps {
  session: Doc<'sessions'> & {
    isOwner: boolean
    canManage: boolean
    attendingCharacters: Doc<'characters'>[]
    guildmasterCutCharacterData?: Doc<'characters'> | null
  }
  userCharacterIds?: Set<Id<'characters'>>
}

interface AoNItemResult {
  id: string
  name: string
  url?: string
  priceInGP?: number
  priceRaw?: string
  category?: string
}

export default function PartyLootSection({
  session,
  userCharacterIds = new Set(),
}: PartyLootSectionProps) {
  const addLoot = useMutation(api.sessions.addLoot)
  const editLoot = useMutation(api.sessions.editLoot)
  const deleteLoot = useMutation(api.sessions.deleteLoot)
  const claimLoot = useMutation(api.sessions.claimLoot)
  const unclaimLoot = useMutation(api.sessions.unclaimLoot)
  const setSessionGuildmasterCut = useMutation(api.sessions.setSessionGuildmasterCut)
  const toggleSessionMoneyClaimed = useMutation(api.sessions.toggleSessionMoneyClaimed)
  const toggleGuildmasterCutClaimed = useMutation(api.sessions.toggleGuildmasterCutClaimed)
  const guildmasters = useQuery(api.characters.listGuildmasters)

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isGuildmasterDialogOpen, setIsGuildmasterDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<LootItem | null>(null)
  const [selectedGmId, setSelectedGmId] = useState<string>(
    session.guildmasterCut?.characterId || ''
  )
  const [isTogglingClaim, setIsTogglingClaim] = useState(false)
  const [isTogglingGmClaim, setIsTogglingGmClaim] = useState(false)

  // Loot Form State
  const [name, setName] = useState('')
  const [link, setLink] = useState('')
  const [valueGP, setValueGP] = useState<string>('0')
  const [isGood, setIsGood] = useState(false)
  const [isPerCharacter, setIsPerCharacter] = useState(false)
  const [quantity, setQuantity] = useState<string>('1')

  // AoN Item Search State
  const [aonQuery, setAonQuery] = useState('')
  const [isSearchingAon, setIsSearchingAon] = useState(false)
  const [aonSearchResults, setAonSearchResults] = useState<AoNItemResult[]>([])

  const loot = ((session as any).loot as LootItem[]) || []

  const userCharacterInSession = useMemo(() => {
    return session.attendingCharacters.find((c) => userCharacterIds.has(c._id))
  }, [session.attendingCharacters, userCharacterIds])

  const claimStatus = useQuery(
    api.sessions.getSessionClaimStatus,
    session.locked && userCharacterInSession?._id
      ? { sessionId: session._id, characterId: userCharacterInSession._id }
      : 'skip'
  )

  const handleSearchAon = async (searchVal: string) => {
    const q = searchVal.trim()
    if (!q) {
      setAonSearchResults([])
      return
    }
    setIsSearchingAon(true)
    try {
      const res = await fetch(`/api/nethys/item?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setAonSearchResults(data.results || [])
      } else {
        setAonSearchResults([])
      }
    } catch (e) {
      console.error('Failed to search Archives of Nethys item:', e)
    } finally {
      setIsSearchingAon(false)
    }
  }

  const handleSelectAonItem = (item: AoNItemResult) => {
    setName(item.name)
    if (item.url) setLink(item.url)
    if (item.priceInGP !== undefined && item.priceInGP > 0) {
      setValueGP(item.priceInGP.toString())
    }
    setAonSearchResults([])
    setAonQuery('')
    toast.success(`Loaded "${item.name}" from Archives of Nethys!`)
  }

  const handleSetGuildmaster = async (charId: string) => {
    try {
      await setSessionGuildmasterCut({
        sessionId: session._id,
        characterId: charId ? (charId as Id<'characters'>) : undefined,
      })
      setSelectedGmId(charId)
      setIsGuildmasterDialogOpen(false)
      toast.success(charId ? 'Guildmaster assigned to session!' : 'Guildmaster removed from session')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update Guildmaster')
    }
  }

  const resetForm = () => {
    setName('')
    setLink('')
    setValueGP('0')
    setIsGood(false)
    setIsPerCharacter(false)
    setQuantity('1')
    setEditingItem(null)
    setAonQuery('')
    setAonSearchResults([])
  }

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error('Item name is required')
      return
    }
    try {
      await addLoot({
        sessionId: session._id,
        name,
        link: link || undefined,
        valueGP: parseFloat(valueGP) || 0,
        isGood,
        isPerCharacter,
        quantity: parseInt(quantity) || 1,
      })
      setIsAddDialogOpen(false)
      resetForm()
      toast.success('Loot added')
    } catch (e) {
      toast.error('Failed to add loot')
    }
  }

  const handleEdit = async () => {
    if (!editingItem) return
    try {
      await editLoot({
        sessionId: session._id,
        lootId: editingItem.id,
        name,
        link: link || undefined,
        valueGP: parseFloat(valueGP) || 0,
        isGood,
        isPerCharacter,
      })
      setEditingItem(null)
      resetForm()
      toast.success('Loot updated')
    } catch (e) {
      toast.error('Failed to update loot')
    }
  }

  const handleDelete = async (lootId: string) => {
    if (!confirm('Are you sure you want to delete this loot?')) return
    try {
      await deleteLoot({ sessionId: session._id, lootId })
      toast.success('Loot deleted')
    } catch (e) {
      toast.error('Failed to delete loot')
    }
  }

  const handleClaim = async (lootId: string, characterId: Id<'characters'>) => {
    try {
      await claimLoot({ sessionId: session._id, lootId, characterId })
      toast.success('Loot claimed')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to claim loot')
    }
  }

  const handleUnclaim = async (lootId: string) => {
    try {
      await unclaimLoot({ sessionId: session._id, lootId })
      toast.success('Loot unclaimed')
    } catch (e) {
      toast.error('Failed to unclaim loot')
    }
  }

  const formatGP = (val: number) => {
    const isNegative = val < 0
    const absVal = Math.abs(val)
    const total_cp = Math.round(absVal * 100)
    const gp = Math.floor(total_cp / 100)
    const sp = Math.floor((total_cp % 100) / 10)
    const cp = total_cp % 10

    const parts = []
    if (gp > 0) parts.push(`${gp} GP`)
    if (sp > 0) parts.push(`${sp} SP`)
    if (cp > 0) parts.push(`${cp} CP`)

    const result = parts.length > 0 ? parts.join(' ') : '0 GP'
    return isNegative ? `-${result}` : result
  }

  const calculations = useMemo(() => {
    const attendingCount = session.attendingCharacters.length
    if (attendingCount === 0) return null

    const totalValue = loot.reduce((sum, item) => {
      const baseVal = item.isGood ? item.valueGP : item.valueGP / 2
      const itemTotal = item.isPerCharacter ? baseVal * attendingCount : baseVal
      return sum + itemTotal
    }, 0)

    const sharePerPlayer = totalValue / attendingCount

    const userClaimedValue = loot
      .filter((item) => item.claimedBy && userCharacterIds.has(item.claimedBy))
      .reduce((sum, item) => {
        const val = item.isGood ? item.valueGP : item.valueGP / 2
        return sum + val
      }, 0)

    const userFinalShare = sharePerPlayer - userClaimedValue
    const guildmasterCutValue = Math.round(totalValue * 0.2 * 100) / 100

    return {
      totalValue,
      sharePerPlayer,
      userFinalShare,
      userClaimedValue,
      guildmasterCutValue,
    }
  }, [loot, session.attendingCharacters.length, userCharacterIds])

  const currentNetMoneyGP = calculations ? Math.round(calculations.userFinalShare * 100) / 100 : 0
  const isClaimed = Boolean(claimStatus?.isClaimed)
  const previousClaimedAmount = claimStatus?.claimedMoneyAmount ?? 0
  const pendingMoneyAdjustmentGP = isClaimed
    ? Math.round((currentNetMoneyGP - previousClaimedAmount) * 100) / 100
    : currentNetMoneyGP

  const handleToggleSessionMoneyClaim = async () => {
    if (!userCharacterInSession || isTogglingClaim) return
    setIsTogglingClaim(true)
    try {
      await toggleSessionMoneyClaimed({
        sessionId: session._id,
        characterId: userCharacterInSession._id,
        currentNetMoneyGP,
      })
      toast.success(
        !isClaimed
          ? `Marked ${formatGP(currentNetMoneyGP)} as added to ${userCharacterInSession.name}'s sheet!`
          : pendingMoneyAdjustmentGP !== 0
          ? `Updated ${userCharacterInSession.name}'s sheet with adjustment (${pendingMoneyAdjustmentGP > 0 ? '+' : ''}${formatGP(pendingMoneyAdjustmentGP)})!`
          : `Removed session loot from ${userCharacterInSession.name}'s sheet log`
      )
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update sheet status')
    } finally {
      setIsTogglingClaim(false)
    }
  }

  const handleToggleGmCutClaim = async () => {
    if (!session.guildmasterCutCharacterData || isTogglingGmClaim) return
    setIsTogglingGmClaim(true)
    try {
      await toggleGuildmasterCutClaimed({
        sessionId: session._id,
        characterId: session.guildmasterCutCharacterData._id,
      })
      toast.success(
        !session.guildmasterCut?.claimed
          ? `Compensated 20% Guildmaster cut (${formatGP(calculations?.guildmasterCutValue || 0)}) to ${session.guildmasterCutCharacterData.name}!`
          : `Removed Guildmaster cut from ${session.guildmasterCutCharacterData.name}'s sheet log`
      )
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update Guildmaster compensation')
    } finally {
      setIsTogglingGmClaim(false)
    }
  }

  return (
    <div className="space-y-6 pt-6 border-t border-purple-500/20">
      {/* SECTION HEADER & SUMMARY CARDS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2 text-foreground">
            <Coins className="h-5 w-5 text-amber-400" />
            <span>Session Loot & Treasure</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track treasure, search Archives of Nethys equipment, calculate player shares, and handle Guildmaster cuts.
          </p>
        </div>

        {session.canManage && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md shadow-amber-900/30"
              >
                <Plus className="h-4 w-4" />
                <span>Add Loot Item</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg bg-zinc-950 border-purple-500/30">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-300">
                  <Coins className="h-5 w-5 text-amber-400" />
                  <span>Add Loot Item</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* ARCHIVES OF NETHYS SEARCH & AUTO-FILL */}
                <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-950/20 space-y-2">
                  <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5" />
                    <span>Search Archives of Nethys (AoN)</span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Bag of Holding, Striking Rune, Elixir of Life..."
                      value={aonQuery}
                      onChange={(e) => setAonQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleSearchAon(aonQuery)
                        }
                      }}
                      className="h-8 text-xs bg-background/60"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleSearchAon(aonQuery)}
                      disabled={isSearchingAon}
                      className="h-8 text-xs shrink-0 border-purple-500/40 text-purple-300 hover:bg-purple-900/40"
                    >
                      {isSearchingAon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Search'}
                    </Button>
                  </div>

                  {/* Search Results Dropdown / List */}
                  {aonSearchResults.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-border/50 bg-background/95 divide-y divide-border/30 mt-2">
                      {aonSearchResults.map((hit) => (
                        <div
                          key={hit.id}
                          onClick={() => handleSelectAonItem(hit)}
                          className="p-2 hover:bg-purple-900/30 cursor-pointer text-xs flex items-center justify-between gap-2 transition-colors"
                        >
                          <div className="truncate">
                            <span className="font-bold text-foreground">{hit.name}</span>
                            {hit.category && (
                              <span className="text-[10px] text-muted-foreground ml-2 capitalize">
                                ({hit.category})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-amber-300 font-bold">
                            {hit.priceInGP ? `${hit.priceInGP} GP` : hit.priceRaw || '0 GP'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ITEM FIELDS */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Item Name</label>
                  <Input
                    placeholder="Potion of Healing, Wand of Fireballs..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Link (Optional)</label>
                  <Input
                    placeholder="https://2e.aonprd.com/..."
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Value in GP</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={valueGP}
                      onChange={(e) => setValueGP(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Quantity</label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isGood"
                      checked={isGood}
                      onCheckedChange={(val) => setIsGood(Boolean(val))}
                    />
                    <label htmlFor="isGood" className="text-xs font-medium cursor-pointer">
                      Trade Good (Full resale value, unclaimable)
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isPerCharacter"
                      checked={isPerCharacter}
                      onCheckedChange={(val) => setIsPerCharacter(Boolean(val))}
                    />
                    <label htmlFor="isPerCharacter" className="text-xs font-medium cursor-pointer">
                      For <span className="font-bold underline text-primary">EACH</span> character
                    </label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" size="sm" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAdd} className="bg-amber-600 hover:bg-amber-500 font-bold">
                  Add Item
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* VALUE & SHARE STATS BANNER */}
      {calculations && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-card/40 border-border/40">
            <CardContent className="p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Value
              </div>
              <div className="text-lg font-black font-mono text-amber-300 mt-0.5">
                {formatGP(calculations.totalValue)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-border/40">
            <CardContent className="p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Base Share / Player
              </div>
              <div className="text-lg font-black font-mono text-foreground mt-0.5">
                {formatGP(calculations.sharePerPlayer)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-border/40">
            <CardContent className="p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Attending Party
              </div>
              <div className="text-lg font-black font-mono text-purple-300 mt-0.5">
                {session.attendingCharacters.length} Players
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-border/40">
            <CardContent className="p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Crown className="h-3 w-3 text-amber-400" />
                <span>Guildmaster Cut (20%)</span>
              </div>
              <div className="text-lg font-black font-mono text-amber-400 mt-0.5">
                {formatGP(calculations.guildmasterCutValue)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CURRENT USER'S SHARE CARD */}
      {userCharacterInSession && calculations && (
        <Card
          className={cn(
            'border transition-all overflow-hidden',
            session.locked
              ? isClaimed && pendingMoneyAdjustmentGP === 0
                ? 'bg-emerald-950/20 border-emerald-500/30'
                : isClaimed && pendingMoneyAdjustmentGP !== 0
                ? 'bg-amber-950/20 border-amber-500/40'
                : 'bg-purple-950/20 border-purple-500/30'
              : 'bg-primary/5 border-primary/20'
          )}
        >
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider truncate text-left">
                Your Share ({userCharacterInSession.name})
              </span>
              {session.locked && (
                <span
                  className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0',
                    isClaimed && pendingMoneyAdjustmentGP === 0
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : isClaimed && pendingMoneyAdjustmentGP !== 0
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                      : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  )}
                >
                  {isClaimed
                    ? pendingMoneyAdjustmentGP !== 0
                      ? 'Adjustment Needed'
                      : 'On Sheet ✓'
                    : 'Not on Sheet'}
                </span>
              )}
            </div>

            <div
              className={cn(
                'text-2xl font-black font-mono my-1 break-words',
                session.locked && isClaimed && pendingMoneyAdjustmentGP === 0
                  ? 'text-emerald-300'
                  : session.locked && isClaimed && pendingMoneyAdjustmentGP !== 0
                  ? 'text-amber-300'
                  : 'text-primary'
              )}
            >
              {formatGP(calculations.userFinalShare)}
            </div>

            {session.locked && (
              <div className="pt-2 mt-2 border-t border-border/30 flex flex-col gap-2">
                <Button
                  size="sm"
                  disabled={isTogglingClaim}
                  onClick={handleToggleSessionMoneyClaim}
                  className={cn(
                    'w-full h-8 text-xs font-semibold gap-1.5 transition-all shadow-sm',
                    !isClaimed
                      ? 'bg-purple-600 hover:bg-purple-500 text-white'
                      : pendingMoneyAdjustmentGP !== 0
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'border border-emerald-500/40 text-emerald-300 bg-emerald-950/30 hover:bg-emerald-950/50'
                  )}
                  variant={isClaimed && pendingMoneyAdjustmentGP === 0 ? 'outline' : 'default'}
                >
                  {isTogglingClaim ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : isClaimed ? (
                    'Claimed to Sheet ✓'
                  ) : (
                    'Mark Claimed to Sheet'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* LOOT LIST */}
      {loot.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No loot recorded for this session yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2.5">
          {loot.map((item) => {
            const claimedCharacter = session.attendingCharacters.find(
              (c) => c._id === item.claimedBy
            )
            const isClaimedByMe = Boolean(item.claimedBy && userCharacterIds.has(item.claimedBy))
            const resaleValue = item.isGood ? item.valueGP : item.valueGP / 2
            const totalItemValue = item.isPerCharacter
              ? resaleValue * (session.attendingCharacters.length || 1)
              : resaleValue

            return (
              <Card key={item.id} className="bg-card/40 overflow-hidden border-border/40">
                <div className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm truncate">
                        {item.link ? (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline flex items-center gap-1 text-primary"
                          >
                            <span>{item.name}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          item.name
                        )}
                      </h4>
                      {item.isPerCharacter && (
                        <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded uppercase font-bold">
                          Per Character
                        </span>
                      )}
                      {item.isGood ? (
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase font-bold">
                          Good (Full Resale)
                        </span>
                      ) : (
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase font-bold text-muted-foreground">
                          Used (Half Resale)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>Value: {formatGP(item.valueGP)}</span>
                      <span className="opacity-50">|</span>
                      <span>Resale: {formatGP(resaleValue)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.claimedBy ? (
                      <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md border border-border/40">
                        <User
                          className={cn(
                            'h-3 w-3',
                            isClaimedByMe ? 'text-primary' : 'text-muted-foreground'
                          )}
                        />
                        <span
                          className={cn(
                            'text-[10px] font-bold truncate max-w-[80px]',
                            isClaimedByMe ? 'text-primary' : 'text-muted-foreground'
                          )}
                        >
                          {isClaimedByMe ? 'You' : claimedCharacter?.name || 'Claimed'}
                        </span>
                        {(isClaimedByMe || session.canManage) && (
                          <button
                            onClick={() => handleUnclaim(item.id)}
                            className="hover:text-destructive transition-colors ml-0.5"
                            title="Unclaim"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : !item.isGood && userCharacterInSession ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] font-bold px-2 gap-1"
                        onClick={() => handleClaim(item.id, userCharacterInSession._id)}
                      >
                        Claim
                      </Button>
                    ) : null}

                    {session.canManage && (
                      <div className="flex items-center gap-1 border-l pl-2 border-border/40">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingItem(item)
                            setName(item.name)
                            setLink(item.link || '')
                            setValueGP(item.valueGP.toString())
                            setIsGood(item.isGood)
                            setIsPerCharacter(Boolean(item.isPerCharacter))
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* EDIT MODAL */}
      {editingItem && (
        <Dialog open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingItem(null)}>
          <DialogContent className="sm:max-w-md bg-zinc-950 border-purple-500/30">
            <DialogHeader>
              <DialogTitle>Edit Loot Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <label className="font-medium">Item Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
              </div>
              <div className="space-y-1">
                <label className="font-medium">Link</label>
                <Input value={link} onChange={(e) => setLink(e.target.value)} className="h-8" />
              </div>
              <div className="space-y-1">
                <label className="font-medium">Value in GP</label>
                <Input
                  type="number"
                  step="0.01"
                  value={valueGP}
                  onChange={(e) => setValueGP(e.target.value)}
                  className="h-8 font-mono"
                />
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="editIsGood"
                    checked={isGood}
                    onCheckedChange={(val) => setIsGood(Boolean(val))}
                  />
                  <label htmlFor="editIsGood" className="cursor-pointer">
                    Trade Good (Full resale value)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="editIsPerChar"
                    checked={isPerCharacter}
                    onCheckedChange={(val) => setIsPerCharacter(Boolean(val))}
                  />
                  <label htmlFor="editIsPerChar" className="cursor-pointer">
                    For EACH character
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" onClick={handleEdit} className="bg-purple-600 hover:bg-purple-500">
                Update Loot
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* GUILDMASTER CUT ASSIGNMENT BUTTON */}
      {session.canManage && (
        <div className="flex items-center justify-end pt-2 border-t border-border/40">
          <Dialog open={isGuildmasterDialogOpen} onOpenChange={setIsGuildmasterDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
              >
                <Crown className="h-3.5 w-3.5 text-amber-400" />
                <span>
                  {session.guildmasterCutCharacterData ? 'Edit Guildmaster' : 'Assign Guildmaster'}
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-amber-500/30">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-300">
                  <Crown className="h-5 w-5 text-amber-400" />
                  <span>Assign Regional Guildmaster</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-3 text-xs">
                <p className="text-muted-foreground">
                  Assign a Guildmaster (Level 14+) to receive an extra{' '}
                  <strong className="text-amber-300">20% of the total session loot value</strong> from the Guild of the Void.
                </p>
                <div className="space-y-2">
                  <label className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                    Select Guildmaster
                  </label>
                  <select
                    value={selectedGmId}
                    onChange={(e) => setSelectedGmId(e.target.value)}
                    className="w-full bg-muted/40 border border-border/40 text-foreground rounded-md px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">-- None (No Guildmaster assigned) --</option>
                    {guildmasters?.map((gm) => (
                      <option key={gm._id} value={gm._id}>
                        {gm.name} (Lvl {gm.lvl})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  size="sm"
                  onClick={() => handleSetGuildmaster(selectedGmId)}
                  className="bg-amber-600 hover:bg-amber-500 font-bold"
                >
                  Save Guildmaster
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  )
}
