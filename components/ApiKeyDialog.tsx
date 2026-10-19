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

function FirefoxIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
            aria-hidden="true"
        >
            <path d="M8.824 7.287c.008 0 .004 0 0 0zm-2.8-1.4c.006 0 .003 0 0 0zm16.754 2.161c-.505-1.215-1.53-2.528-2.333-2.943.654 1.283 1.033 2.57 1.177 3.53l.002.02c-1.314-3.278-3.544-4.6-5.366-7.477-.091-.147-.184-.292-.273-.446a3.545 3.545 0 01-.13-.24 2.118 2.118 0 01-.172-.46.03.03 0 00-.027-.03.038.038 0 00-.021 0l-.006.001a.037.037 0 00-.01.005L15.624 0c-2.585 1.515-3.657 4.168-3.932 5.856a6.197 6.197 0 00-2.305.587.297.297 0 00-.147.37c.057.162.24.24.396.17a5.622 5.622 0 012.008-.523l.067-.005a5.847 5.847 0 011.957.222l.095.03a5.816 5.816 0 01.616.228c.08.036.16.073.238.112l.107.055a5.835 5.835 0 01.368.211 5.953 5.953 0 012.034 2.104c-.62-.437-1.733-.868-2.803-.681 4.183 2.09 3.06 9.292-2.737 9.02a5.164 5.164 0 01-1.513-.292 4.42 4.42 0 01-.538-.232c-1.42-.735-2.593-2.121-2.74-3.806 0 0 .537-2 3.845-2 .357 0 1.38-.998 1.398-1.287-.005-.095-2.029-.9-2.817-1.677-.422-.416-.622-.616-.8-.767a3.47 3.47 0 00-.301-.227 5.388 5.388 0 01-.032-2.842c-1.195.544-2.124 1.403-2.8 2.163h-.006c-.46-.584-.428-2.51-.402-2.913-.006-.025-.343.176-.389.206-.406.29-.787.616-1.136.974-.397.403-.76.839-1.085 1.303a9.816 9.816 0 00-1.562 3.52c-.003.013-.11.487-.19 1.073-.013.09-.026.181-.037.272a7.8 7.8 0 00-.069.667l-.002.034-.023.387-.001.06C.386 18.795 5.593 24 12.016 24c5.752 0 10.527-4.176 11.463-9.661.02-.149.035-.298.052-.448.232-1.994-.025-4.09-.753-5.844z" />
        </svg>
    )
}

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
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <a
                                href="https://chromewebstore.google.com/detail/void-guild-pathbuilder-sy/fkgfafpjaibkdpcogoagmojkhkplccgn?authuser=0&hl=en-GB"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-2.5 rounded-md border border-border bg-muted/20 hover:bg-muted/50 hover:border-purple-500/40 transition-colors group"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <Chrome className="h-4 w-4 text-purple-400 shrink-0" />
                                    <div className="min-w-0">
                                        <div className="text-xs font-semibold group-hover:text-purple-300 transition-colors truncate">Chrome Extension</div>
                                        <div className="text-[10px] text-muted-foreground truncate">Pathbuilder Sync</div>
                                    </div>
                                </div>
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-purple-300 shrink-0" />
                            </a>

                            <a
                                href="/downloads/void_guild_extenstion-0.0.4.xpi"
                                download
                                className="flex items-center justify-between p-2.5 rounded-md border border-border bg-muted/20 hover:bg-muted/50 hover:border-purple-500/40 transition-colors group"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <FirefoxIcon className="h-4 w-4 text-purple-400 shrink-0" />
                                    <div className="min-w-0">
                                        <div className="text-xs font-semibold group-hover:text-purple-300 transition-colors truncate">Firefox Extension (.xpi)</div>
                                        <div className="text-[10px] text-muted-foreground truncate">v0.0.4 • Lookups & tools</div>
                                    </div>
                                </div>
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-purple-300 shrink-0" />
                            </a>

                            <a
                                href="https://github.com/Zorth/guild-obsidian/releases"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-2.5 rounded-md border border-border bg-muted/20 hover:bg-muted/50 hover:border-purple-500/40 transition-colors group"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <Puzzle className="h-4 w-4 text-purple-400 shrink-0" />
                                    <div className="min-w-0">
                                        <div className="text-xs font-semibold group-hover:text-purple-300 transition-colors truncate">Obsidian Plugin</div>
                                        <div className="text-[10px] text-muted-foreground truncate">Sync campaign notes</div>
                                    </div>
                                </div>
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-purple-300 shrink-0" />
                            </a>
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
