import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { X, FileText, Plus, User, BookOpen, Trash2, Eye } from 'lucide-react'
import { Id } from '@/convex/_generated/dataModel'
import { formatWikiUrl } from '@/lib/utils'

export interface NoteItem {
  _id: Id<'mapGridNotes'>
  userId: string
  authorName?: string
  note: string
  wikiLink?: string
  cellKey?: string
  x?: number
  y?: number
  updatedAt: number
}

interface MapNotesPanelProps {
  isOpen: boolean
  onClose: () => void
  currentUserId?: string
  isOwner: boolean
  notes: NoteItem[] | undefined
  showPlayerNotes: boolean
  onTogglePlayerNotes: (val: boolean) => void
  activeTool: string
  onToggleAddNoteTool: () => void
  onSelectNote: (note: NoteItem) => void
  onDeleteNote: (noteId?: Id<'mapGridNotes'>) => void
}

export function MapNotesPanel({
  isOpen,
  onClose,
  currentUserId,
  isOwner,
  notes,
  showPlayerNotes,
  onTogglePlayerNotes,
  activeTool,
  onToggleAddNoteTool,
  onSelectNote,
  onDeleteNote,
}: MapNotesPanelProps) {
  if (!isOpen) return null

  return (
    <Card className="absolute top-14 sm:top-16 right-2 sm:right-4 z-40 w-80 max-w-[calc(100vw-1rem)] bg-slate-950 dark:bg-slate-950 backdrop-blur-md border-slate-700/80 shadow-2xl flex flex-col max-h-[75vh] text-slate-100">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-800 shrink-0">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-100">
          <FileText className="h-4 w-4 text-amber-400" /> Map Notes ({notes?.length || 0})
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>

      {/* Visibility toggle & Add Note action */}
      <div className="p-3 border-b border-slate-800 space-y-2 shrink-0 bg-slate-900/40">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium text-slate-200">Show Notes on Map</span>
          </div>
          <Switch
            checked={showPlayerNotes}
            onCheckedChange={onTogglePlayerNotes}
          />
        </div>
        <Button
          size="sm"
          className={`w-full text-xs h-8 gap-1.5 ${
            activeTool === 'grid_note'
              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold'
              : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30'
          }`}
          onClick={onToggleAddNoteTool}
        >
          <Plus className="h-3.5 w-3.5" />
          {activeTool === 'grid_note' ? 'Placing Note (Click Map)' : 'Add Note to Map'}
        </Button>
      </div>

      <CardContent className="p-2 space-y-1.5 overflow-y-auto flex-1">
        {!notes || notes.length === 0 ? (
          <div className="text-center py-6 px-4 space-y-1">
            <FileText className="h-6 w-6 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400 italic">No notes have been added yet.</p>
            <p className="text-[11px] text-slate-500">Click &ldquo;Add Note to Map&rdquo; or click any cell to create one.</p>
          </div>
        ) : (
          notes.map((note) => {
            const isAuthor = currentUserId && note.userId === currentUserId
            const canManage = isAuthor || isOwner
            return (
              <div
                key={note._id}
                className="p-2 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors cursor-pointer group flex items-start justify-between gap-2"
                onClick={() => onSelectNote(note)}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="h-6 w-6 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-200 line-clamp-2 leading-snug">
                      {note.note}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                      {note.authorName && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <User className="h-2.5 w-2.5" />
                          {note.authorName}
                        </span>
                      )}
                      <span>
                        {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      {note.wikiLink && (
                        <a
                          href={formatWikiUrl(note.wikiLink)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-purple-300 hover:text-purple-200 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                          title="Open Void Wiki Article"
                        >
                          <BookOpen className="h-2.5 w-2.5" />
                          Wiki
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteNote(note._id)
                    }}
                    title="Delete note"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
