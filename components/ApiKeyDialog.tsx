'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Key, Copy, Check, RotateCw, Trash2, Eye, EyeOff, FileCode2, BookOpen, Puzzle, Chrome, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export function ApiKeyDialog({ open, onOpenChange }: { open?: boolean, onOpenChange?: (open: boolean) => void }) {
    const apiKey = useQuery(api.users.getApiKey)
    const generateKey = useMutation(api.users.generateApiKey)
    const revokeKey = useMutation(api.users.revokeApiKey)
    
    const [isVisible, setIsVisible] = useState(false)
    const [isCopied, setIsCopied] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)

    const handleGenerate = async () => {
        setIsGenerating(true)
        try {
            await generateKey()
            toast.success('New API key generated')
        } catch (e) {
            toast.error('Failed to generate API key')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleRevoke = async () => {
        if (!confirm('Are you sure you want to revoke your API key? Any tools using it will stop working.')) return
        try {
            await revokeKey()
            toast.success('API key revoked')
        } catch (e) {
            toast.error('Failed to revoke API key')
        }
    }

    const handleCopy = () => {
        if (!apiKey) return
        navigator.clipboard.writeText(apiKey)
        setIsCopied(true)
        toast.success('API key copied to clipboard')
        setTimeout(() => setIsCopied(false), 2000)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {!onOpenChange && (
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2 h-9 w-9 sm:w-auto sm:px-3 p-0">
                        <Key className="h-4 w-4" />
                        <span className="hidden sm:inline">API Access</span>
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
                <DialogHeader className="pb-3 border-b border-border">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <Key className="h-5 w-5 text-purple-400" />
                        API Access & Integrations
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Manage your API key and connect Guild of The Void with external tools and clients.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4 overflow-y-auto pr-1">
                    {apiKey ? (
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Your Secret API Key</label>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            type={isVisible ? 'text' : 'password'}
                                            value={apiKey}
                                            readOnly
                                            className="font-mono text-sm pr-20 bg-muted/40"
                                        />
                                        <div className="absolute right-1 top-1 flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => setIsVisible(!isVisible)}
                                                title={isVisible ? "Hide API key" : "Show API key"}
                                            >
                                                {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={handleCopy}
                                                title="Copy API key"
                                            >
                                                {isCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/40 rounded-lg p-3.5 text-xs space-y-2 border border-border">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">Example cURL Request</p>
                                    <span className="text-[10px] text-muted-foreground/80">Authorized GET / PATCH</span>
                                </div>
                                <pre className="bg-background/80 p-2.5 rounded border border-border overflow-x-auto whitespace-pre-wrap break-all text-[11px] font-mono leading-relaxed text-foreground/90">
                                    <code>{`curl -H "Authorization: Bearer ${isVisible ? apiKey : 'YOUR_KEY'}" \\
  "https://guild.tarragon.be/api/external/v1/session/[ID]/characters"`}</code>
                                </pre>
                            </div>

                            <div className="flex justify-between items-center pt-1">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-xs gap-2"
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                >
                                    <RotateCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                                    Regenerate Key
                                </Button>
                                <Button 
                                    variant="destructive" 
                                    size="sm" 
                                    className="text-xs gap-2"
                                    onClick={handleRevoke}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Revoke Access
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 space-y-4">
                            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                                <Key className="h-6 w-6 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <p className="font-medium">No API key found</p>
                                <p className="text-sm text-muted-foreground">Generate a key to start using external integrations.</p>
                            </div>
                            <Button onClick={handleGenerate} disabled={isGenerating}>
                                {isGenerating ? 'Generating...' : 'Generate API Key'}
                            </Button>
                        </div>
                    )}

                    {/* Documentation & Specs */}
                    <div className="border-t border-border pt-4 space-y-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold">Documentation & Spec Sheets</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <a
                                href="https://github.com/Zorth/void-guild/blob/main/API.md"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-2.5 rounded-md border border-border bg-muted/20 hover:bg-muted/50 hover:border-purple-500/40 transition-colors group"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <BookOpen className="h-4 w-4 text-purple-400 shrink-0" />
                                    <div className="min-w-0">
                                        <div className="text-xs font-semibold group-hover:text-purple-300 transition-colors truncate">API Spec Sheet</div>
                                        <div className="text-[10px] text-muted-foreground truncate">Markdown guide & endpoint docs</div>
                                    </div>
                                </div>
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-purple-300 shrink-0" />
                            </a>

                            <Link
                                href="/api/external/v1/docs"
                                target="_blank"
                                className="flex items-center justify-between p-2.5 rounded-md border border-border bg-muted/20 hover:bg-muted/50 hover:border-purple-500/40 transition-colors group"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <FileCode2 className="h-4 w-4 text-purple-400 shrink-0" />
                                    <div className="min-w-0">
                                        <div className="text-xs font-semibold group-hover:text-purple-300 transition-colors truncate">API JSON Endpoint</div>
                                        <div className="text-[10px] text-muted-foreground truncate">/api/external/v1/docs</div>
                                    </div>
                                </div>
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-purple-300 shrink-0" />
                            </Link>
                        </div>
                    </div>

                    {/* Ecosystem & Plugins */}
                    <div className="border-t border-border pt-4 space-y-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold">Client Integrations</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="flex items-center justify-between p-2.5 rounded-md border border-border/80 bg-muted/10 opacity-80">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <Puzzle className="h-4 w-4 text-purple-400 shrink-0" />
                                    <div className="min-w-0">
                                        <div className="text-xs font-semibold truncate">Obsidian Plugin</div>
                                        <div className="text-[10px] text-muted-foreground truncate">Sync campaign notes & characters</div>
                                    </div>
                                </div>
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wide shrink-0">
                                    Coming Soon
                                </span>
                            </div>

                            <div className="flex items-center justify-between p-2.5 rounded-md border border-border/80 bg-muted/10 opacity-80">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <Chrome className="h-4 w-4 text-purple-400 shrink-0" />
                                    <div className="min-w-0">
                                        <div className="text-xs font-semibold truncate">Browser Extension</div>
                                        <div className="text-[10px] text-muted-foreground truncate">Quick lookups & notifications</div>
                                    </div>
                                </div>
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wide shrink-0">
                                    Coming Soon
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Common endpoints */}
                    <div className="border-t border-border pt-4">
                        <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-wide font-bold mb-2">Endpoint Reference Highlights</p>
                        <ul className="text-xs space-y-2 text-muted-foreground">
                            <li className="flex items-center gap-2">
                                <code className="bg-muted px-1.5 py-0.5 rounded text-emerald-400 font-bold text-[11px]">POST</code>
                                <span className="font-mono text-[11px] truncate">/api/external/v1/character/[characterId]/sheet</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-bold text-[11px]">GET</code>
                                <span className="font-mono text-[11px] truncate">/api/external/v1/character/[characterId]/sheet</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-bold text-[11px]">GET</code>
                                <span className="font-mono text-[11px] truncate">/api/external/v1/session/[sessionId]/characters</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <code className="bg-muted px-1.5 py-0.5 rounded text-amber-400 font-bold text-[11px]">PATCH</code>
                                <span className="font-mono text-[11px] truncate">/api/external/v1/world/[worldId]/calendar</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
