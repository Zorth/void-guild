'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Download, FileJson, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'

interface ManualCharacterImportDialogProps {
  isOpen: boolean
  onClose: () => void
  characterId: Id<'characters'> | null
}

export default function ManualCharacterImportDialog({
  isOpen,
  onClose,
  characterId,
}: ManualCharacterImportDialogProps) {
  const [importMode, setImportMode] = useState<'id' | 'json'>('id')
  const [pathbuilderId, setPathbuilderId] = useState('')
  const [jsonText, setJsonText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [previewBuild, setPreviewBuild] = useState<any | null>(null)

  const importCharacterSheet = useMutation(api.characters.importCharacterSheet)

  const resetState = () => {
    setPathbuilderId('')
    setJsonText('')
    setIsLoading(false)
    setPreviewBuild(null)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState()
      onClose()
    }
  }

  const handleFetchById = async () => {
    const cleanId = pathbuilderId.trim().replace(/[^0-9]/g, '')
    if (!cleanId) {
      toast.error('Please enter a valid numeric Pathbuilder export ID.')
      return
    }

    setIsLoading(true)
    setPreviewBuild(null)
    try {
      const res = await fetch(`/api/pathbuilder?id=${cleanId}`)
      const data = await res.json()

      if (!res.ok || !data.success || !data.build) {
        throw new Error(data.error || 'Failed to fetch Pathbuilder export.')
      }

      setPreviewBuild(data.build)
      toast.success(`Fetched Pathbuilder build: ${data.build.name || 'Character'}`)
    } catch (err: any) {
      toast.error(err.message || 'Error fetching Pathbuilder data.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleParseJson = () => {
    if (!jsonText.trim()) {
      toast.error('Please paste Pathbuilder export JSON code.')
      return
    }

    try {
      const parsed = JSON.parse(jsonText.trim())
      const build = parsed.build || parsed.character || parsed
      if (!build || typeof build !== 'object') {
        throw new Error('JSON does not contain a valid Pathbuilder build object.')
      }
      setPreviewBuild(build)
      toast.success(`Parsed build: ${build.name || 'Character'}`)
    } catch (err: any) {
      toast.error(`Invalid JSON: ${err.message || 'Check your pasted text.'}`)
    }
  }

  const handleApplyImport = async () => {
    if (!characterId) {
      toast.error('No character selected.')
      return
    }

    let buildToApply = previewBuild
    if (!buildToApply) {
      if (importMode === 'id') {
        toast.error('Please fetch the Pathbuilder build first.')
        return
      } else {
        try {
          const parsed = JSON.parse(jsonText.trim())
          buildToApply = parsed.build || parsed.character || parsed
        } catch {
          toast.error('Please enter valid JSON before importing.')
          return
        }
      }
    }

    if (!buildToApply) {
      toast.error('No valid build data to import.')
      return
    }

    setIsLoading(true)
    try {
      const res = await importCharacterSheet({
        characterId,
        build: buildToApply,
      })
      toast.success(`Successfully imported character sheet for ${res.characterName}!`)
      handleOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to import character sheet.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg bg-card/95 border-purple-500/40 backdrop-blur-md shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-purple-300">
            <Download className="h-5 w-5 text-purple-400" />
            Manual Character Import
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Import and synchronize your Pathfinder 2e character sheet from Pathbuilder (stats, HP, AC, saves, skills, inventory gear &amp; money).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Tabs: Export ID vs Raw JSON */}
          <div className="flex border-b border-border/60 text-xs">
            <button
              type="button"
              onClick={() => {
                setImportMode('id')
                setPreviewBuild(null)
              }}
              className={`px-3 py-2 font-semibold border-b-2 transition-colors ${
                importMode === 'id'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Fetch via Export ID
            </button>
            <button
              type="button"
              onClick={() => {
                setImportMode('json')
                setPreviewBuild(null)
              }}
              className={`px-3 py-2 font-semibold border-b-2 transition-colors ${
                importMode === 'json'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Paste Raw JSON Code
            </button>
          </div>

          {importMode === 'id' ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Pathbuilder Export ID</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    e.g. 470417
                  </span>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter Pathbuilder export ID (e.g. 470417)"
                    value={pathbuilderId}
                    onChange={(e) => setPathbuilderId(e.target.value)}
                    className="font-mono text-xs bg-background/80 border-purple-500/30 focus-visible:ring-purple-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleFetchById()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleFetchById}
                    disabled={isLoading || !pathbuilderId.trim()}
                    className="shrink-0 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs h-9 px-3 gap-1.5"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Fetch
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed pt-0.5">
                  In Pathbuilder 2e web/app, choose <em>Export</em> &rarr; <em>Export JSON</em> to get your numeric ID.
                  The ID is only used for this one-time fetch and is not stored or linked to your character.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Pathbuilder Export JSON</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Full JSON code or &quot;build&quot; object
                  </span>
                </label>
                <Textarea
                  rows={6}
                  placeholder='Paste {"success":true,"build":{...}} or JSON export code here...'
                  value={jsonText}
                  onChange={(e) => {
                    setJsonText(e.target.value)
                    setPreviewBuild(null)
                  }}
                  className="font-mono text-xs bg-background/80 border-purple-500/30 focus-visible:ring-purple-400 resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleParseJson}
                    disabled={!jsonText.trim()}
                    className="text-xs h-7 px-2.5 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 gap-1"
                  >
                    <FileJson className="h-3 w-3" />
                    Validate JSON
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Build preview info box */}
          {previewBuild && (
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Ready to Import: {previewBuild.name || 'Unnamed Character'}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                <div>
                  <span className="text-foreground font-semibold">Class:</span>{' '}
                  {previewBuild.class || 'N/A'}
                </div>
                <div>
                  <span className="text-foreground font-semibold">Level:</span>{' '}
                  {previewBuild.level ?? 1}
                </div>
                <div>
                  <span className="text-foreground font-semibold">Ancestry:</span>{' '}
                  {previewBuild.ancestry || 'N/A'}
                </div>
                <div>
                  <span className="text-foreground font-semibold">Purse:</span>{' '}
                  {previewBuild.money?.gp ?? 0} GP, {previewBuild.money?.sp ?? 0} SP
                </div>
                <div>
                  <span className="text-foreground font-semibold">Weapons:</span>{' '}
                  {Array.isArray(previewBuild.weapons) ? previewBuild.weapons.length : 0}
                </div>
                <div>
                  <span className="text-foreground font-semibold">Equipment:</span>{' '}
                  {Array.isArray(previewBuild.equipment) ? previewBuild.equipment.length : 0}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/30">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            className="text-xs h-9 text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApplyImport}
            disabled={isLoading || (!previewBuild && (importMode === 'id' || !jsonText.trim()))}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-md shadow-purple-900/30"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Import Character Sheet
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
