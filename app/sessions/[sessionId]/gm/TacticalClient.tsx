'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id, Doc } from '@/convex/_generated/dataModel'
import { 
  ChevronLeft, Pencil, Check, Plus, Trash2, Eye, Shield, Heart,
  ExternalLink, Search, RefreshCw, AlertCircle, Sparkles, User, Sword,
  Copy, GripVertical, PlusCircle, Minus, X, ShieldAlert, Skull,
  CalendarDays, Users as UsersIcon, Swords
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import CharacterPartyTab from '@/components/sessions/CharacterPartyTab'
import TacticalCalendarTab from '@/components/sessions/TacticalCalendarTab'

// Monster interface
export interface MonsterInstance {
  id: string
  name: string
  currentHp: number
  maxHp: number
  ac: number
  nethysUrl?: string
  immunities?: string
  resistances?: string
  weaknesses?: string
}

// Monster Group interface
export interface MonsterGroup {
  id: string
  name: string
  initiative: number
  monsters: MonsterInstance[]
}

// Combat Encounter interface for preparing combats
export interface CombatEncounter {
  id: string
  name: string
  monsterGroups: MonsterGroup[]
}

// Tactical local state interface
interface TacticalLocalState {
  // Array of 11 slots: 0-2 (top), 3-6 (left flank with corner seat), 7-10 (right flank with corner seat)
  // Value is characterId or null
  tableSlots: (string | null)[]
  // Initiative overrides for character IDs
  characterInitiatives: Record<string, number>
  // Active encounter tab ID
  activeCombatId: string
  // List of combat encounters
  combats: CombatEncounter[]
  // Legacy support for backward compatibility:
  monsterGroups?: MonsterGroup[]
  // Active turn ID (character ID or monster group ID)
  activeTurnId?: string | null
}

export interface TurnCombatant {
  id: string
  name: string
  type: 'character' | 'monsterGroup'
  initiative: number
  characterId?: string
  groupId?: string
}

const TOTAL_SLOTS = 11 // 3 on top, 4 on left flank, 4 on right flank (corner seats included)

export default function TacticalClient({ sessionId }: { sessionId: string }) {
  const session = useQuery(api.sessions.getSession, { sessionId })
  const isAdmin = useQuery(api.sessions.isAdminQuery)
  const updatePerceptionMutation = useMutation(api.characters.updateCharacterPerception)

  // Character perceptions
  const attendingCharacters = useMemo(() => {
    return session?.attendingCharacters || []
  }, [session?.attendingCharacters])

  const attendingCharIds = useMemo(() => {
    return attendingCharacters.map((c) => c._id)
  }, [attendingCharacters])

  // User characters for claiming loot in party tab
  const userCharacters = useQuery(api.characters.listCharacters)
  const userCharacterIds = useMemo(() => {
    return new Set(userCharacters?.map((c) => c._id) || [])
  }, [userCharacters])

  const perceptions = useQuery(
    api.characters.getCharacterPerceptions,
    attendingCharIds.length > 0 ? { characterIds: attendingCharIds } : 'skip'
  )

  // Character party details (full stats: HP, AC, abilities, saves, skills)
  const partyDetails = useQuery(
    api.characters.getPartyCharacterDetails,
    attendingCharIds.length > 0 ? { characterIds: attendingCharIds } : 'skip'
  ) || {}

  // Main View Tabs: Combat | Party | Calendar
  const [activeMainTab, setActiveMainTab] = useState<'combat' | 'party' | 'calendar'>('combat')

  const usersMetadataRaw = useQuery(api.users.getUsersByIds, {
    userIds: Array.from(new Set(attendingCharacters.map((c) => c.userId))),
  })

  const usersMap = useMemo(() => {
    const map: Record<string, string> = {}
    if (usersMetadataRaw) {
      usersMetadataRaw.forEach((u) => {
        map[u.userId] = u.name || u.username || `User ${u.userId.slice(-4)}`
      })
    }
    return map
  }, [usersMetadataRaw])

  // --- Local Storage Management ---
  const storageKey = `void_tactical_${sessionId}`

  const [tacticalState, setTacticalState] = useState<TacticalLocalState>({
    tableSlots: Array(TOTAL_SLOTS).fill(null),
    characterInitiatives: {},
    activeCombatId: 'encounter-1',
    combats: [
      {
        id: 'encounter-1',
        name: 'Encounter 1',
        monsterGroups: [],
      },
    ],
  })
  const [isLoaded, setIsLoaded] = useState(false)

  // Edit Mode for arranging table slots & moving monsters
  const [isEditMode, setIsEditMode] = useState(false)

  // Drag and drop state for edit mode (table slots)
  const [draggedSlotIndex, setDraggedSlotIndex] = useState<number | null>(null)
  const [draggedRosterCharId, setDraggedRosterCharId] = useState<string | null>(null)

  // Drag and drop state for monsters between groups
  const [draggedMonster, setDraggedMonster] = useState<{ sourceGroupId: string; monsterId: string } | null>(null)

  // Drag and drop state for bottom BG3 initiative tracker row
  const [draggedTrackerId, setDraggedTrackerId] = useState<string | null>(null)

  // Encounter Tabs Dialog & Edit state
  const [isNewCombatDialogOpen, setIsNewCombatDialogOpen] = useState(false)
  const [newCombatName, setNewCombatName] = useState('')
  const [editingCombatId, setEditingCombatId] = useState<string | null>(null)
  const [editingCombatName, setEditingCombatName] = useState('')

  // Damage / Heal Popover state: monsterId -> string input
  const [hpMathInputs, setHpMathInputs] = useState<Record<string, string>>({})

  // Monster Group Dialog state
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupInit, setNewGroupInit] = useState(10)

  // Add Monster Dialog state
  const [activeGroupIdForMonster, setActiveGroupIdForMonster] = useState<string | null>(null)
  const [monsterSearchQuery, setMonsterSearchQuery] = useState('')
  const [monsterUrlInput, setMonsterUrlInput] = useState('')
  const [isSearchingMonster, setIsSearchingMonster] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [manualMonsterName, setManualMonsterName] = useState('')
  const [manualMonsterHp, setManualMonsterHp] = useState(20)
  const [manualMonsterAc, setManualMonsterAc] = useState(15)
  const [manualMonsterImmune, setManualMonsterImmune] = useState('')
  const [manualMonsterResist, setManualMonsterResist] = useState('')
  const [manualMonsterWeak, setManualMonsterWeak] = useState('')

  // Editing perception score modal
  const [editingPerceptionCharId, setEditingPerceptionCharId] = useState<Id<'characters'> | null>(null)
  const [perceptionScoreInput, setPerceptionScoreInput] = useState<number>(0)
  const [isUpdatingPerception, setIsUpdatingPerception] = useState(false)

  // Load from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Migration: If old state had monsterGroups but not combats
        if (parsed && !parsed.combats && parsed.monsterGroups) {
          parsed.combats = [
            {
              id: 'encounter-1',
              name: 'Encounter 1',
              monsterGroups: parsed.monsterGroups,
            },
          ]
          parsed.activeCombatId = 'encounter-1'
        } else if (parsed && (!parsed.combats || parsed.combats.length === 0)) {
          parsed.combats = [
            {
              id: 'encounter-1',
              name: 'Encounter 1',
              monsterGroups: [],
            },
          ]
          parsed.activeCombatId = 'encounter-1'
        }
        if (!parsed.activeCombatId && parsed.combats?.[0]) {
          parsed.activeCombatId = parsed.combats[0].id
        }
        setTacticalState(parsed)
      }
    } catch (e) {
      console.error('Failed to load tactical state', e)
    } finally {
      setIsLoaded(true)
    }
  }, [storageKey])

  // Save to LocalStorage whenever tacticalState changes
  useEffect(() => {
    if (!isLoaded) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(tacticalState))
    } catch (e) {
      console.error('Failed to save tactical state', e)
    }
  }, [tacticalState, isLoaded, storageKey])

  // Auto-populate characters into available slots if not present
  useEffect(() => {
    if (!isLoaded || attendingCharacters.length === 0) return

    setTacticalState((prev) => {
      let slots = [...prev.tableSlots]
      // Ensure exactly 9 slots
      if (slots.length !== TOTAL_SLOTS) {
        const newSlots = Array(TOTAL_SLOTS).fill(null)
        for (let i = 0; i < Math.min(slots.length, TOTAL_SLOTS); i++) {
          newSlots[i] = slots[i]
        }
        slots = newSlots
      }

      // Filter out characters that are no longer attending
      const validCharIdSet = new Set(attendingCharacters.map((c) => c._id as string))
      slots = slots.map((cid) => (cid && validCharIdSet.has(cid) ? cid : null))

      // Place any characters not yet placed in first available slot
      const placedCharIds = new Set(slots.filter(Boolean))
      const unplaced = attendingCharacters.filter((c) => !placedCharIds.has(c._id as string))

      for (const char of unplaced) {
        const emptyIndex = slots.findIndex((s) => s === null)
        if (emptyIndex !== -1) {
          slots[emptyIndex] = char._id
        }
      }

      // Set default initiatives if not set (10 + perception bonus)
      const inits = { ...prev.characterInitiatives }
      attendingCharacters.forEach((c) => {
        if (inits[c._id] === undefined) {
          const percBonus = perceptions?.[c._id]?.bonus ?? 0
          inits[c._id] = 10 + percBonus
        }
      })

      return {
        ...prev,
        tableSlots: slots,
        characterInitiatives: inits,
      }
    })
  }, [isLoaded, attendingCharacters, perceptions])

  const isOwnerOrAdmin = Boolean(session?.isOwner || isAdmin)

  // Character map lookup
  const characterMap = new Map<string, Doc<'characters'>>()
  attendingCharacters.forEach((c) => characterMap.set(c._id, c))

  // Active combat encounter
  const activeCombat = useMemo(() => {
    return (
      tacticalState.combats.find((c) => c.id === tacticalState.activeCombatId) ||
      tacticalState.combats[0] || {
        id: 'encounter-1',
        name: 'Encounter 1',
        monsterGroups: [],
      }
    )
  }, [tacticalState.combats, tacticalState.activeCombatId])

  const activeMonsterGroups = useMemo(() => {
    return activeCombat.monsterGroups || []
  }, [activeCombat])

  // Sorted monster groups by initiative (highest on top)
  const sortedMonsterGroups = useMemo(() => {
    return [...activeMonsterGroups].sort((a, b) => b.initiative - a.initiative)
  }, [activeMonsterGroups])

  // Calculate sorted combatants list (highest initiative first)
  const combatants: TurnCombatant[] = useMemo(() => {
    const list: TurnCombatant[] = []

    // 1. Placed or attending characters
    attendingCharacters.forEach((c) => {
      const percBonus = perceptions?.[c._id]?.bonus ?? 0
      const init = tacticalState.characterInitiatives[c._id] ?? (10 + percBonus)
      list.push({
        id: c._id,
        name: c.name,
        type: 'character',
        initiative: init,
        characterId: c._id,
      })
    })

    // 2. Monster groups for current active combat
    activeMonsterGroups.forEach((g) => {
      list.push({
        id: g.id,
        name: g.name,
        type: 'monsterGroup',
        initiative: g.initiative,
        groupId: g.id,
      })
    })

    // Sort descending by initiative (highest to lowest)
    return list.sort((a, b) => b.initiative - a.initiative)
  }, [attendingCharacters, perceptions, tacticalState.characterInitiatives, activeMonsterGroups])

  // Current active turn ID (fall back to highest combatant if available)
  const currentActiveTurnId = useMemo(() => {
    if (tacticalState.activeTurnId && combatants.some((c) => c.id === tacticalState.activeTurnId)) {
      return tacticalState.activeTurnId
    }
    return combatants[0]?.id || null
  }, [tacticalState.activeTurnId, combatants])

  // Next up combatant (next lowest initiative in order, cycling back to top)
  const nextUpCombatant = useMemo(() => {
    if (combatants.length <= 1) return null
    const currentIndex = combatants.findIndex((c) => c.id === currentActiveTurnId)
    if (currentIndex === -1) {
      return combatants[0]
    }
    const nextIndex = (currentIndex + 1) % combatants.length
    return combatants[nextIndex]
  }, [combatants, currentActiveTurnId])

  // Set active turn explicitly (e.g. on click)
  const handleSelectTurn = (id: string) => {
    setTacticalState((prev) => ({
      ...prev,
      activeTurnId: id,
    }))
  }

  // Advance to next turn
  const handleNextTurn = () => {
    if (!nextUpCombatant) return
    setTacticalState((prev) => ({
      ...prev,
      activeTurnId: nextUpCombatant.id,
    }))
  }

  // Update initiative for character
  const setCharInitiative = (charId: string, val: number) => {
    setTacticalState((prev) => ({
      ...prev,
      characterInitiatives: {
        ...prev.characterInitiatives,
        [charId]: val,
      },
    }))
  }

  // Update perception score in database
  const handleSavePerception = async () => {
    if (!editingPerceptionCharId) return
    setIsUpdatingPerception(true)
    try {
      await updatePerceptionMutation({
        characterId: editingPerceptionCharId,
        bonus: perceptionScoreInput,
      })
      toast.success('Perception modifier updated in database!')
      setEditingPerceptionCharId(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update perception modifier')
    } finally {
      setIsUpdatingPerception(false)
    }
  }

  // Swap / Move slots in Edit Mode
  const handleSlotDrop = (targetIndex: number) => {
    if (draggedSlotIndex !== null) {
      if (draggedSlotIndex === targetIndex) return
      setTacticalState((prev) => {
        const slots = [...prev.tableSlots]
        const temp = slots[targetIndex]
        slots[targetIndex] = slots[draggedSlotIndex]
        slots[draggedSlotIndex] = temp
        return { ...prev, tableSlots: slots }
      })
      setDraggedSlotIndex(null)
    } else if (draggedRosterCharId !== null) {
      setTacticalState((prev) => {
        const slots = [...prev.tableSlots]
        // If char is already in another slot, clear that slot
        const existingIdx = slots.indexOf(draggedRosterCharId)
        if (existingIdx !== -1) {
          slots[existingIdx] = null
        }
        slots[targetIndex] = draggedRosterCharId
        return { ...prev, tableSlots: slots }
      })
      setDraggedRosterCharId(null)
    }
  }

  // Handle reordering in BG3 initiative tracker row
  const handleReorderTrackerCombatant = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return

    const currentIndex = combatants.findIndex((c) => c.id === sourceId)
    const targetIndex = combatants.findIndex((c) => c.id === targetId)
    if (currentIndex === -1 || targetIndex === -1) return

    const sourceCombatant = combatants[currentIndex]
    const targetCombatant = combatants[targetIndex]

    // Determine the new initiative value based on destination position in the sorted list
    // List is sorted descending by initiative (combatants[0] is highest).
    let newInitiative = targetCombatant.initiative

    if (currentIndex < targetIndex) {
      // Moving down (to a lower initiative position)
      // Place it right after targetCombatant
      const nextBelow = combatants[targetIndex + 1]
      if (nextBelow) {
        newInitiative = Math.floor((targetCombatant.initiative + nextBelow.initiative) / 2)
        if (newInitiative === targetCombatant.initiative) {
          newInitiative = targetCombatant.initiative - 1
        }
      } else {
        newInitiative = targetCombatant.initiative - 1
      }
    } else {
      // Moving up (to a higher initiative position)
      // Place it right before targetCombatant
      const prevAbove = combatants[targetIndex - 1]
      if (prevAbove) {
        newInitiative = Math.floor((prevAbove.initiative + targetCombatant.initiative) / 2)
        if (newInitiative === targetCombatant.initiative) {
          newInitiative = targetCombatant.initiative + 1
        }
      } else {
        newInitiative = targetCombatant.initiative + 1
      }
    }

    // Apply the new initiative to character or monster group
    if (sourceCombatant.type === 'character' && sourceCombatant.characterId) {
      setCharInitiative(sourceCombatant.characterId, newInitiative)
      toast.info(`Updated ${sourceCombatant.name}'s initiative to ${newInitiative}`)
    } else if (sourceCombatant.type === 'monsterGroup' && sourceCombatant.groupId) {
      handleUpdateGroupInit(sourceCombatant.groupId, newInitiative)
      toast.info(`Updated ${sourceCombatant.name}'s initiative to ${newInitiative}`)
    }
  }

  // --- Combat Encounter Tab Handlers ---
  const handleSelectCombatTab = (combatId: string) => {
    setTacticalState((prev) => ({
      ...prev,
      activeCombatId: combatId,
      // If turn was a monster in previous combat, reset or keep if valid
      activeTurnId: null,
    }))
  }

  const handleCreateCombat = () => {
    if (!newCombatName.trim()) return
    const newCombat: CombatEncounter = {
      id: `combat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newCombatName.trim(),
      monsterGroups: [],
    }
    setTacticalState((prev) => ({
      ...prev,
      combats: [...prev.combats, newCombat],
      activeCombatId: newCombat.id,
    }))
    setNewCombatName('')
    setIsNewCombatDialogOpen(false)
    toast.success(`Encounter "${newCombat.name}" created`)
  }

  const handleSaveRenameCombat = () => {
    if (!editingCombatId || !editingCombatName.trim()) return
    setTacticalState((prev) => ({
      ...prev,
      combats: prev.combats.map((c) =>
        c.id === editingCombatId ? { ...c, name: editingCombatName.trim() } : c
      ),
    }))
    setEditingCombatId(null)
    setEditingCombatName('')
    toast.success('Encounter renamed')
  }

  const handleDeleteCombat = (combatId: string) => {
    if (tacticalState.combats.length <= 1) {
      toast.error('You must keep at least one encounter tab.')
      return
    }
    setTacticalState((prev) => {
      const filtered = prev.combats.filter((c) => c.id !== combatId)
      const nextActiveId = prev.activeCombatId === combatId ? filtered[0]?.id || '' : prev.activeCombatId
      return {
        ...prev,
        combats: filtered,
        activeCombatId: nextActiveId,
      }
    })
    toast.info('Encounter removed')
  }

  // Helper to mutate monsterGroups within active combat
  const updateActiveMonsterGroups = (
    updater: (groups: MonsterGroup[]) => MonsterGroup[]
  ) => {
    setTacticalState((prev) => {
      const currentActiveId = prev.activeCombatId || prev.combats[0]?.id
      return {
        ...prev,
        combats: prev.combats.map((c) => {
          if (c.id === currentActiveId) {
            return {
              ...c,
              monsterGroups: updater(c.monsterGroups || []),
            }
          }
          return c
        }),
      }
    })
  }

  // Monster Group Handlers
  const handleAddMonsterGroup = () => {
    if (!newGroupName.trim()) return
    const newGroup: MonsterGroup = {
      id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newGroupName.trim(),
      initiative: newGroupInit,
      monsters: [],
    }
    updateActiveMonsterGroups((groups) => [...groups, newGroup])
    setNewGroupName('')
    setNewGroupInit(10)
    setIsAddGroupOpen(false)
    toast.success(`Monster group "${newGroup.name}" created`)
  }

  const handleRemoveMonsterGroup = (groupId: string) => {
    updateActiveMonsterGroups((groups) => groups.filter((g) => g.id !== groupId))
    toast.info('Monster group removed')
  }

  const handleUpdateGroupInit = (groupId: string, initiative: number) => {
    updateActiveMonsterGroups((groups) =>
      groups.map((g) => (g.id === groupId ? { ...g, initiative } : g))
    )
  }

  // Monster Handlers
  const handleAddMonsterToGroup = (groupId: string, monster: Omit<MonsterInstance, 'id'>) => {
    const newMonster: MonsterInstance = {
      ...monster,
      id: `monster-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }
    updateActiveMonsterGroups((groups) =>
      groups.map((g) =>
        g.id === groupId ? { ...g, monsters: [...g.monsters, newMonster] } : g
      )
    )
    setActiveGroupIdForMonster(null)
    setMonsterSearchQuery('')
    setMonsterUrlInput('')
    setSearchResults([])
    setManualMonsterName('')
    setManualMonsterImmune('')
    setManualMonsterResist('')
    setManualMonsterWeak('')
    toast.success(`Added ${newMonster.name}`)
  }

  // Monster Duplication
  const handleDuplicateMonster = (groupId: string, monster: MonsterInstance) => {
    // Generate copy name, e.g. "Goblin Warrior 2" or "Goblin Warrior (Copy)"
    const clonedMonster: MonsterInstance = {
      ...monster,
      id: `monster-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${monster.name} (Copy)`,
      currentHp: monster.maxHp, // fresh full HP for the clone
    }
    updateActiveMonsterGroups((groups) =>
      groups.map((g) =>
        g.id === groupId ? { ...g, monsters: [...g.monsters, clonedMonster] } : g
      )
    )
    toast.success(`Duplicated ${monster.name}`)
  }

  // Move monster from one group to another (via drag and drop)
  const handleMoveMonsterToGroup = (targetGroupId: string) => {
    if (!draggedMonster) return
    const { sourceGroupId, monsterId } = draggedMonster
    if (sourceGroupId === targetGroupId) {
      setDraggedMonster(null)
      return
    }

    updateActiveMonsterGroups((groups) => {
      let targetMonsterObj: MonsterInstance | null = null
      // 1. Remove from source
      const afterRemoval = groups.map((g) => {
        if (g.id === sourceGroupId) {
          const found = g.monsters.find((m) => m.id === monsterId)
          if (found) targetMonsterObj = found
          return {
            ...g,
            monsters: g.monsters.filter((m) => m.id !== monsterId),
          }
        }
        return g
      })

      // 2. Add to target
      if (!targetMonsterObj) return groups
      return afterRemoval.map((g) => {
        if (g.id === targetGroupId) {
          return {
            ...g,
            monsters: [...g.monsters, targetMonsterObj!],
          }
        }
        return g
      })
    })

    setDraggedMonster(null)
    toast.success('Monster moved to new group')
  }

  const handleRemoveMonster = (groupId: string, monsterId: string) => {
    updateActiveMonsterGroups((groups) =>
      groups.map((g) =>
        g.id === groupId
          ? { ...g, monsters: g.monsters.filter((m) => m.id !== monsterId) }
          : g
      )
    )
  }

  const handleUpdateMonsterHp = (groupId: string, monsterId: string, delta: number) => {
    updateActiveMonsterGroups((groups) =>
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              monsters: g.monsters.map((m) =>
                m.id === monsterId
                  ? { ...m, currentHp: Math.max(0, m.currentHp + delta) }
                  : m
              ),
            }
          : g
      )
    )
  }

  const handleSetMonsterHp = (groupId: string, monsterId: string, hp: number) => {
    updateActiveMonsterGroups((groups) =>
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              monsters: g.monsters.map((m) =>
                m.id === monsterId ? { ...m, currentHp: Math.max(0, hp) } : m
              ),
            }
          : g
      )
    )
  }

  // Damage / Heal Math
  const handleApplyDamage = (groupId: string, monsterId: string) => {
    const rawVal = hpMathInputs[monsterId] || '0'
    const amount = parseInt(rawVal, 10)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid damage amount')
      return
    }
    handleUpdateMonsterHp(groupId, monsterId, -amount)
    setHpMathInputs((prev) => ({ ...prev, [monsterId]: '' }))
    toast.info(`Dealt ${amount} damage`)
  }

  const handleApplyHeal = (groupId: string, monsterId: string, maxHp: number) => {
    const rawVal = hpMathInputs[monsterId] || '0'
    const amount = parseInt(rawVal, 10)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid heal amount')
      return
    }
    updateActiveMonsterGroups((groups) =>
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              monsters: g.monsters.map((m) =>
                m.id === monsterId
                  ? { ...m, currentHp: Math.min(maxHp, m.currentHp + amount) }
                  : m
              ),
            }
          : g
      )
    )
    setHpMathInputs((prev) => ({ ...prev, [monsterId]: '' }))
    toast.success(`Healed ${amount} HP`)
  }

  // Archives of Nethys Search
  const handleSearchNethys = async () => {
    if (!monsterSearchQuery.trim() && !monsterUrlInput.trim()) return
    setIsSearchingMonster(true)
    try {
      const param = monsterUrlInput.trim()
        ? `url=${encodeURIComponent(monsterUrlInput.trim())}`
        : `q=${encodeURIComponent(monsterSearchQuery.trim())}`
      const res = await fetch(`/api/nethys/monster?${param}`)
      const data = await res.json()
      if (data.results) {
        setSearchResults(data.results)
        if (data.results.length === 0) {
          toast.info('No creatures found')
        }
      } else {
        toast.error(data.error || 'Failed to search monsters')
      }
    } catch (e: any) {
      toast.error('Search request failed')
    } finally {
      setIsSearchingMonster(false)
    }
  }

  // Render a character slot around the table
  const renderSlot = (slotIndex: number, sideLabel: string) => {
    const charId = tacticalState.tableSlots[slotIndex]
    const character = charId ? characterMap.get(charId) : null
    const playerName = character ? usersMap[character.userId] || 'Player' : ''
    const percBonus = character ? perceptions?.[character._id]?.bonus ?? 0 : 0
    const charInit = character ? tacticalState.characterInitiatives[character._id] ?? (10 + percBonus) : 10

    const isCurrentTurn = Boolean(charId && currentActiveTurnId === charId)
    const isNextUp = Boolean(charId && nextUpCombatant?.id === charId)

    return (
      <div
        key={slotIndex}
        draggable={isEditMode && !!charId}
        onDragStart={() => isEditMode && setDraggedSlotIndex(slotIndex)}
        onDragOver={(e) => {
          if (isEditMode) e.preventDefault()
        }}
        onDrop={() => isEditMode && handleSlotDrop(slotIndex)}
        onClick={() => {
          if (!isEditMode && charId) {
            handleSelectTurn(charId)
          }
        }}
        className={cn(
          'relative flex flex-col justify-between p-3 rounded-xl border transition-all min-h-[105px] select-none',
          charId
            ? isCurrentTurn
              ? 'bg-amber-950/30 border-amber-400 ring-2 ring-amber-400/80 shadow-[0_0_18px_rgba(251,191,36,0.35)]'
              : isNextUp
              ? 'bg-purple-950/30 border-purple-400 ring-2 ring-purple-400/80 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
              : 'bg-card/90 border-purple-500/30 hover:border-purple-500/60 shadow-md backdrop-blur-xs'
            : 'bg-muted/10 border-dashed border-border/60 hover:bg-muted/20 flex items-center justify-center',
          isEditMode
            ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-purple-400'
            : charId
            ? 'cursor-pointer hover:scale-[1.01]'
            : ''
        )}
      >
        {/* Turn Status Badges */}
        {isCurrentTurn && (
          <div className="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-sm flex items-center gap-1 z-10">
            <span>👑</span>
            <span>Current Turn</span>
          </div>
        )}
        {!isCurrentTurn && isNextUp && (
          <div className="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-600 text-white shadow-sm flex items-center gap-1 z-10">
            <span>⏳</span>
            <span>Next Up</span>
          </div>
        )}

        {charId && character ? (
          <>
            <div className="flex items-start justify-between gap-1.5">
              <div className="min-w-0 flex-grow">
                <div
                  className={cn(
                    'text-xs sm:text-sm font-black truncate',
                    isCurrentTurn ? 'text-amber-300' : isNextUp ? 'text-purple-300' : 'text-foreground'
                  )}
                  title={character.name}
                >
                  {character.name}
                </div>
                <div className="text-[10px] text-muted-foreground truncate" title={playerName}>
                  {playerName}
                </div>
              </div>
              {isEditMode && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setTacticalState((prev) => {
                      const slots = [...prev.tableSlots]
                      slots[slotIndex] = null
                      return { ...prev, tableSlots: slots }
                    })
                  }}
                  className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                  title="Remove from slot"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>

            <div
              className="flex flex-wrap items-center justify-between gap-1.5 mt-2 pt-2 border-t border-border/40"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Initiative score */}
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground shrink-0">
                  Init
                </span>
                <Input
                  type="number"
                  className={cn(
                    'h-6 w-11 text-xs font-mono font-bold text-center px-0.5 bg-background shrink-0',
                    isCurrentTurn && 'border-amber-400/60 text-amber-300 font-black',
                    isNextUp && 'border-purple-400/60 text-purple-300 font-black'
                  )}
                  value={charInit}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    setCharInitiative(character._id, isNaN(val) ? 0 : val)
                  }}
                />
              </div>

              {/* Perception score button */}
              <button
                type="button"
                onClick={() => {
                  setEditingPerceptionCharId(character._id)
                  setPerceptionScoreInput(percBonus)
                }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors shrink-0"
                title="Click to view and edit Perception score"
              >
                <Eye className="h-3 w-3 shrink-0" />
                <span>{percBonus >= 0 ? `+${percBonus}` : percBonus}</span>
              </button>
            </div>
          </>
        ) : (
          <div className="text-[11px] text-muted-foreground/60 italic font-medium">
            Slot {slotIndex + 1}
          </div>
        )}
      </div>
    )
  }

  // Head of Table (Top slots): 0, 1, 2
  // Left Flank (4 slots, extending to corner): 3, 4, 5, 6
  // Right Flank (4 slots, extending to corner): 7, 8, 9, 10
  const topSlotIndices = [0, 1, 2]
  const leftSlotIndices = [3, 4, 5, 6]
  const rightSlotIndices = [7, 8, 9, 10]

  if (session === undefined || isAdmin === undefined) {
    return (
      <div className="min-h-screen bg-background flex flex-col p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (session === null) {
    notFound()
    return null
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col w-full selection:bg-purple-500/30">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-3 bg-card/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="h-9 gap-1.5">
            <Link href={`/sessions/${sessionId}`}>
              <ChevronLeft className="h-4 w-4" />
              <span className="font-semibold text-xs sm:text-sm">Session</span>
            </Link>
          </Button>

          <div className="h-4 w-px bg-border/60" />

          {/* Navigation Mode Tabs: Combat | Party | Calendar */}
          <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border/60 gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveMainTab('combat')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                activeMainTab === 'combat'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Swords className="h-3.5 w-3.5" />
              <span>Combat</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('party')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                activeMainTab === 'party'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <UsersIcon className="h-3.5 w-3.5" />
              <span>Party</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('calendar')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                activeMainTab === 'calendar'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Calendar</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Turn Tracker & Edit controls (shown on Combat tab) */}
          {activeMainTab === 'combat' && (
            <>
              {combatants.length > 0 && (
                <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border border-border/50">
                  <Button
                    size="sm"
                    onClick={handleNextTurn}
                    className="h-8 text-xs font-bold gap-1.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white shadow-sm"
                  >
                    <span>Next</span>
                    {nextUpCombatant && (
                      <span className="max-w-[120px] truncate text-[11px] font-semibold text-purple-200 bg-purple-950/60 px-1.5 py-0.5 rounded">
                        {nextUpCombatant.name} ({nextUpCombatant.initiative})
                      </span>
                    )}
                  </Button>
                </div>
              )}

              <Button
                variant={isEditMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
                className={cn(
                  'h-8 text-xs font-bold gap-1.5 transition-all',
                  isEditMode
                    ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-500'
                    : 'border-border/60'
                )}
              >
                {isEditMode ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                <span>{isEditMode ? 'Done Rearranging' : 'Edit Positions'}</span>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Main Full-Width Content */}
      <main className="flex-1 w-full p-3 sm:p-5 lg:p-6 max-w-[2400px] mx-auto flex flex-col gap-6">
        {activeMainTab === 'party' ? (
          <CharacterPartyTab
            session={session}
            characters={attendingCharacters}
            partyDetails={partyDetails}
            usersMap={usersMap}
            canEdit={isOwnerOrAdmin}
            userCharacterIds={userCharacterIds}
          />
        ) : activeMainTab === 'calendar' ? (
          <TacticalCalendarTab
            sessionId={sessionId as Id<'sessions'>}
            worldId={session.world}
            isAdmin={Boolean(isAdmin)}
          />
        ) : (
          <>
        {/* EDIT MODE ROSTER HELPER (if edit mode is on, show available characters) */}
        {isEditMode && (
          <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl flex flex-wrap items-center gap-2 animate-in fade-in">
            <span className="text-xs font-bold text-purple-300 mr-2 flex items-center gap-1">
              <Pencil className="h-3.5 w-3.5" />
              Drag characters to slots or swap slots:
            </span>
            {attendingCharacters.map((c) => {
              const isAssigned = tacticalState.tableSlots.includes(c._id)
              return (
                <div
                  key={c._id}
                  draggable
                  onDragStart={() => setDraggedRosterCharId(c._id)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold cursor-grab active:cursor-grabbing border transition-colors',
                    isAssigned
                      ? 'bg-card border-border/60 text-muted-foreground'
                      : 'bg-purple-600/30 border-purple-400 text-purple-200 hover:bg-purple-600/50'
                  )}
                >
                  {c.name}
                </div>
              )
            })}
          </div>
        )}

        {/* Two-Column Split Layout: Table/Initiative (Left) & Monster Groups/Combats (Right) */}
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-6 items-start w-full">
          {/* LEFT COLUMN: TACTICAL TABLE & INITIATIVE ARENA */}
          <div className="flex flex-col gap-6">
            {/* Tactical Arena: Left Flank | Center Horseshoe Table | Right Flank */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.8fr_1fr] xl:grid-cols-[210px_1fr_210px] 2xl:grid-cols-[240px_1fr_240px] gap-3 items-start">
              {/* LEFT SIDE SLOTS (4 SLOTS: 1 CORNER + 3 FLANK) */}
              <div className="flex flex-col gap-3">
                {leftSlotIndices.map((idx, i) => renderSlot(idx, i === 0 ? 'Left Corner' : 'Left Flank'))}
              </div>

              {/* CENTER U-SHAPED TABLE WITH TOP SLOTS AND MONSTER INITIATIVES */}
              <div className="flex flex-col gap-3">
                {/* TOP SLOTS (3 SLOTS) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {topSlotIndices.map((idx) => renderSlot(idx, 'Head'))}
                </div>

                {/* SQUARE WITH BOTTOM LINE REMOVED (Horseshoe / U-Shape) */}
                <div className="relative p-5 rounded-t-3xl border-t-4 border-l-4 border-r-4 border-b-0 border-purple-500/40 bg-gradient-to-b from-purple-950/20 via-background/40 to-transparent min-h-[420px] flex flex-col items-center justify-between shadow-2xl">
                  {/* Inside the square: Monster Group Initiatives */}
                  <div className="w-full max-w-md my-auto py-2 flex flex-col items-center gap-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sword className="h-3.5 w-3.5 text-purple-400" />
                      Monster Group Initiatives
                    </div>

                    {sortedMonsterGroups.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground text-xs italic">
                        No monster groups in this encounter. Click &quot;Add Monster Group&quot; to begin.
                      </div>
                    ) : (
                      <div className="w-full flex flex-col items-center gap-3.5 max-h-[380px] overflow-y-auto px-2 pt-3 pb-2">
                        {sortedMonsterGroups.map((group) => {
                          const isCurrentTurn = currentActiveTurnId === group.id
                          const isNextUp = nextUpCombatant?.id === group.id

                          return (
                            <div
                              key={group.id}
                              onClick={() => handleSelectTurn(group.id)}
                              className={cn(
                                'relative w-full max-w-sm flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer backdrop-blur-xs select-none hover:scale-[1.01]',
                                isCurrentTurn
                                  ? 'bg-amber-950/40 border-amber-400 ring-2 ring-amber-400/80 shadow-[0_0_18px_rgba(251,191,36,0.35)]'
                                  : isNextUp
                                  ? 'bg-purple-950/40 border-purple-400 ring-2 ring-purple-400/80 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                                  : 'bg-card/90 border-purple-500/30 hover:border-purple-500/60 shadow-md'
                              )}
                            >
                              {/* Turn badges */}
                              {isCurrentTurn && (
                                <div className="absolute -top-2 left-2 px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-xs flex items-center gap-0.5">
                                  <span>👑</span>
                                  <span>Turn</span>
                                </div>
                              )}
                              {!isCurrentTurn && isNextUp && (
                                <div className="absolute -top-2 left-2 px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase tracking-wider bg-purple-600 text-white shadow-xs flex items-center gap-0.5">
                                  <span>⏳</span>
                                  <span>Next</span>
                                </div>
                              )}

                              <div className="flex flex-col min-w-0 flex-1">
                                <span
                                  className={cn(
                                    'text-xs sm:text-sm font-bold truncate',
                                    isCurrentTurn
                                       ? 'text-amber-300 font-black'
                                      : isNextUp
                                      ? 'text-purple-300 font-black'
                                      : 'text-foreground'
                                  )}
                                >
                                  {group.name}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {group.monsters.length} creature{group.monsters.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div
                                className="flex items-center gap-1.5 pl-3 border-l border-border/40 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="text-[10px] font-black text-muted-foreground uppercase">
                                  Init
                                </span>
                                <Input
                                  type="number"
                                  className={cn(
                                    'h-7 w-12 text-xs font-mono font-black text-center px-1 bg-background',
                                    isCurrentTurn
                                      ? 'border-amber-400/60 text-amber-300'
                                      : isNextUp
                                      ? 'border-purple-400/60 text-purple-300'
                                      : 'text-purple-300'
                                  )}
                                  value={group.initiative}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10)
                                    handleUpdateGroupInit(group.id, isNaN(val) ? 0 : val)
                                  }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE SLOTS (4 SLOTS: 1 CORNER + 3 FLANK) */}
              <div className="flex flex-col gap-3">
                {rightSlotIndices.map((idx, i) => renderSlot(idx, i === 0 ? 'Right Corner' : 'Right Flank'))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: ENCOUNTER TABS, MONSTER GROUPS & ACTIVE MONSTERS TRACKER */}
          <section className="flex flex-col gap-4">
            {/* Encounter Preparation Tabs Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-card/60 p-2.5 rounded-2xl border border-border/50">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1.5">
                  <Sword className="h-4 w-4 text-purple-400" />
                  Combats:
                </span>

                {tacticalState.combats.map((combat) => {
                  const isActive = combat.id === tacticalState.activeCombatId
                  return (
                    <div
                      key={combat.id}
                      onClick={() => handleSelectCombatTab(combat.id)}
                      className={cn(
                        'group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border select-none',
                        isActive
                          ? 'bg-purple-600 text-white border-purple-500 shadow-md ring-1 ring-purple-400'
                          : 'bg-background/80 hover:bg-muted text-foreground border-border/60'
                      )}
                    >
                      <span>{combat.name}</span>
                      <span
                        className={cn(
                          'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                          isActive ? 'bg-purple-900/60 text-purple-200' : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {combat.monsterGroups.length}
                      </span>

                      {/* Rename button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingCombatId(combat.id)
                          setEditingCombatName(combat.name)
                        }}
                        className={cn(
                          'opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity',
                          isActive ? 'text-purple-200 hover:text-white' : 'text-muted-foreground hover:text-foreground'
                        )}
                        title="Rename encounter"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>

                      {/* Delete button (if more than 1 combat) */}
                      {tacticalState.combats.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCombat(combat.id)
                          }}
                          className={cn(
                            'opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-destructive transition-opacity',
                            isActive ? 'text-purple-200' : 'text-muted-foreground'
                          )}
                          title="Delete encounter"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )
                })}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setNewCombatName(`Encounter ${tacticalState.combats.length + 1}`)
                    setIsNewCombatDialogOpen(true)
                  }}
                  className="h-8 text-xs font-bold gap-1 border-dashed border-border/70 text-purple-400 hover:text-purple-300"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Combat</span>
                </Button>
              </div>

              <Button
                size="sm"
                onClick={() => setIsAddGroupOpen(true)}
                className="h-8 text-xs font-bold gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Group</span>
              </Button>
            </div>

            {/* Active Combat Groups Render */}
            {activeMonsterGroups.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-border/60 text-center text-muted-foreground">
                <p className="text-sm font-medium">No monster groups in &quot;{activeCombat.name}&quot;.</p>
                <p className="text-xs mt-1">
                  Add a monster group to start preparing enemies and stats for this encounter.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {activeMonsterGroups.map((group) => {
                  const isCurrentTurn = currentActiveTurnId === group.id
                  const isNextUp = nextUpCombatant?.id === group.id

                  return (
                    <div
                      key={group.id}
                      onClick={() => handleSelectTurn(group.id)}
                      onDragOver={(e) => {
                        if (isEditMode && draggedMonster) e.preventDefault()
                      }}
                      onDrop={() => {
                        if (isEditMode && draggedMonster) {
                          handleMoveMonsterToGroup(group.id)
                        }
                      }}
                      className={cn(
                        'relative flex flex-col rounded-2xl border transition-all cursor-pointer backdrop-blur-xs overflow-hidden shadow-sm hover:scale-[1.01]',
                        isCurrentTurn
                          ? 'bg-card/90 border-amber-400 ring-2 ring-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                          : isNextUp
                          ? 'bg-card/90 border-purple-400 ring-2 ring-purple-400/80 shadow-[0_0_18px_rgba(168,85,247,0.25)]'
                          : 'border-border/60 bg-card/60',
                        isEditMode && draggedMonster && draggedMonster.sourceGroupId !== group.id
                          ? 'border-dashed border-purple-400/80 bg-purple-950/20'
                          : ''
                      )}
                    >
                      {/* Turn Header Strip */}
                      {isCurrentTurn && (
                        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider flex items-center justify-between">
                          <span>👑 Current Turn</span>
                          <span className="font-mono text-[9px] font-bold">Initiative {group.initiative}</span>
                        </div>
                      )}
                      {!isCurrentTurn && isNextUp && (
                        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-3 py-0.5 text-[10px] font-black uppercase tracking-wider flex items-center justify-between">
                          <span>⏳ Next Up</span>
                          <span className="font-mono text-[9px] font-bold">Initiative {group.initiative}</span>
                        </div>
                      )}

                      {/* Group Header */}
                      <div
                        className={cn(
                          'flex items-center justify-between p-3.5 border-b border-border/50',
                          isCurrentTurn ? 'bg-amber-950/20' : isNextUp ? 'bg-purple-950/20' : 'bg-muted/40'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'font-black text-sm truncate',
                              isCurrentTurn ? 'text-amber-300 font-black' : isNextUp ? 'text-purple-300 font-black' : 'text-foreground'
                            )}
                          >
                            {group.name}
                          </span>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border',
                              isCurrentTurn
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : isNextUp
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            )}
                          >
                            Init {group.initiative}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setActiveGroupIdForMonster(group.id)
                              setMonsterSearchQuery('')
                              setMonsterUrlInput('')
                              setSearchResults([])
                            }}
                            className="h-7 px-2 text-xs font-bold text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Monster
                          </Button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMonsterGroup(group.id)}
                            className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                            title="Delete Group"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Monsters List */}
                      <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[520px]">
                        {group.monsters.length === 0 ? (
                          <div className="text-center py-6 text-xs text-muted-foreground italic">
                            No monsters in this group. Click &quot;+ Monster&quot; to add one.
                          </div>
                        ) : (
                          group.monsters.map((monster) => (
                            <div
                              key={monster.id}
                              draggable={isEditMode}
                              onDragStart={() => {
                                if (isEditMode) {
                                  setDraggedMonster({ sourceGroupId: group.id, monsterId: monster.id })
                                }
                              }}
                              className={cn(
                                'flex flex-col gap-2 p-3 rounded-xl border border-border/40 bg-background/80 shadow-xs transition-all',
                                isEditMode && 'cursor-grab active:cursor-grabbing hover:border-purple-400 hover:bg-purple-950/10'
                              )}
                            >
                              {/* Monster Title & Action Icons */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  {isEditMode && (
                                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  )}
                                  <span className="font-bold text-xs sm:text-sm truncate text-foreground">
                                    {monster.name}
                                  </span>
                                  {monster.nethysUrl && (
                                    <a
                                      href={monster.nethysUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-muted-foreground hover:text-purple-400 transition-colors shrink-0"
                                      title="View on Archives of Nethys"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>

                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  {/* Duplicate Monster Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleDuplicateMonster(group.id, monster)}
                                    className="text-muted-foreground/60 hover:text-purple-400 p-1 rounded transition-colors"
                                    title="Duplicate monster"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>
                                  {/* Remove Monster Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMonster(group.id, monster.id)}
                                    className="text-muted-foreground/60 hover:text-destructive p-1 rounded transition-colors"
                                    title="Remove monster"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Immunities, Resistances, Weaknesses Tags */}
                              {(monster.immunities || monster.resistances || monster.weaknesses) && (
                                <div className="flex flex-wrap items-center gap-1.5 py-1 text-[10px]">
                                  {monster.immunities && (
                                    <div
                                      className="px-2 py-0.5 rounded-md bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-semibold"
                                      title={`Immunities: ${monster.immunities}`}
                                    >
                                      <span className="font-black text-emerald-400">Immune:</span> {monster.immunities}
                                    </div>
                                  )}
                                  {monster.resistances && (
                                    <div
                                      className="px-2 py-0.5 rounded-md bg-sky-950/40 border border-sky-500/30 text-sky-300 font-semibold"
                                      title={`Resistances: ${monster.resistances}`}
                                    >
                                      <span className="font-black text-sky-400">Resist:</span> {monster.resistances}
                                    </div>
                                  )}
                                  {monster.weaknesses && (
                                    <div
                                      className="px-2 py-0.5 rounded-md bg-rose-950/40 border border-rose-500/30 text-rose-300 font-semibold"
                                      title={`Weaknesses: ${monster.weaknesses}`}
                                    >
                                      <span className="font-black text-rose-400">Weak:</span> {monster.weaknesses}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* AC and Quick HP Display */}
                              <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/30">
                                {/* AC Badge */}
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-muted/40 border border-border/40">
                                  <Shield className="h-3.5 w-3.5 text-blue-400" />
                                  <span className="text-[10px] font-bold text-muted-foreground">AC</span>
                                  <span className="text-xs font-mono font-bold text-foreground">
                                    {monster.ac}
                                  </span>
                                </div>

                                {/* HP Tracker */}
                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <Heart className="h-3.5 w-3.5 text-red-500" />
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-6 w-6 text-xs font-black shrink-0"
                                      onClick={() => handleUpdateMonsterHp(group.id, monster.id, -1)}
                                    >
                                      -
                                    </Button>
                                    <Input
                                      type="number"
                                      className="h-6 w-14 text-xs font-mono font-bold text-center px-1 bg-background"
                                      value={monster.currentHp}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value, 10)
                                        handleSetMonsterHp(group.id, monster.id, isNaN(val) ? 0 : val)
                                      }}
                                    />
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      / {monster.maxHp}
                                    </span>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-6 w-6 text-xs font-black shrink-0"
                                      onClick={() => handleUpdateMonsterHp(group.id, monster.id, 1)}
                                    >
                                      +
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              {/* Damage & Heal HP Math Bar */}
                              <div
                                className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/20"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Input
                                  type="number"
                                  placeholder="Amt"
                                  className="h-6 w-14 text-[11px] font-mono font-bold text-center px-1 bg-background"
                                  value={hpMathInputs[monster.id] || ''}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    setHpMathInputs((prev) => ({ ...prev, [monster.id]: val }))
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleApplyDamage(group.id, monster.id)
                                    }
                                  }}
                                />
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-6 px-2 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white"
                                  onClick={() => handleApplyDamage(group.id, monster.id)}
                                >
                                  Dmg
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-6 px-2 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => handleApplyHeal(group.id, monster.id, monster.maxHp)}
                                >
                                  Heal
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {/* BALDUR'S GATE 3 STYLE INITIATIVE ORDER ROW */}
        {combatants.length > 0 && (
          <div className="w-full mt-4 pt-4 border-t border-purple-500/20 bg-card/60 backdrop-blur-md rounded-2xl p-4 border border-border/50 shadow-lg">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">⚔️</span>
                <span className="text-xs font-black tracking-wider uppercase text-foreground">
                  Initiative Order
                </span>
                <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
                  (Drag portraits to reorder turn priority & auto-update initiative)
                </span>
              </div>
              <div className="text-[10px] font-bold text-purple-400 bg-purple-950/40 border border-purple-500/30 px-2 py-0.5 rounded-full">
                {combatants.length} Combatant{combatants.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Horizontal Scrollable BG3 Ribbon */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 px-1 scrollbar-thin">
              {combatants.map((c, index) => {
                const isCurrentTurn = currentActiveTurnId === c.id
                const isNextUp = nextUpCombatant?.id === c.id
                const isMonster = c.type === 'monsterGroup'

                const isDragging = draggedTrackerId === c.id

                return (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={() => setDraggedTrackerId(c.id)}
                    onDragEnd={() => setDraggedTrackerId(null)}
                    onDragOver={(e) => {
                      if (draggedTrackerId && draggedTrackerId !== c.id) {
                        e.preventDefault()
                      }
                    }}
                    onDrop={() => {
                      if (draggedTrackerId) {
                        handleReorderTrackerCombatant(draggedTrackerId, c.id)
                        setDraggedTrackerId(null)
                      }
                    }}
                    onClick={() => handleSelectTurn(c.id)}
                    className={cn(
                      'group relative flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-grab active:cursor-grabbing select-none shrink-0 shadow-sm hover:scale-[1.03]',
                      isDragging
                        ? 'opacity-40 scale-95 border-dashed border-purple-400'
                        : isCurrentTurn
                        ? 'bg-amber-950/50 border-amber-400 ring-2 ring-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.4)] text-amber-200'
                        : isNextUp
                        ? 'bg-purple-950/50 border-purple-400 ring-2 ring-purple-400/80 shadow-[0_0_12px_rgba(168,85,247,0.3)] text-purple-200'
                        : isMonster
                        ? 'bg-rose-950/20 border-rose-500/30 text-rose-200 hover:border-rose-400/60'
                        : 'bg-background/80 border-border/60 text-foreground hover:border-purple-400/60'
                    )}
                  >
                    {/* Position badge */}
                    <span className="text-[10px] font-mono text-muted-foreground w-3.5 text-center shrink-0">
                      #{index + 1}
                    </span>

                    {/* Turn crown / indicator badge */}
                    {isCurrentTurn ? (
                      <span className="text-xs shrink-0" title="Current Turn">
                        👑
                      </span>
                    ) : isNextUp ? (
                      <span className="text-xs shrink-0" title="Next Up">
                        ⏳
                      </span>
                    ) : isMonster ? (
                      <span className="text-xs shrink-0 opacity-70">
                        👾
                      </span>
                    ) : (
                      <span className="text-xs shrink-0 opacity-70">
                        🛡️
                      </span>
                    )}

                    {/* Name */}
                    <span className="truncate max-w-[120px] font-black tracking-tight">
                      {c.name}
                    </span>

                    {/* Initiative badge */}
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded font-mono text-[10px] font-black shrink-0',
                        isCurrentTurn
                          ? 'bg-amber-500/30 text-amber-300 border border-amber-400/40'
                          : isNextUp
                          ? 'bg-purple-600/30 text-purple-200 border border-purple-400/40'
                          : isMonster
                          ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {c.initiative}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        </>
        )}
      </main>

      {/* CREATE MONSTER GROUP DIALOG */}
      <Dialog open={isAddGroupOpen} onOpenChange={setIsAddGroupOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Monster Group</DialogTitle>
            <DialogDescription>
              Create a group of monsters that will share a single initiative roll.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Group Name</label>
              <Input
                placeholder="e.g. Goblin Squad, Shadow Drakes"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Group Initiative</label>
              <Input
                type="number"
                value={newGroupInit}
                onChange={(e) => setNewGroupInit(parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddGroupOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddMonsterGroup}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD MONSTER MODAL (ARCHIVES OF NETHYS + MANUAL) */}
      <Dialog
        open={Boolean(activeGroupIdForMonster)}
        onOpenChange={(open) => !open && setActiveGroupIdForMonster(null)}
      >
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Monster</DialogTitle>
            <DialogDescription>
              Search Archives of Nethys (2e.aonprd.com), paste a link, or create a custom monster manually.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 flex-1 overflow-y-auto pr-1">
            {/* Search by URL or Name */}
            <div className="p-3 bg-muted/30 rounded-xl border border-border/50 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" />
                Archives of Nethys Lookup
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search monster by name (e.g. Goblin Warrior, Drake)..."
                    value={monsterSearchQuery}
                    onChange={(e) => {
                      setMonsterSearchQuery(e.target.value)
                      if (e.target.value) setMonsterUrlInput('')
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchNethys()}
                    className="text-xs"
                  />
                  <Button
                    onClick={handleSearchNethys}
                    disabled={isSearchingMonster}
                    className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white text-xs"
                  >
                    {isSearchingMonster ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Search'}
                  </Button>
                </div>

                <div className="text-center text-[10px] text-muted-foreground uppercase font-bold">
                  — or paste link —
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="https://2e.aonprd.com/Monsters.aspx?ID=3056"
                    value={monsterUrlInput}
                    onChange={(e) => {
                      setMonsterUrlInput(e.target.value)
                      if (e.target.value) setMonsterSearchQuery('')
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchNethys()}
                    className="text-xs font-mono"
                  />
                  <Button
                    onClick={handleSearchNethys}
                    disabled={isSearchingMonster}
                    variant="secondary"
                    className="shrink-0 text-xs"
                  >
                    Fetch
                  </Button>
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-3 space-y-1.5 max-h-[180px] overflow-y-auto">
                  <div className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                    Results ({searchResults.length})
                  </div>
                  {searchResults.map((res) => (
                    <div
                      key={res.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-card border border-border/50 hover:border-purple-400 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold truncate text-foreground">{res.name}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                          <span>Level {res.level}</span>
                          <span>HP {res.hp}</span>
                          <span>AC {res.ac}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => {
                          if (activeGroupIdForMonster) {
                            handleAddMonsterToGroup(activeGroupIdForMonster, {
                              name: res.name,
                              currentHp: res.hp,
                              maxHp: res.hp,
                              ac: res.ac,
                              nethysUrl: res.url,
                              immunities: res.immunities,
                              resistances: res.resistances,
                              weaknesses: res.weaknesses,
                            })
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Manual Monster Entry */}
            <div className="p-3 bg-muted/30 rounded-xl border border-border/50 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                Manual Monster Entry
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-3 space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground">Monster Name</label>
                  <Input
                    placeholder="e.g. Bandit Leader"
                    value={manualMonsterName}
                    onChange={(e) => setManualMonsterName(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground">HP</label>
                  <Input
                    type="number"
                    value={manualMonsterHp}
                    onChange={(e) => setManualMonsterHp(parseInt(e.target.value, 10) || 1)}
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground">AC</label>
                  <Input
                    type="number"
                    value={manualMonsterAc}
                    onChange={(e) => setManualMonsterAc(parseInt(e.target.value, 10) || 10)}
                    className="text-xs font-mono"
                  />
                </div>

                <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-border/30">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-emerald-400">Immunities</label>
                    <Input
                      placeholder="e.g. bleed, poison"
                      value={manualMonsterImmune}
                      onChange={(e) => setManualMonsterImmune(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-sky-400">Resistances</label>
                    <Input
                      placeholder="e.g. fire 5, cold 5"
                      value={manualMonsterResist}
                      onChange={(e) => setManualMonsterResist(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-rose-400">Weaknesses</label>
                    <Input
                      placeholder="e.g. bludgeoning 5"
                      value={manualMonsterWeak}
                      onChange={(e) => setManualMonsterWeak(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3 flex justify-end pt-2">
                  <Button
                    onClick={() => {
                      if (!manualMonsterName.trim()) {
                        toast.error('Monster name is required')
                        return
                      }
                      if (activeGroupIdForMonster) {
                        handleAddMonsterToGroup(activeGroupIdForMonster, {
                          name: manualMonsterName.trim(),
                          currentHp: manualMonsterHp,
                          maxHp: manualMonsterHp,
                          ac: manualMonsterAc,
                          immunities: manualMonsterImmune.trim() || undefined,
                          resistances: manualMonsterResist.trim() || undefined,
                          weaknesses: manualMonsterWeak.trim() || undefined,
                        })
                      }
                    }}
                    className="text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Add Manual Monster
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setActiveGroupIdForMonster(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW COMBAT ENCOUNTER DIALOG */}
      <Dialog open={isNewCombatDialogOpen} onOpenChange={setIsNewCombatDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>New Combat Encounter</DialogTitle>
            <DialogDescription>
              Prepare a new battle with independent monster groups and stat trackers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Encounter Name</label>
              <Input
                placeholder="e.g. Ambush at the Bridge, Crypt Boss"
                value={newCombatName}
                onChange={(e) => setNewCombatName(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCombat()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsNewCombatDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateCombat}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              Create Encounter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RENAME COMBAT ENCOUNTER DIALOG */}
      <Dialog open={Boolean(editingCombatId)} onOpenChange={(open) => !open && setEditingCombatId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rename Combat Encounter</DialogTitle>
            <DialogDescription>
              Change the tab label for this encounter.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Encounter Name</label>
              <Input
                value={editingCombatName}
                onChange={(e) => setEditingCombatName(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveRenameCombat()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingCombatId(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRenameCombat}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              Save Name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT PERCEPTION SCORE DIALOG */}
      <Dialog
        open={Boolean(editingPerceptionCharId)}
        onOpenChange={(open) => !open && setEditingPerceptionCharId(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Perception Modifier</DialogTitle>
            <DialogDescription>
              Changes are saved directly to the database for this character.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Perception Bonus</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="font-mono text-center font-bold"
                  value={perceptionScoreInput}
                  onChange={(e) => setPerceptionScoreInput(parseInt(e.target.value, 10) || 0)}
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Base initiative defaults to 10 + Perception Modifier.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingPerceptionCharId(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSavePerception}
              disabled={isUpdatingPerception}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              {isUpdatingPerception ? 'Saving...' : 'Save to Database'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
