import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FileText, User, ExternalLink, BookOpen, Trash2 } from 'lucide-react'
import { Id } from '@/convex/_generated/dataModel'
import { formatWikiUrl } from '@/lib/utils'

export interface NoteData {
  _id: Id<'mapGridNotes'>
  userId: string
  authorName?: string
  note: string
  wikiLink?: string
  cellKey?: string
  updatedAt: number
}

interface MapNoteModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  selectedNoteData: NoteData | null
  selectedCellKey: string | null
  draftNote: string
  onChangeDraftNote: (val: string) => void
  draftWikiLink: string
  onChangeDraftWikiLink: (val: string) => void
  currentUserId?: string
  isOwner: boolean
  onSave: () => void
  onDelete: (noteId?: Id<'mapGridNotes'>) => void
}

export function MapNoteModal({
  isOpen,
  onOpenChange,
  selectedNoteData,
  selectedCellKey,
  draftNote,
  onChangeDraftNote,
  draftWikiLink,
  onChangeDraftWikiLink,
  currentUserId,
  isOwner,
  onSave,
  onDelete,
}: MapNoteModalProps) {
  const isAuthor = currentUserId && selectedNoteData?.userId === currentUserId
  const isNew = !selectedNoteData
  const canEdit = isNew || isAuthor || isOwner
  const canDelete = !isNew && (isAuthor || isOwner)

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-950 dark:bg-slate-950 border-slate-800 text-slate-100">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-100">
              <FileText className="h-4 w-4 text-amber-400" />
              Map Note
            </DialogTitle>
            {selectedCellKey && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                {selectedCellKey.startsWith('point_') ? 'Coordinate Marker' : `Cell: ${selectedCellKey}`}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {selectedNoteData && (
            <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-md border border-slate-800">
              <span className="flex items-center gap-1.5 text-slate-300">
                <User className="h-3 w-3 text-amber-400" />
                By <strong className="text-slate-100">{selectedNoteData.authorName || 'Adventurer'}</strong>
                {isAuthor && <span className="text-[10px] text-amber-400 font-mono">(You)</span>}
              </span>
              <span>
                {new Date(selectedNoteData.updatedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">
              {canEdit ? 'Note Content' : 'Note Content (Read Only)'}
            </label>
            <Textarea
              value={draftNote}
              onChange={(e) => onChangeDraftNote(e.target.value)}
              readOnly={!canEdit}
              placeholder={canEdit ? "Write location observation, secret clues, or adventure notes..." : "No note written."}
              className={`min-h-[140px] text-xs font-sans ${
                !canEdit ? 'bg-slate-900/40 border-slate-800 text-slate-300 cursor-default' : 'bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500'
              }`}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">
              Wiki Link (Optional)
            </label>
            {canEdit ? (
              <div className="space-y-1">
                <div className="relative">
                  <Input
                    value={draftWikiLink}
                    onChange={(e) => onChangeDraftWikiLink(e.target.value)}
                    placeholder="https://void.tarragon.be/notes/... or /notes/my-location"
                    className="text-xs font-mono pr-8 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
                  />
                  {draftWikiLink && (
                    <a
                      href={formatWikiUrl(draftWikiLink)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300"
                      title="Test Wiki Link"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  Link to campaign lore, articles, or notes on{' '}
                  <a
                    href="https://void.tarragon.be"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:underline"
                  >
                    void.tarragon.be
                  </a>
                </p>
              </div>
            ) : selectedNoteData?.wikiLink ? (
              <div className="pt-0.5">
                <a
                  href={formatWikiUrl(selectedNoteData.wikiLink)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-purple-950/40 border border-purple-800/60 text-purple-200 hover:bg-purple-900/50 hover:text-purple-100 transition-colors text-xs font-medium w-full"
                >
                  <BookOpen className="h-4 w-4 text-purple-400 shrink-0" />
                  <span className="truncate flex-1 font-mono text-[11px]">{selectedNoteData.wikiLink}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                </a>
              </div>
            ) : (
              <p className="text-xs italic text-slate-500">No wiki link attached.</p>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between w-full">
          <div>
            {canDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-destructive hover:bg-destructive/10 gap-1"
                onClick={() => onDelete(selectedNoteData._id)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Note
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs border-slate-700 bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800"
              onClick={() => onOpenChange(false)}
            >
              {canEdit ? 'Cancel' : 'Close'}
            </Button>
            {canEdit && (
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                onClick={onSave}
              >
                Save Note
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
