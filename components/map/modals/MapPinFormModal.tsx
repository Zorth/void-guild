import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { EyeOff } from 'lucide-react'
import { PIN_ICONS } from '../pinIcons'
import { Id } from '@/convex/_generated/dataModel'

export interface PinDraft {
  id?: Id<'mapPins'>
  x: number
  y: number
  title: string
  description: string
  style: 'icon' | 'text_only'
  icon: string
  color: string
  targetMapId?: Id<'worldMaps'>
  layerId?: Id<'mapLayers'>
  questId?: Id<'quests'>
  gmOnly?: boolean
}

interface WorldMapRef {
  _id: Id<'worldMaps'>
  name: string
  isHomeMap?: boolean
  hideFromMenu?: boolean
}

interface LayerItem {
  _id: Id<'mapLayers'>
  name: string
}

interface QuestItem {
  _id: Id<'quests'>
  name: string
  description?: string
}

interface MapPinFormModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  pinDraft: PinDraft
  onChangeDraft: (draft: PinDraft) => void
  isOwner: boolean
  layers: LayerItem[] | undefined
  worldMaps: WorldMapRef[] | undefined
  worldQuests: QuestItem[] | undefined
  onSave: () => void
}

export function MapPinFormModal({
  isOpen,
  onOpenChange,
  pinDraft,
  onChangeDraft,
  isOwner,
  layers,
  worldMaps,
  worldQuests,
  onSave,
}: MapPinFormModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto bg-slate-950 dark:bg-slate-950 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-slate-100">{pinDraft.id ? 'Edit Map Pin' : 'Add Map Pin'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="font-bold text-slate-400">Title</label>
            <Input
              value={pinDraft.title}
              onChange={(e) => onChangeDraft({ ...pinDraft, title: e.target.value })}
              placeholder="Pin Title"
              className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="font-bold text-slate-400">Description</label>
            <Textarea
              value={pinDraft.description || ''}
              onChange={(e) => onChangeDraft({ ...pinDraft, description: e.target.value })}
              placeholder="Details, secrets, lore..."
              rows={3}
              className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-400">Style</label>
              <Select
                value={pinDraft.style || 'icon'}
                onValueChange={(val: any) => onChangeDraft({ ...pinDraft, style: val })}
              >
                <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="icon">Icon Pin</SelectItem>
                  <SelectItem value="text_only">Text Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-bold text-slate-400">Color</label>
              <Input
                type="color"
                value={pinDraft.color || '#a855f7'}
                onChange={(e) => onChangeDraft({ ...pinDraft, color: e.target.value })}
                className="h-9 p-1 bg-slate-900 border-slate-800 cursor-pointer"
              />
            </div>
          </div>

          {/* Fantasy Icon Picker */}
          {(pinDraft.style || 'icon') === 'icon' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-400">Pin Icon</label>
                <span className="text-[11px] text-slate-400 font-medium">
                  {PIN_ICONS.find((i) => i.name === pinDraft.icon)?.label || pinDraft.icon}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 p-2 bg-slate-900/60 border border-slate-800 rounded-lg max-h-36 overflow-y-auto">
                {PIN_ICONS.map((item) => {
                  const isSelected = pinDraft.icon === item.name
                  const IconCmp = item.icon
                  return (
                    <button
                      key={item.name}
                      type="button"
                      title={item.label}
                      onClick={() => onChangeDraft({ ...pinDraft, icon: item.name })}
                      className={`h-9 w-9 rounded-md flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-purple-600 text-white ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-950 scale-105'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-800'
                      }`}
                    >
                      <IconCmp className="h-4 w-4" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Layer Selection */}
          {layers && layers.length > 0 && (
            <div>
              <label className="font-bold text-slate-400">Layer (Optional)</label>
              <Select
                value={pinDraft.layerId || 'none'}
                onValueChange={(val) =>
                  onChangeDraft({ ...pinDraft, layerId: val === 'none' ? undefined : (val as Id<'mapLayers'>) })
                }
              >
                <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100"><SelectValue placeholder="All Layers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Default / All Layers</SelectItem>
                  {layers.map((l) => (
                    <SelectItem key={l._id} value={l._id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-400">Link to Map (Optional)</label>
            <Select
              value={pinDraft.targetMapId || 'none'}
              onValueChange={(val) =>
                onChangeDraft({ ...pinDraft, targetMapId: val === 'none' ? undefined : (val as Id<'worldMaps'>) })
              }
            >
              <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {worldMaps?.map((m) => (
                  <SelectItem key={m._id} value={m._id}>
                    {m.name} {m.isHomeMap ? '🏠 ' : ''}{m.hideFromMenu ? '(Hidden)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Link to Quest */}
          {worldQuests && worldQuests.length > 0 && (
            <div>
              <label className="font-bold text-slate-400 flex items-center gap-1.5">
                <img src="/quest.svg" alt="" className="h-3 w-3" />
                Link to Quest (Optional)
              </label>
              <Select
                value={pinDraft.questId || 'none'}
                onValueChange={(val) => {
                  if (val === 'none') {
                    onChangeDraft({ ...pinDraft, questId: undefined })
                  } else {
                    const q = worldQuests.find((item) => item._id === val)
                    onChangeDraft({
                      ...pinDraft,
                      questId: val as Id<'quests'>,
                      title: pinDraft.title.trim() ? pinDraft.title : (q?.name || 'Quest'),
                      description: pinDraft.description?.trim() ? pinDraft.description : (q?.description || ''),
                      icon: 'Quest',
                      color: pinDraft.color || '#f59e0b',
                    })
                  }
                }}
              >
                <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {worldQuests.map((q) => (
                    <SelectItem key={q._id} value={q._id}>
                      {q.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* GM Secret Toggle */}
          {isOwner && (
            <div className="flex items-center justify-between border border-slate-800 bg-slate-900/40 px-3 py-2.5 rounded-md">
              <div className="space-y-0.5 pr-2">
                <span className="font-bold flex items-center gap-1.5 text-xs text-slate-200">
                  <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                  Secret Pin (GM Only)
                </span>
                <p className="text-[11px] text-slate-400">
                  Only visible to GM. Completely hidden from players.
                </p>
              </div>
              <Switch
                checked={pinDraft.gmOnly || false}
                onCheckedChange={(val) => onChangeDraft({ ...pinDraft, gmOnly: val })}
              />
            </div>
          )}
        </div>
        <DialogFooter className="pt-2">
          <Button size="sm" onClick={onSave} className="bg-purple-600 hover:bg-purple-500 text-white font-semibold">
            {pinDraft.id ? 'Update Pin' : 'Save Pin'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
