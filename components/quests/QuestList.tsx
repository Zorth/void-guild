'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Scroll, Sword, Trophy, User, Hash, Plus, Pencil, Trash2, 
  ChevronDown, ChevronUp, MapPin, Tag
} from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import QuestDialog from './QuestDialog'
import { toast } from 'sonner'
import { cn, getLevelBadgeStyle } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface QuestListProps {
  worldId?: Id<'worlds'>
  worldOwner?: string
  isSidebar?: boolean
}

export default function QuestList({ worldId, worldOwner, isSidebar = false }: QuestListProps) {
  const { userId } = useAuth()
  const quests = useQuery(api.quests.getQuestsByWorld, { worldId })
  const isAdmin = useQuery(api.sessions.isAdminQuery)
  const deleteQuest = useMutation(api.quests.deleteQuest)
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingQuest, setEditingQuest] = useState<any>(null)
  const [expandedQuestId, setExpandedQuestId] = useState<Id<'quests'> | null>(null)

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

  if (quests === undefined) {
    return <div className="p-4 text-center text-muted-foreground">Loading quests...</div>
  }

  return (
    <div className={cn("flex flex-col gap-4", isSidebar ? "" : "w-full")}>
      <div className="flex items-center justify-between px-1">
        <h3 className={cn("font-bold flex items-center gap-2", isSidebar ? "text-sm" : "text-lg")}>
          <Scroll className={cn("text-primary", isSidebar ? "h-3.5 w-3.5" : "h-5 w-5")} />
          Available Quests
        </h3>
        {!isSidebar && (
            <Button size="sm" onClick={handleCreate} className="h-8 gap-1">
                <Plus className="h-3.5 w-3.5" />
                Post Quest
            </Button>
        )}
      </div>

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

            return (
              <Card 
                key={quest._id} 
                className={cn(
                    "overflow-hidden transition-all border-border/40 hover:border-border/80",
                    isExpanded ? "ring-1 ring-primary/20 bg-muted/10" : "bg-card/50"
                )}
              >
                <div 
                  className="p-3 cursor-pointer flex items-center justify-between gap-3"
                  onClick={() => setExpandedQuestId(isExpanded ? null : quest._id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                        className={cn(
                            "flex items-center justify-center rounded-full font-bold shrink-0",
                            isSidebar ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs"
                        )}
                        style={getLevelBadgeStyle(quest.level)}
                    >
                      {quest.level > 0 ? quest.level : '?'}
                    </div>
                    <div className="min-w-0">
                        <h4 className={cn("font-bold truncate", isSidebar ? "text-xs" : "text-sm")}>{quest.name}</h4>
                        {quest.questgiver && (
                            <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                                <User className="h-2.5 w-2.5" /> {quest.questgiver}
                            </p>
                        )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {canEdit && (
                        <div className="flex items-center gap-1 mr-2" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(quest)}>
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(quest._id)}>
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
                        {quest.description && (
                            <div className="mt-3 text-muted-foreground text-xs leading-relaxed">
                                {quest.description}
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 gap-2 pt-2">
                            {quest.reward && (
                                <div className="flex items-start gap-2 text-[11px]">
                                    <Trophy className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                                    <span><span className="font-bold text-muted-foreground uppercase mr-1">Reward:</span> {quest.reward}</span>
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
        quest={editingQuest}
      />
    </div>
  )
}
