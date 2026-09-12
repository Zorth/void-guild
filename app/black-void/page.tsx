'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { toast } from 'sonner'
import ActiveCharacterSelector from '@/components/black-void/ActiveCharacterSelector'
import ItemListingDialog from '@/components/black-void/ItemListingDialog'
import ServiceListingDialog from '@/components/black-void/ServiceListingDialog'
import BidDialog from '@/components/black-void/BidDialog'
import CharacterQuestDialog from '@/components/black-void/CharacterQuestDialog'
import CharacterSheetLog from '@/components/black-void/CharacterSheetLog'
import BettingTab from '@/components/black-void/BettingTab'
import SendBetDialog from '@/components/black-void/SendBetDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Coins,
  PackagePlus,
  Hammer,
  Scroll,
  Receipt,
  Search,
  ExternalLink,
  Zap,
  Clock,
  User,
  Plus,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  Filter,
  X,
  ChevronLeft,
  Edit2,
  Trash2,
  Dices,
  Layers,
} from 'lucide-react'
import Link from 'next/link'
import { cn, CharacterRankIcon } from '@/lib/utils'
import { motion } from 'framer-motion'

export default function BlackVoidPage() {
  const [activeTab, setActiveTab] = useState<'items' | 'services' | 'quests' | 'log' | 'gambling'>('items')
  const [selectedCharacterId, setSelectedCharacterId] = useState<Id<'characters'> | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [serviceLevelFilter, setServiceLevelFilter] = useState<number | null>(null)
  const [itemLevelFilter, setItemLevelFilter] = useState<number | null>(null)
  const [itemMaxPriceFilter, setItemMaxPriceFilter] = useState<string>('')

  // Dialog states
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<any | null>(null)
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false)
  const [biddingListing, setBiddingListing] = useState<any>(null)
  const [isSendBetOpen, setIsSendBetOpen] = useState(false)

  // Mutations
  const deleteServiceListing = useMutation(api.blackVoid.deleteServiceListing)

  // Queries
  const userCharacters = useQuery(api.blackVoid.getUserCharacters, {system: 'PF'})
  const activeItemListings = useQuery(api.blackVoid.getListings, { type: 'item', status: 'active' })
  const activeServiceListings = useQuery(api.blackVoid.getListings, { type: 'service', status: 'active' })
  const characterQuests = useQuery(api.quests.getCharacterQuests, { characterId: selectedCharacterId || undefined })
  const bettingData = useQuery(api.blackVoidBets.getBettingData, { characterId: selectedCharacterId || undefined })

  // Auto-select initial character
  useEffect(() => {
    if (userCharacters && userCharacters.length > 0 && !selectedCharacterId) {
      const savedId = localStorage.getItem('black_void_active_character_id') as Id<'characters'>
      const exists = userCharacters.find((c: any) => c._id === savedId)
      if (exists) {
        setSelectedCharacterId(savedId)
      } else {
        setSelectedCharacterId(userCharacters[0]._id)
      }
    }
  }, [userCharacters, selectedCharacterId])

  const handleSelectCharacter = (id: Id<'characters'>) => {
    setSelectedCharacterId(id)
    localStorage.setItem('black_void_active_character_id', id)
  }

  const selectedChar = userCharacters?.find((c: any) => c._id === selectedCharacterId)

  // Filter items
  const parsedMaxPrice = itemMaxPriceFilter.trim() !== '' ? parseFloat(itemMaxPriceFilter) : null

  const filteredItems = (activeItemListings || []).filter((l: any) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.description && l.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.sellerName && l.sellerName.toLowerCase().includes(searchQuery.toLowerCase()))
    if (!matchesSearch) return false

    // Level filter (seller's character level)
    if (itemLevelFilter !== null) {
      const sLevel = l.sellerLevel ?? 1
      if (sLevel !== itemLevelFilter) return false
    }

    // Price filter (effective price: current bid or buyout or starting bid)
    if (parsedMaxPrice !== null && !isNaN(parsedMaxPrice)) {
      const currentPrice = l.winningAmount || l.startingBid || l.buyoutPrice || 0
      if (currentPrice > parsedMaxPrice) return false
    }

    return true
  })

  // Count how many active listings share each item name (case-insensitive)
  const itemNameCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of (activeItemListings || [])) {
      const key = (item as any).name.toLowerCase()
      counts[key] = (counts[key] || 0) + 1
    }
    return counts
  }, [activeItemListings])

  // Sort: group same-named items together, cheapest effective price first within each group
  const getEffectivePrice = (item: any) => item.winningAmount || item.buyoutPrice || item.startingBid || 0

  const sortedFilteredItems = useMemo(() => {
    return [...filteredItems].sort((a: any, b: any) => {
      const nameA = a.name.toLowerCase()
      const nameB = b.name.toLowerCase()
      if (nameA !== nameB) return nameA.localeCompare(nameB)
      return getEffectivePrice(a) - getEffectivePrice(b)
    })
  }, [filteredItems])

  // Group filtered items by normalized name for the minimalistic table layout
  const groupedItemData = useMemo(() => {
    const groupsMap = new Map<string, { name: string; nethysUrl?: string; minPrice: number; listings: any[] }>()

    for (const item of sortedFilteredItems) {
      const key = item.name.trim().toLowerCase()
      const effectivePrice = item.buyoutPrice || item.winningAmount || item.startingBid || 0

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          name: item.name.trim(),
          nethysUrl: item.nethysUrl,
          minPrice: effectivePrice,
          listings: [item],
        })
      } else {
        const grp = groupsMap.get(key)!
        if (!grp.nethysUrl && item.nethysUrl) {
          grp.nethysUrl = item.nethysUrl
        }
        if (effectivePrice > 0 && (grp.minPrice === 0 || effectivePrice < grp.minPrice)) {
          grp.minPrice = effectivePrice
        }
        grp.listings.push(item)
      }
    }

    return Array.from(groupsMap.values())
  }, [sortedFilteredItems])

  // Filter services
  const filteredServices = (activeServiceListings || []).filter((s: any) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.priceDetails && s.priceDetails.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.sellerName && s.sellerName.toLowerCase().includes(searchQuery.toLowerCase()))
    if (!matchesSearch) return false

    if (serviceLevelFilter !== null) {
      const minLvl = s.minLevel !== undefined ? s.minLevel : 1
      const maxLvl = s.maxLevel !== undefined ? s.maxLevel : 20
      // Inclusive range check: does the service range contain serviceLevelFilter?
      if (serviceLevelFilter < minLvl || serviceLevelFilter > maxLvl) {
        return false
      }
    }

    return true
  })

  return (
    <div className="min-h-screen bg-background text-foreground py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Compact Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-950 via-purple-950/60 to-slate-950 border border-purple-500/20 px-4 py-3.5 sm:px-5 sm:py-4 shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" className="h-8 px-2 sm:px-3 text-xs text-muted-foreground hover:text-white hover:bg-purple-900/30 border border-purple-500/20" asChild>
            <Link href="/">
              <ChevronLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Back</span>
            </Link>
          </Button>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-amber-200 to-purple-400">
              The Black Void
            </span>
          </h1>
          <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
            <Coins className="h-3 w-3 text-amber-400" />
            0% Tax
          </span>
          <span className="text-xs text-muted-foreground hidden lg:inline border-l border-border/40 pl-3">
            Tax-free contraband auction house & crafting market of the Void.
          </span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {selectedChar?.money && (
            <div
              className="h-11 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-2 shadow-md shrink-0"
              title={`Purse breakdown: ${selectedChar.money.pp}pp, ${selectedChar.money.gp}gp, ${selectedChar.money.sp}sp, ${selectedChar.money.cp}cp`}
            >
              <div className="p-1 rounded-md bg-amber-500/20 text-amber-400">
                <Coins className="h-4 w-4" />
              </div>
              <div className="flex flex-col text-left leading-none">
                <span className="text-[10px] uppercase font-bold text-amber-200/70 tracking-wider">
                  Purse
                </span>
                <span className="text-xs sm:text-sm font-bold font-mono text-amber-300">
                  {selectedChar.money.totalInGold % 1 === 0
                    ? selectedChar.money.totalInGold.toLocaleString()
                    : selectedChar.money.totalInGold.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}{' '}
                  GP
                </span>
              </div>
            </div>
          )}

          <ActiveCharacterSelector
            selectedCharacterId={selectedCharacterId}
            onSelectCharacter={handleSelectCharacter}
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <Button
            variant={activeTab === 'items' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('items')}
            className={cn(
              "gap-2 text-xs font-bold h-9 px-4 rounded-lg transition-all",
              activeTab === 'items' && "bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20"
            )}
          >
            <Coins className="h-4 w-4" />
            Auction House
            {activeItemListings && activeItemListings.length > 0 && (
              <span className="ml-1 bg-purple-950 px-1.5 py-0.5 rounded text-[10px] text-purple-200 font-mono">
                {activeItemListings.length}
              </span>
            )}
          </Button>

          <Button
            variant={activeTab === 'services' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('services')}
            className={cn(
              "gap-2 text-xs font-bold h-9 px-4 rounded-lg transition-all",
              activeTab === 'services' && "bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20"
            )}
          >
            <Hammer className="h-4 w-4" />
            Crafting & Services
            {activeServiceListings && activeServiceListings.length > 0 && (
              <span className="ml-1 bg-amber-950 px-1.5 py-0.5 rounded text-[10px] text-amber-200 font-mono">
                {activeServiceListings.length}
              </span>
            )}
          </Button>

          <Button
            variant={activeTab === 'quests' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('quests')}
            className={cn(
              "gap-2 text-xs font-bold h-9 px-4 rounded-lg transition-all",
              activeTab === 'quests' && "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
            )}
          >
            <Scroll className="h-4 w-4" />
            Character Quests
          </Button>

          <Button
            variant={activeTab === 'log' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('log')}
            className={cn(
              "gap-2 text-xs font-bold h-9 px-4 rounded-lg transition-all",
              activeTab === 'log' && "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
            )}
          >
            <Receipt className="h-4 w-4" />
            Character Sheet Log
          </Button>

          <Button
            variant={activeTab === 'gambling' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('gambling')}
            className={cn(
              "gap-2 text-xs font-bold h-9 px-4 rounded-lg transition-all",
              activeTab === 'gambling' && "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20"
            )}
          >
            <Dices className="h-4 w-4" />
            Betting
            {bettingData && (bettingData.activeMatches.length > 0 || bettingData.receivedInvitations.length > 0) && (
              <span className="ml-1 bg-rose-950 px-1.5 py-0.5 rounded text-[10px] text-rose-200 font-mono font-bold animate-pulse">
                {bettingData.activeMatches.length + bettingData.receivedInvitations.length}
              </span>
            )}
          </Button>
        </div>

        {/* Action Button and Filters depending on active tab */}
        <div className="flex flex-wrap items-center gap-3">
          {activeTab === 'items' && (
            <>
              {/* Items Level Slider */}
              <div className="flex items-center gap-2 bg-muted/20 border border-purple-500/20 rounded-lg px-2.5 py-1">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Filter className="h-3 w-3 text-purple-400" />
                  Lvl:
                </span>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={itemLevelFilter ?? 1}
                  onChange={(e) => setItemLevelFilter(parseInt(e.target.value))}
                  className="w-20 accent-purple-500 cursor-pointer h-1.5"
                />
                <span className="text-[11px] font-mono font-bold text-purple-300 min-w-[38px]">
                  {itemLevelFilter !== null ? `Lvl ${itemLevelFilter}` : 'Any'}
                </span>
                {itemLevelFilter !== null && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setItemLevelFilter(null)}
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    title="Clear level filter"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Items Price Filter */}
              <div className="flex items-center gap-1.5 bg-muted/20 border border-purple-500/20 rounded-lg px-2.5 py-1">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Coins className="h-3 w-3 text-amber-400" />
                  Max GP:
                </span>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  placeholder="Any"
                  value={itemMaxPriceFilter}
                  onChange={(e) => setItemMaxPriceFilter(e.target.value)}
                  className="w-20 h-7 text-xs bg-background/80 px-2 font-mono text-amber-300"
                />
                {itemMaxPriceFilter !== '' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setItemMaxPriceFilter('')}
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    title="Clear price filter"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </>
          )}

          {activeTab === 'services' && (
            <div className="flex items-center gap-2 bg-muted/20 border border-amber-500/20 rounded-lg px-2.5 py-1">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Filter className="h-3 w-3 text-amber-400" />
                Lvl:
              </span>
              <input
                type="range"
                min={1}
                max={20}
                value={serviceLevelFilter ?? 1}
                onChange={(e) => setServiceLevelFilter(parseInt(e.target.value))}
                className="w-20 accent-amber-500 cursor-pointer h-1.5"
              />
              <span className="text-[11px] font-mono font-bold text-amber-300 min-w-[38px]">
                {serviceLevelFilter !== null ? `Lvl ${serviceLevelFilter}` : 'Any'}
              </span>
              {serviceLevelFilter !== null && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setServiceLevelFilter(null)}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  title="Clear level filter"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}

          {(activeTab === 'items' || activeTab === 'services') && (
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search market..."
                className="pl-9 h-9 text-xs bg-muted/30 border-border/40 focus:border-purple-500"
              />
            </div>
          )}

          {activeTab === 'items' && (
            <Button
              onClick={() => setIsItemModalOpen(true)}
              disabled={!selectedCharacterId}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-9 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              List Item
            </Button>
          )}

          {activeTab === 'services' && (
            <Button
              onClick={() => setIsServiceModalOpen(true)}
              disabled={!selectedCharacterId}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-9 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Offer Service
            </Button>
          )}

          {activeTab === 'quests' && (
            <Button
              onClick={() => setIsQuestModalOpen(true)}
              disabled={!selectedCharacterId}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Issue Character Quest
            </Button>
          )}
        </div>
      </div>

      {/* TAB 1: AUCTION HOUSE ITEMS */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {groupedItemData.length === 0 ? (
            <Card className="border-dashed bg-muted/20 text-center py-16">
              <CardContent className="space-y-3">
                <Coins className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                <p className="text-muted-foreground text-sm">
                  No active item listings matching your filter.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {groupedItemData.map((group) => (
                <div
                  key={group.name}
                  className="rounded-xl border border-purple-500/20 bg-slate-950/40 overflow-hidden shadow-md"
                >
                  {/* Group Header */}
                  <div className="bg-purple-950/30 px-4 py-2.5 border-b border-purple-500/20 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                        {group.name}
                        {group.listings.length > 1 && (
                          <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {group.listings.length} listings
                          </span>
                        )}
                      </h3>
                      {group.nethysUrl && (
                        <a
                          href={group.nethysUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded"
                          title="View on Archives of Nethys"
                        >
                          AoN <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {group.minPrice > 0 && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
                        <span>Starting from:</span>
                        <span className="font-bold text-emerald-400">{group.minPrice} GP</span>
                      </div>
                    )}
                  </div>

                  {/* Listings Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/10 text-muted-foreground text-[10px] uppercase font-bold tracking-wider border-b border-border/20">
                        <tr>
                          <th className="px-4 py-2.5 min-w-[140px]">Seller</th>
                          <th className="px-4 py-2.5 min-w-[180px]">Details</th>
                          <th className="px-4 py-2.5 min-w-[110px]">Current Bid</th>
                          <th className="px-4 py-2.5 min-w-[110px]">Buyout Price</th>
                          <th className="px-4 py-2.5 min-w-[100px]">Time Left</th>
                          <th className="px-4 py-2.5 text-right min-w-[120px]">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/10">
                        {group.listings.map((item: any) => {
                          const currentBid = item.winningAmount || item.startingBid || 0
                          const daysLeft = item.expiresAt
                            ? Math.max(0, Math.ceil((item.expiresAt - Date.now()) / 86400000))
                            : 0
                          const isOwnItem = userCharacters?.some((c: any) => c._id === item.characterId)
                          const isTopBidder = selectedCharacterId && item.winningBidderCharacterId === selectedCharacterId

                          return (
                            <tr key={item._id} className="hover:bg-purple-500/5 transition-colors">
                              {/* Seller */}
                              <td className="px-4 py-3 align-middle font-medium">
                                <div className="flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                                  <span className="text-purple-300 font-semibold">{item.sellerName}</span>
                                  <span className="text-[10px] text-muted-foreground">(Lvl {item.sellerLevel})</span>
                                </div>
                              </td>

                              {/* Details / Notes */}
                              <td className="px-4 py-3 align-middle">
                                <div className="space-y-1 max-w-xs">
                                  {item.description ? (
                                    <p className="text-muted-foreground line-clamp-1 text-[11px] leading-normal" title={item.description}>
                                      {item.description}
                                    </p>
                                  ) : (
                                    <span className="text-muted-foreground/40 italic text-[10px]">No notes</span>
                                  )}
                                  {isTopBidder && (
                                    <div className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded border border-purple-500/30">
                                      <span>Top Bidder</span>
                                      {item.maxAutoBid && <span>(Cap: {item.maxAutoBid} GP)</span>}
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Current Bid */}
                              <td className="px-4 py-3 align-middle font-mono">
                                <span className={currentBid > 0 ? "font-bold text-amber-400" : "text-muted-foreground/60 italic"}>
                                  {currentBid > 0 ? `${currentBid} GP` : 'Open'}
                                </span>
                              </td>

                              {/* Buyout */}
                              <td className="px-4 py-3 align-middle font-mono">
                                <span className={item.buyoutPrice ? "font-bold text-emerald-400" : "text-muted-foreground/60 italic"}>
                                  {item.buyoutPrice ? `${item.buyoutPrice} GP` : '—'}
                                </span>
                              </td>

                              {/* Time Left */}
                              <td className="px-4 py-3 align-middle text-muted-foreground whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-purple-400 shrink-0" />
                                  <span>{daysLeft} {daysLeft === 1 ? 'day' : 'days'}</span>
                                </div>
                              </td>

                              {/* Action */}
                              <td className="px-4 py-3 align-middle text-right">
                                {isOwnItem ? (
                                  <span className="text-[11px] text-muted-foreground italic">Your Listing</span>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => setBiddingListing(item)}
                                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-7 px-3"
                                  >
                                    Bid / Buyout
                                  </Button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CRAFTING & SERVICES */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          {filteredServices.length === 0 ? (
            <Card className="border-dashed bg-muted/20 text-center py-16">
              <CardContent className="space-y-3">
                <Hammer className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                <p className="text-muted-foreground text-sm">
                  No active crafting or service listings matching your search.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map((svc: any) => (
                <Card
                  key={svc._id}
                  className="border-amber-500/30 bg-card/60 hover:border-amber-500/60 transition-all flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-0.5">
                        <h3 className="font-bold text-base text-foreground text-amber-200">
                          {svc.name}
                        </h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3 text-amber-400 shrink-0" />
                          Craftsman: <span className="font-semibold text-amber-300">{svc.sellerName}</span> (Lvl {svc.sellerLevel})
                        </p>
                      </div>
                      {svc.nethysUrl && (
                        <a
                          href={svc.nethysUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded shrink-0"
                        >
                          AoN <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    <div className="p-2.5 rounded bg-amber-950/30 border border-amber-500/20 space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                        Pricing Details
                      </span>
                      <p className="text-sm font-bold text-amber-300 font-mono">
                        {svc.priceDetails || 'Custom Fee'}
                      </p>
                    </div>

                    {svc.description && (
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {svc.description}
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-muted/30 border-t border-border/20 flex items-center justify-between text-xs gap-2">
                    <span className="text-muted-foreground">
                      Service Level:{' '}
                      <strong className="text-amber-300">
                        {svc.minLevel ? `Lvl ${svc.minLevel} - ${svc.maxLevel ?? 'Any'}` : `Up to Lvl ${svc.maxLevel ?? 'Any'}`}
                      </strong>
                    </span>

                    {userCharacters?.some((c: any) => c._id === svc.characterId) && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 border border-amber-500/30 gap-1"
                          onClick={() => {
                            setEditingService(svc)
                            setIsServiceModalOpen(true)
                          }}
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
                                characterId: svc.characterId,
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
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CHARACTER QUESTS */}
      {activeTab === 'quests' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-blue-300 flex items-center gap-2">
            <Scroll className="h-5 w-5 text-blue-400" />
            Character Issued Quests
          </h2>

          {characterQuests === undefined ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Loading quests...</div>
          ) : characterQuests.length === 0 ? (
            <Card className="border-dashed bg-muted/20 text-center py-16">
              <CardContent className="space-y-3">
                <Scroll className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                <p className="text-muted-foreground text-sm">
                  No character quests posted yet. Post a quest linked to a world for other players to undertake!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {characterQuests.map((q: any) => (
                <Card
                  key={q._id}
                  className={cn(
                    "border transition-all p-4 space-y-3",
                    q.isCompleted
                      ? "bg-emerald-950/20 border-emerald-500/40"
                      : "bg-card/60 border-blue-500/30"
                  )}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-foreground">{q.name}</h3>
                        {q.isCompleted && (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Completed in Session
                          </span>
                        )}
                        {q.isSponsored && (
                          <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-purple-400" />
                            20% Guild Sponsored
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span>
                          World: <strong className="text-blue-300">{q.worldName}</strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          Issued by:
                          <CharacterRankIcon rank={q.characterRank} className="h-3.5 w-3.5 inline" />
                          <strong className="text-purple-300">{q.characterName || q.questgiver || 'Character'}</strong>
                          {q.characterRank && q.characterRank !== 'none' && (
                            <span className="capitalize text-[10px] font-semibold text-purple-400">
                              ({q.characterRank})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-xs font-mono font-bold">
                      {q.levelPF !== undefined && q.levelPF !== null && (
                        <span className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded border border-border/40 text-foreground">
                          <img src="/PFVoid.svg" alt="PF" className="h-3 w-3" />
                          {q.levelPF === 0 ? 'TBD' : `Lvl ${q.levelPF}`}
                        </span>
                      )}
                      {q.levelDnD !== undefined && q.levelDnD !== null && (
                        <span className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded border border-border/40 text-foreground">
                          <img src="/DnDVoid.svg" alt="DnD" className="h-3 w-3" />
                          {q.levelDnD === 0 ? 'TBD' : `Lvl ${q.levelDnD}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {q.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {q.description}
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 flex-wrap">
                    {q.reward ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="text-xs font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                          Reward: {q.reward}
                        </div>
                        {q.rewardType === 'per_person' && (
                          <span className="text-[10px] uppercase font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                            Per Person
                          </span>
                        )}
                      </div>
                    ) : <div />}

                    {q.isSponsored && (
                      <div className="flex items-center gap-2 flex-wrap text-[11px]">
                        <div className="font-medium text-emerald-300 bg-emerald-950/30 px-2.5 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-emerald-400" />
                          Payback: <strong>{q.sponsoredAmount || '20% (1/5th)'}</strong>
                        </div>
                        {q.netCost && (
                          <div className="font-medium text-purple-300 bg-purple-950/40 px-2.5 py-0.5 rounded border border-purple-500/40">
                            Net Cost: <strong>{q.netCost}</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CHARACTER SHEET LOG */}
      {activeTab === 'log' && (
        <CharacterSheetLog characterId={selectedCharacterId} />
      )}

      {/* TAB 5: BETTING */}
      {activeTab === 'gambling' && (
        <BettingTab
          characterId={selectedCharacterId}
          selectedChar={selectedChar}
          characterWealth={selectedChar?.money || null}
          onOpenSendBet={() => setIsSendBetOpen(true)}
        />
      )}

      {/* Dialog Modals */}
      <ItemListingDialog
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        characterId={selectedCharacterId}
        onSelectCharacter={handleSelectCharacter}
      />

      <ServiceListingDialog
        isOpen={isServiceModalOpen}
        onClose={() => {
          setIsServiceModalOpen(false)
          setEditingService(null)
        }}
        characterId={editingService?.characterId || selectedCharacterId}
        characterLevel={selectedChar?.lvl || 1}
        editingService={editingService}
        onSelectCharacter={handleSelectCharacter}
      />

      <BidDialog
        isOpen={!!biddingListing}
        onClose={() => setBiddingListing(null)}
        listing={biddingListing}
        characterId={selectedCharacterId}
        characterName={selectedChar?.name}
        characterWealth={selectedChar?.money || null}
        onSelectCharacter={handleSelectCharacter}
      />

      <CharacterQuestDialog
        isOpen={isQuestModalOpen}
        onClose={() => setIsQuestModalOpen(false)}
        characterId={selectedCharacterId}
        characterName={selectedChar?.name}
        characterRank={selectedChar?.rank || 'none'}
        characterLevel={selectedChar?.lvl || 1}
      />

      {selectedCharacterId && (
        <SendBetDialog
          isOpen={isSendBetOpen}
          onClose={() => setIsSendBetOpen(false)}
          senderCharacterId={selectedCharacterId}
          senderName={selectedChar?.name}
          characterWealth={selectedChar?.money || null}
          availableOpponents={bettingData?.availableOpponents || []}
        />
      )}
    </div>
  )
}
