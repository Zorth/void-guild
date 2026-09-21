'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Scroll, Sword, Trophy, User, Hash, Plus, Pencil, Trash2, 
  ChevronDown, ChevronUp, MapPin, Tag, Crown, Check, X, Sparkles, Globe,
  SlidersHorizontal, Eye, EyeOff, RotateCcw
} from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import QuestDialog from './QuestDialog'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, getLevelBadgeStyle, getDualLevelBadgeStyle, CharacterRankIcon } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useState, useMemo } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'

interface QuestListProps {
  worldId?: Id<'worlds'>
  worldOwner?: string
  isSidebar?: boolean
  filters?: { pf: boolean, dnd: boolean }
}

const LEVEL_TIERS = [
  { label: 'Tier 1 (1–4)', min: 1, max: 4 },
  { label: 'Tier 2 (5–10)', min: 5, max: 10 },
  { label: 'Tier 3 (11–16)', min: 11, max: 16 },
  { label: 'Tier 4 (17–20)', min: 17, max: 20 },
]

export default function QuestList({ worldId, worldOwner, isSidebar = false, filters }: QuestListProps) {
  const { userId } = useAuth()
  const questsRaw = useQuery(api.quests.getQuestsByWorld, { worldId })
  const suggestedQuests = useQuery(
    api.quests.getSuggestedQuestsByWorld,
    worldId ? { worldId } : 'skip'
  )
  const isAdmin = useQuery(api.sessions.isAdminQuery)
  const deleteQuest = useMutation(api.quests.deleteQuest)
  const approveSuggestedQuest = useMutation(api.quests.approveSuggestedQuest)
  const rejectSuggestedQuest = useMutation(api.quests.rejectSuggestedQuest)
  const toggleQuestHidden = useMutation(api.quests.toggleQuestHidden)

  const isWorldOwner = userId === worldOwner || !!isAdmin

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingQuest, setEditingQuest] = useState<any>(null)
  const [expandedQuestId, setExpandedQuestId] = useState<Id<'quests'> | null>(null)
  const [minLevel, setMinLevel] = useState<number | ''>('')
  const [maxLevel, setMaxLevel] = useState<number | ''>('')
  const [includeTbd, setIncludeTbd] = useState<boolean>(true)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const isLevelFilterActive = minLevel !== '' || maxLevel !== ''

  const quests = useMemo(() => {
    if (!questsRaw) return undefined;

    return questsRaw.filter(q => {
      const levelPF = q.levelPF ?? (q.levelDnD === undefined ? q.level : undefined);
      const levelDnD = q.levelDnD;

      const hasPF = levelPF !== undefined;
      const hasDnD = levelDnD !== undefined;

      // System filter (if supplied via props)
      if (filters) {
        let systemMatches = false;
        if (filters.pf && hasPF) systemMatches = true;
        if (filters.dnd && hasDnD) systemMatches = true;
        if (!hasPF && !hasDnD) systemMatches = true; // TBD quests always match system filter
        if (!systemMatches) return false;
      }

      // Level range filter
      if (isLevelFilterActive) {
        const levels: number[] = [];
        if (levelPF !== undefined && levelPF > 0) levels.push(levelPF);
        if (levelDnD !== undefined && levelDnD > 0) levels.push(levelDnD);

        const isTbd = levels.length === 0;

        if (isTbd) {
          return includeTbd;
        }

        const min = minLevel !== '' ? Number(minLevel) : 1;
        const max = maxLevel !== '' ? Number(maxLevel) : 20;

        // Matches if any defined system level is within range [min, max]
        const inRange = levels.some(lvl => lvl >= min && lvl <= max);
        if (!inRange) return false;
      }

      return true;
    });
  }, [questsRaw, filters, isLevelFilterActive, minLevel, maxLevel, includeTbd]);

  const handleApproveSuggestion = async (questId: Id<'quests'>) => {
    try {
      await approveSuggestedQuest({ questId })
      toast.success('Suggested quest approved! Now posted to the world board and paid in full by The Void.')
    } catch (error) {
      toast.error('Failed to approve quest')
    }
  }

  const handleRejectSuggestion = async (questId: Id<'quests'>) => {
    try {
      await rejectSuggestedQuest({ questId })
      toast.success('Suggested quest rejected.')
    } catch (error) {
      toast.error('Failed to reject quest')
    }
  }

  const handleToggleHidden = async (questId: Id<'quests'>, currentHidden: boolean) => {
    try {
      await toggleQuestHidden({ questId })
      toast.success(currentHidden ? 'Quest is now visible to everyone' : 'Quest is now hidden from players')
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle quest visibility')
    }
  }

  const handleCreate = () => {
    setEditingQuest(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (quest: any) => {
    setEditingQuest(quest)
    setIsDialogOpen(true)
  }

  const handleDelete = async (questId: Id<'quests'>) => {
    if (confirm('Are you sure you want to delete this quest?')) {
      try {
        await deleteQuest({ questId })
        toast.success('Quest deleted')
      } catch (error) {
        toast.error('Failed to delete quest')
      }
    }
  }

  const clearLevelFilter = () => {
    setMinLevel('')
    setMaxLevel('')
    setIncludeTbd(true)
  }

  const setTierFilter = (min: number, max: number) => {
    if (minLevel === min && maxLevel === max) {
      clearLevelFilter()
    } else {
      setMinLevel(min)
      setMaxLevel(max)
    }
  }

  if (quests === undefined) {
    return <div className="p-4 text-center text-muted-foreground">Loading quests...</div>
  }

  return (
    <div className={cn("flex flex-col gap-4", isSidebar ? "" : "w-full")}>
      <div className="flex items-center justify-between px-1 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className={cn("font-bold flex items-center gap-2", isSidebar ? "text-sm" : "text-lg")}>
            <Scroll className={cn("text-primary", isSidebar ? "h-3.5 w-3.5" : "h-5 w-5")} />
            Available Quests
          </h3>
          {isLevelFilterActive && (
            <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded-full font-semibold">
              Lvl {minLevel !== '' ? minLevel : 1}–{maxLevel !== '' ? maxLevel : 20}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant={isLevelFilterActive ? "secondary" : "outline"} 
                size="sm" 
                className={cn(
                  "h-8 gap-1.5 text-xs px-2.5",
                  isLevelFilterActive && "border-primary/50 text-primary font-bold shadow-xs"
                )}
                title="Filter quests by level range"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className={cn(isSidebar ? "hidden" : "hidden sm:inline")}>Level Filter</span>
                {isLevelFilterActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3 space-y-3 bg-popover/95 backdrop-blur-xs border-border/80 text-xs" align="end">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-bold flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                  Filter by Level Range
                </span>
                {isLevelFilterActive && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearLevelFilter} 
                    className="h-6 text-[10px] px-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-2.5 w-2.5 mr-1" />
                    Reset
                  </Button>
                )}
              </div>

              {/* Quick Preset Tiers */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-medium text-muted-foreground">Presets</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {LEVEL_TIERS.map(tier => {
                    const isSelected = minLevel === tier.min && maxLevel === tier.max
                    return (
                      <Button
                        key={tier.label}
                        type="button"
                        variant={isSelected ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setTierFilter(tier.min, tier.max)}
                        className={cn(
                          "h-7 text-[10px] justify-center px-1.5",
                          isSelected && "border-primary/50 text-primary font-bold bg-primary/15"
                        )}
                      >
                        {tier.label}
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* Custom Min / Max Range */}
              <div className="space-y-1.5 pt-1 border-t">
                <div className="text-[11px] font-medium text-muted-foreground">Custom Range</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] text-muted-foreground">Min Level</label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      placeholder="1"
                      value={minLevel}
                      onChange={(e) => setMinLevel(e.target.value === '' ? '' : Math.max(1, Math.min(20, Number(e.target.value))))}
                      className="h-7 text-xs"
                    />
                  </div>
                  <span className="text-muted-foreground mt-4">–</span>
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] text-muted-foreground">Max Level</label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      placeholder="20"
                      value={maxLevel}
                      onChange={(e) => setMaxLevel(e.target.value === '' ? '' : Math.max(1, Math.min(20, Number(e.target.value))))}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Include TBD Quests checkbox */}
              <div className="flex items-center gap-2 pt-1 border-t">
                <input
                  type="checkbox"
                  id="includeTbdQuests"
                  checked={includeTbd}
                  onChange={(e) => setIncludeTbd(e.target.checked)}
                  className="rounded border-border bg-background h-3.5 w-3.5 text-primary focus:ring-primary"
                />
                <label htmlFor="includeTbdQuests" className="text-[11px] text-muted-foreground cursor-pointer select-none">
                  Include TBD / unranked quests
                </label>
              </div>

              {isLevelFilterActive && (
                <div className="pt-1 flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearLevelFilter} 
                    className="h-6 text-[10px] text-destructive hover:bg-destructive/10"
                  >
                    Clear Filter
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {!isSidebar && (
            <Button size="sm" onClick={handleCreate} className="h-8 gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Post Quest
            </Button>
          )}
        </div>
      </div>

      {/* Suggested Quests from Guildmasters (Visible to World Owner and Admin) */}
      {isWorldOwner && suggestedQuests && suggestedQuests.length > 0 && (
        <Card className="border-amber-500/40 bg-gradient-to-br from-amber-950/30 to-purple-950/20 overflow-hidden">
          <CardHeader className="py-2.5 px-3 border-b border-amber-500/20 bg-amber-500/10 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-amber-300">
              <Crown className="h-4 w-4 text-amber-400" />
              Guildmaster Suggestions ({suggestedQuests.length})
            </CardTitle>
            <span className="text-[10px] bg-amber-400/20 text-amber-300 font-semibold px-2 py-0.5 rounded">
              Paid in Full by The Void if Approved
            </span>
          </CardHeader>
          <CardContent className="p-3 space-y-2.5">
            {suggestedQuests.map((sug: any) => (
              <div
                key={sug._id}
                className="p-2.5 rounded-lg border border-amber-500/30 bg-background/50 space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="font-bold text-foreground text-sm">{sug.name}</h5>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Suggested by Guildmaster: <strong className="text-amber-300">{sug.characterName || 'Guildmaster'}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleApproveSuggestion(sug._id)}
                      className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1 px-2.5"
                    >
                      <Check className="h-3.5 w-3.5" /> Approve (Free)
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRejectSuggestion(sug._id)}
                      className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {sug.description && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                    {sug.description}
                  </p>
                )}

                {sug.reward && (
                  <div className="text-[11px] text-amber-300 font-medium">
                    Proposed Reward: <strong className="font-mono">{sug.reward}</strong>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {quests.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No quests posted here yet. Be the first to post one!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {quests.map((quest) => {
            const isOwner = quest.owner === userId
            const canEdit = isOwner || userId === worldOwner || isAdmin
            const isExpanded = expandedQuestId === quest._id
            const isCharacterQuest = Boolean(quest.characterId)

            const levelPF = quest.levelPF ?? (quest.levelDnD === undefined ? quest.level : undefined)
            const levelDnD = quest.levelDnD
            const isDual = levelPF !== undefined && levelDnD !== undefined

            return (
              <Card 
                key={quest._id} 
                className={cn(
                    "overflow-hidden transition-all border-border/40 hover:border-border/80",
                    isCharacterQuest && "border-purple-500/30 bg-purple-950/10",
                    isExpanded ? "ring-1 ring-primary/20 bg-muted/10" : "bg-card/50"
                )}
              >
                <div 
                  className={cn(
                    "p-3 cursor-pointer flex justify-between gap-3",
                    isExpanded ? "items-start" : "items-center"
                  )}
                  onClick={() => setExpandedQuestId(isExpanded ? null : quest._id)}
                >
                  <div className={cn("flex gap-3 min-w-0 flex-1", isExpanded ? "items-start" : "items-center")}>
                    <div 
                        className={cn(
                            "flex items-center justify-center rounded-full font-bold shrink-0",
                            isSidebar ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs",
                            isExpanded && "mt-0.5"
                        )}
                        style={getDualLevelBadgeStyle(levelPF, levelDnD)}
                    >
                      {isDual ? 'V' : (levelPF ?? levelDnD ?? 0) > 0 ? (levelPF ?? levelDnD) : '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className={cn("font-bold flex items-center gap-1.5 flex-wrap", isSidebar ? "text-xs" : "text-sm", !isExpanded && "truncate")}>
                            <div className="flex items-center shrink-0">
                                {levelPF !== undefined && <img src="/PFVoid.svg" alt="PF" className="h-3 w-3 -mr-0.5" />}
                                {levelDnD !== undefined && <img src="/DnDVoid.svg" alt="DnD" className="h-3 w-3" />}
                            </div>
                            <span 
                              className={cn(isExpanded ? "whitespace-normal break-words" : "truncate")}
                              title={quest.name}
                            >
                              {quest.name}
                            </span>
                            {!quest.worldId && (
                                <span 
                                  className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 shrink-0 shadow-xs"
                                  title="Global Quest (Shared across all worlds)"
                                >
                                    <Globe className="h-2.5 w-2.5 text-blue-400" />
                                    <span className={cn(isSidebar ? "hidden" : "hidden sm:inline")}>Global Quest</span>
                                    <span className={cn(isSidebar ? "inline" : "sm:hidden")}>Global</span>
                                </span>
                            )}
                            {quest.isHidden && (
                                <span 
                                  className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 shadow-xs"
                                  title="Hidden from players (Only visible to world owner & admins)"
                                >
                                    <EyeOff className="h-2.5 w-2.5 text-amber-400" />
                                    <span>Hidden</span>
                                </span>
                            )}
                            {isCharacterQuest && (
                                <span 
                                  className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0 shadow-xs"
                                  title={`Given by Character: ${quest.characterName || quest.questgiver?.replace(/^Character:\s*/, '') || 'Player Character'}`}
                                >
                                    <User className="h-2.5 w-2.5 text-purple-400" />
                                    <span className={cn(isSidebar ? "hidden" : "hidden sm:inline")}>Character Quest</span>
                                    <span className={cn(isSidebar ? "inline" : "sm:hidden")}>PC</span>
                                </span>
                            )}
                        </h4>
                        {(quest.questgiver || quest.characterName || isCharacterQuest) && (
                            <p className={cn("text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5", isExpanded ? "whitespace-normal break-words" : "truncate")}>
                                {isCharacterQuest ? (
                                    <span className={cn("text-purple-400/90 font-medium flex items-center gap-1", isExpanded ? "whitespace-normal break-words" : "truncate")}>
                                        <User className="h-2.5 w-2.5 shrink-0" />
                                        <span>
                                            {quest.characterName 
                                                ? `Character: ${quest.characterName}` 
                                                : (quest.questgiver?.startsWith('Character:') ? quest.questgiver : `Character: ${quest.questgiver || 'Player Character'}`)}
                                        </span>
                                        {quest.characterRank && (
                                            <CharacterRankIcon rank={quest.characterRank} />
                                        )}
                                    </span>
                                ) : (
                                    <>
                                        <User className="h-2.5 w-2.5 shrink-0" />
                                        <span className={cn(isExpanded ? "whitespace-normal break-words" : "truncate")}>{quest.questgiver}</span>
                                    </>
                                )}
                            </p>
                        )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {canEdit && (
                        <div className="flex items-center gap-1 mr-2" onClick={(e) => e.stopPropagation()}>
                            {isWorldOwner && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className={cn(
                                    "h-7 w-7", 
                                    quest.isHidden ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10" : "text-muted-foreground hover:text-foreground"
                                  )} 
                                  onClick={() => handleToggleHidden(quest._id, Boolean(quest.isHidden))}
                                  title={quest.isHidden ? "Unhide quest (make visible to players)" : "Hide quest from players"}
                                >
                                    {quest.isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(quest)} title="Edit quest">
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(quest._id)} title="Delete quest">
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    )}
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-3 pb-4 pt-0 text-sm border-t border-border/20 space-y-3">
                        {isCharacterQuest && (
                            <div className="mt-3 flex items-center gap-2 text-[11px] text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-md px-2.5 py-1.5 flex-wrap">
                                <User className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>Posted by Character:</span>
                                    <strong className="text-purple-200">{quest.characterName || quest.questgiver?.replace(/^Character:\s*/, '') || 'Player Character'}</strong>
                                    {quest.characterRank && <CharacterRankIcon rank={quest.characterRank} />}
                                </div>
                                {quest.isSponsored && (
                                    <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
                                        Guild Sponsored
                                    </span>
                                )}
                            </div>
                        )}

                        {quest.description && (
                            <div className={cn(
                                "mt-3 text-muted-foreground leading-relaxed [&_>_*:first-child]:mt-0 [&>p]:mt-2 [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:mt-2 [&>ol]:list-decimal [&>ol]:pl-4 [&>ol]:mt-2 [&>blockquote]:border-l-2 [&>blockquote]:pl-3 [&>blockquote]:italic [&>blockquote]:mt-2 [&_a]:text-primary [&_a]:underline",
                                isSidebar ? "text-[11px]" : "text-xs"
                            )}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {quest.description}
                                </ReactMarkdown>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 gap-2 pt-2">
                            {quest.reward && (
                                <div className="flex items-start gap-2 text-[11px] flex-wrap">
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Trophy className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                                        <span className="font-bold text-muted-foreground uppercase">Reward:</span>
                                    </div>
                                    <span>{quest.reward}</span>
                                    {quest.rewardType === 'per_person' && (
                                        <span className="text-[9px] uppercase font-bold bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">
                                            Per Person
                                        </span>
                                    )}
                                </div>
                            )}
                            {!quest.worldId && !worldId && (
                                <div className="flex items-start gap-2 text-[11px]">
                                    <MapPin className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                    <span><span className="font-bold text-muted-foreground uppercase mr-1">Location:</span> The Void (Any World)</span>
                                </div>
                            )}
                            {quest.tags && quest.tags.length > 0 && (
                                <div className="flex items-start gap-2 text-[11px]">
                                    <Tag className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                    <div className="flex flex-wrap gap-1">
                                        {quest.tags.map(tag => (
                                            <span key={tag} className="bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {isDual && (
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded text-[10px] font-bold border border-border/10">
                                        <img src="/PFVoid.svg" alt="PF" className="h-3 w-3 mr-0.5" />
                                        <span 
                                            className="inline-flex items-center justify-center rounded-full w-4 h-4 text-[8px]"
                                            style={getLevelBadgeStyle(levelPF)}
                                        >
                                            {levelPF}
                                        </span>
                                        <img src="/DnDVoid.svg" alt="DnD" className="h-3 w-3 ml-1.5 mr-0.5" />
                                        <span 
                                            className="inline-flex items-center justify-center rounded-full w-4 h-4 text-[8px]"
                                            style={getLevelBadgeStyle(levelDnD)}
                                        >
                                            {levelDnD}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            )
          })}
        </div>
      )}

      <QuestDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        worldId={worldId}
        isWorldOwner={isWorldOwner}
        quest={editingQuest}
      />
    </div>
  )
}
