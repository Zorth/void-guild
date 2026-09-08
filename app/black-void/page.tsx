'use client'

import { useState, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import ActiveCharacterSelector from '@/components/black-void/ActiveCharacterSelector'
import ItemListingDialog from '@/components/black-void/ItemListingDialog'
import ServiceListingDialog from '@/components/black-void/ServiceListingDialog'
import BidDialog from '@/components/black-void/BidDialog'
import CharacterQuestDialog from '@/components/black-void/CharacterQuestDialog'
import CharacterSheetLog from '@/components/black-void/CharacterSheetLog'
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
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

export default function BlackVoidPage() {
  const [activeTab, setActiveTab] = useState<'items' | 'services' | 'quests' | 'log'>('items')
  const [selectedCharacterId, setSelectedCharacterId] = useState<Id<'characters'> | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [serviceLevelFilter, setServiceLevelFilter] = useState<string>('')

  // Dialog states
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false)
  const [biddingListing, setBiddingListing] = useState<any>(null)

  // Queries
  const userCharacters = useQuery(api.blackVoid.getUserCharacters)
  const activeItemListings = useQuery(api.blackVoid.getListings, { type: 'item', status: 'active' })
  const activeServiceListings = useQuery(api.blackVoid.getListings, { type: 'service', status: 'active' })
  const characterQuests = useQuery(api.quests.getCharacterQuests, { characterId: selectedCharacterId || undefined })

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
  const filteredItems = (activeItemListings || []).filter((l: any) =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.description && l.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (l.sellerName && l.sellerName.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Filter services
  const targetLevel = serviceLevelFilter.trim() !== '' ? parseInt(serviceLevelFilter, 10) : undefined

  const filteredServices = (activeServiceListings || []).filter((s: any) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.priceDetails && s.priceDetails.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.sellerName && s.sellerName.toLowerCase().includes(searchQuery.toLowerCase()))
    if (!matchesSearch) return false

    if (targetLevel !== undefined && !isNaN(targetLevel)) {
      const minLvl = s.minLevel !== undefined ? s.minLevel : 1
      const maxLvl = s.maxLevel !== undefined ? s.maxLevel : 20
      // Inclusive range check: does the service range contain targetLevel?
      if (targetLevel < minLvl || targetLevel > maxLvl) {
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

        <ActiveCharacterSelector
          selectedCharacterId={selectedCharacterId}
          onSelectCharacter={handleSelectCharacter}
        />
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
        </div>

        {/* Action Button and Filters depending on active tab */}
        <div className="flex flex-wrap items-center gap-3">
          {activeTab === 'services' && (
            <div className="flex items-center gap-1.5 bg-muted/20 border border-amber-500/20 rounded-lg p-1">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 px-1.5">
                <Filter className="h-3 w-3 text-amber-400" />
                Level:
              </span>
              <Input
                type="number"
                min={1}
                max={20}
                placeholder="1–20"
                value={serviceLevelFilter}
                onChange={(e) => setServiceLevelFilter(e.target.value)}
                className="w-16 h-7 text-xs bg-background/80 px-2 text-center"
              />
              {serviceLevelFilter && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setServiceLevelFilter('')}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  title="Clear level filter"
                >
                  <X className="h-3.5 w-3.5" />
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
          {filteredItems.length === 0 ? (
            <Card className="border-dashed bg-muted/20 text-center py-16">
              <CardContent className="space-y-3">
                <Coins className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                <p className="text-muted-foreground text-sm">
                  No active item listings matching your filter.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item: any) => {
                const currentBid = item.winningAmount || item.startingBid || 0
                const daysLeft = item.expiresAt
                  ? Math.max(0, Math.ceil((item.expiresAt - Date.now()) / 86400000))
                  : 0

                return (
                  <Card
                    key={item._id}
                    className="border-purple-500/20 bg-card/60 hover:border-purple-500/60 transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <h3 className="font-bold text-base text-foreground truncate group-hover:text-purple-300 transition-colors">
                            {item.name}
                          </h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3 text-purple-400 shrink-0" />
                            Seller: <span className="font-semibold text-purple-300">{item.sellerName}</span> (Lvl {item.sellerLevel})
                          </p>
                        </div>
                        {item.nethysUrl && (
                          <a
                            href={item.nethysUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded shrink-0"
                            title="View on Archives of Nethys"
                          >
                            AoN <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/20 text-xs">
                        <div className="bg-purple-950/40 border border-purple-500/20 p-2 rounded">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                            {item.winningAmount ? 'Current Bid' : item.startingBid ? 'Starting Bid' : 'No Starting Bid'}
                          </span>
                          <span className="font-bold text-amber-400 font-mono text-sm">
                            {currentBid > 0 ? `${currentBid} GP` : 'Open'}
                          </span>
                        </div>

                        <div className="bg-emerald-950/40 border border-emerald-500/20 p-2 rounded">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                            Buyout Price
                          </span>
                          <span className="font-bold text-emerald-400 font-mono text-sm">
                            {item.buyoutPrice ? `${item.buyoutPrice} GP` : 'No Buyout'}
                          </span>
                        </div>
                      </div>

                      {selectedCharacterId && item.winningBidderCharacterId === selectedCharacterId && (
                        <div className="text-[11px] font-semibold text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded border border-purple-500/30 flex items-center justify-between">
                          <span>You are Top Bidder</span>
                          {item.maxAutoBid && (
                            <span className="font-mono text-purple-400 text-[10px]">
                              Auto-Cap: {item.maxAutoBid} GP
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-muted/30 border-t border-border/20 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 text-purple-400" />
                        <span>{daysLeft} {daysLeft === 1 ? 'day' : 'days'} left</span>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => setBiddingListing(item)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-8 px-3"
                      >
                        Bid / Buyout
                      </Button>
                    </div>
                  </Card>
                )
              })}
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

                  <div className="p-3 bg-muted/30 border-t border-border/20 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Service Level:{' '}
                      <strong className="text-amber-300">
                        {svc.minLevel ? `Lvl ${svc.minLevel} - ${svc.maxLevel ?? 'Any'}` : `Up to Lvl ${svc.maxLevel ?? 'Any'}`}
                      </strong>
                    </span>
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
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-foreground">{q.name}</h3>
                        {q.isCompleted && (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Completed in Session
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        World: <strong className="text-blue-300">{q.worldName}</strong> | Issued by:{' '}
                        <strong className="text-purple-300">{q.characterName || q.questgiver || 'Character'}</strong>
                      </p>
                    </div>
                  </div>

                  {q.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {q.description}
                    </p>
                  )}

                  {q.reward && (
                    <div className="text-xs font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                      Reward: {q.reward}
                    </div>
                  )}
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

      {/* Dialog Modals */}
      <ItemListingDialog
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        characterId={selectedCharacterId}
      />

      <ServiceListingDialog
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        characterId={selectedCharacterId}
        characterLevel={selectedChar?.lvl || 1}
      />

      <BidDialog
        isOpen={!!biddingListing}
        onClose={() => setBiddingListing(null)}
        listing={biddingListing}
        characterId={selectedCharacterId}
      />

      <CharacterQuestDialog
        isOpen={isQuestModalOpen}
        onClose={() => setIsQuestModalOpen(false)}
        characterId={selectedCharacterId}
        characterName={selectedChar?.name}
      />
    </div>
  )
}
