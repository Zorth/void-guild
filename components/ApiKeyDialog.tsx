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
import { Key, Copy, Check, RotateCw, Trash2, Eye, EyeOff } from 'lucide-react'
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
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>API Access</DialogTitle>
                    <DialogDescription>
                        Use this API key to access your characters and world data from external tools.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                    {apiKey ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        type={isVisible ? 'text' : 'password'}
                                        value={apiKey}
                                        readOnly
                                        className="font-mono pr-20"
                                    />
                                    <div className="absolute right-1 top-1 flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setIsVisible(!isVisible)}
                                        >
                                            {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={handleCopy}
                                        >
                                            {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/50 rounded-lg p-4 text-xs space-y-2 border border-border">
                                <p className="font-bold text-muted-foreground uppercase tracking-wider">Example Usage</p>
                                <pre className="bg-background p-2 rounded border border-border overflow-x-auto">
                                    <code>{`curl -H "Authorization: Bearer ${isVisible ? apiKey : 'YOUR_KEY'}" \\
  "https://guild.tarragon.be/api/external/v1/session/[ID]/characters"`}</code>
                                </pre>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-xs gap-2"
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                >
                                    <RotateCw className={`h-3 w-3 ${isGenerating ? 'animate-spin' : ''}`} />
                                    Regenerate Key
                                </Button>
                                <Button 
                                    variant="destructive" 
                                    size="sm" 
                                    className="text-xs gap-2"
                                    onClick={handleRevoke}
                                >
                                    <Trash2 className="h-3 w-3" />
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

                    <div className="border-t border-border pt-4">
                        <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-wide font-bold mb-2">Endpoint Reference</p>
                        <ul className="text-xs space-y-2 text-muted-foreground">
                            <li className="flex gap-2">
                                <code className="bg-muted px-1 rounded text-primary font-bold">GET</code>
                                <span>/api/external/v1/session/[sessionId]/characters</span>
                            </li>
                            <li className="flex gap-2">
                                <code className="bg-muted px-1 rounded text-primary font-bold">GET</code>
                                <span>/api/external/v1/world/[worldId]/calendar</span>
                            </li>
                            <li className="flex gap-2">
                                <code className="bg-muted px-1 rounded text-primary font-bold">PATCH</code>
                                <span>/api/external/v1/world/[worldId]/calendar</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
