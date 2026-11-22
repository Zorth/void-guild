'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ClipboardList, Package, Check, PackageCheck, X, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import ServiceOrderDialog from '@/components/black-void/ServiceOrderDialog'

const STATUS_STYLES: Record<string, string> = {
  proposed: 'bg-sky-500/20 text-sky-300',
  agreed: 'bg-amber-500/20 text-amber-300',
  delivered: 'bg-emerald-500/20 text-emerald-300',
  cancelled: 'bg-muted text-muted-foreground',
}

interface ServiceOrdersCardProps {
  characterId: Id<'characters'>
  orders: any[]
  inquiries: any[]
}

export default function ServiceOrdersCard({ characterId, orders, inquiries }: ServiceOrdersCardProps) {
  const [countering, setCountering] = useState<any | null>(null)
  const [proposing, setProposing] = useState<any | null>(null)
  const acceptOrder = useMutation(api.blackVoidOrders.acceptOrder)
  const cancelOrder = useMutation(api.blackVoidOrders.cancelOrder)
  const markDelivered = useMutation(api.blackVoidOrders.markDelivered)
  const toggleOrderClaimed = useMutation(api.blackVoidOrders.toggleOrderClaimed)

  if (orders.length === 0 && inquiries.length === 0) return null

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action()
      toast.success(success)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order.')
    }
  }

  return (
    <Card className="border-sky-500/30 bg-card/60 overflow-hidden">
      <CardHeader className="p-3.5 sm:p-5 border-b border-border/20">
        <CardTitle className="text-sm sm:text-base font-bold flex flex-wrap items-center justify-between gap-2 text-sky-300">
          <span className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 text-sky-400 shrink-0" />
            <span>Standing Service Orders</span>
          </span>
          <span className="text-[11px] font-mono text-muted-foreground font-normal">Agreed Commissions</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3.5 sm:p-5">
        <div className="space-y-3">
          {inquiries.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Recent Inquiries</h4>
              {inquiries.map((inq: any) => (
                <div
                  key={inq._id}
                  className="p-2.5 rounded-lg border bg-muted/10 border-border/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <span className="min-w-0 break-words">
                    <strong className="text-foreground">{inq.serviceName}</strong>{' '}
                    <span className="text-muted-foreground">
                      {inq.role === 'buyer' ? 'with' : 'requested by'} {inq.counterpartName}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs border-sky-500/40 text-sky-300 hover:bg-sky-500/20 gap-1 self-end sm:self-auto shrink-0"
                    onClick={() => setProposing(inq)}
                  >
                    <ClipboardList className="h-3 w-3" />
                    Propose Order
                  </Button>
                </div>
              ))}
            </div>
          )}
          {orders.map((order: any) => {
            const isProvider = order.role === 'provider'
            const isOpen = order.status === 'proposed' || order.status === 'agreed'
            const claimLabel = isProvider
              ? order.isClaimed ? 'Payment Added ✓' : 'Add Payment to Sheet'
              : order.isClaimed ? 'Recorded on Sheet ✓' : 'Record on Sheet'
            // Provider with nothing to be paid has nothing to record
            const showClaim = order.status === 'delivered' && (!isProvider || order.priceGp > 0)

            return (
              <div
                key={order._id}
                className="p-3 rounded-lg border bg-muted/20 border-border/30 flex flex-col gap-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-xs sm:text-sm text-foreground break-words">{order.serviceName}</h4>
                      <span className={cn('text-[10px] uppercase font-bold px-1.5 py-0.5 rounded', STATUS_STYLES[order.status])}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground break-words">
                      {isProvider ? 'Provided to' : 'Ordered from'}{' '}
                      <strong className="text-foreground">{order.counterpartName}</strong>
                    </p>
                    <p className="text-xs font-mono break-words">
                      {order.priceGp > 0 && (
                        <span className={isProvider ? 'text-emerald-300' : 'text-amber-300'}>
                          {isProvider ? '+' : '-'}{order.priceGp} GP
                        </span>
                      )}
                      {order.priceGp > 0 && order.itemName && <span className="text-muted-foreground"> • </span>}
                      {order.itemName && (
                        <span className="text-cyan-300 inline-flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {order.itemQty && order.itemQty > 1 ? `${order.itemQty}× ` : ''}
                          {order.itemName}
                          {isProvider ? ' (to deliver)' : ''}
                        </span>
                      )}
                    </p>
                    {order.description && (
                      <p className="text-xs text-muted-foreground whitespace-pre-line break-words">{order.description}</p>
                    )}
                    {order.status === 'proposed' && !order.canAccept && (
                      <p className="text-[11px] text-sky-300/80">Waiting for {order.counterpartName} to accept your terms.</p>
                    )}
                  </div>

                  {isOpen && (
                    <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto shrink-0">
                      {order.canAccept && (
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          onClick={() => run(() => acceptOrder({ orderId: order._id, characterId }), 'Order agreed.')}
                        >
                          <Check className="h-3 w-3" />
                          Accept
                        </Button>
                      )}
                      {order.status === 'agreed' && (
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1"
                          onClick={() =>
                            run(() => markDelivered({ orderId: order._id, characterId }), 'Order marked as delivered.')
                          }
                        >
                          <PackageCheck className="h-3 w-3" />
                          Mark Delivered
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-sky-300 hover:bg-sky-500/20 border border-sky-500/30 gap-1"
                        onClick={() => setCountering(order)}
                      >
                        <Pencil className="h-3 w-3" />
                        Change Terms
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-red-400 hover:bg-red-500/20 border border-red-500/30 gap-1"
                        onClick={() => {
                          if (!window.confirm(`Cancel the order for "${order.serviceName}"?`)) return
                          void run(() => cancelOrder({ orderId: order._id, characterId }), 'Order cancelled.')
                        }}
                      >
                        <X className="h-3 w-3" />
                        Cancel
                      </Button>
                    </div>
                  )}

                  {showClaim && (
                    <label className="flex items-center gap-2 cursor-pointer bg-background/60 hover:bg-background px-2.5 py-1.5 rounded-md border border-emerald-500/30 text-xs self-end sm:self-auto shrink-0">
                      <Checkbox
                        checked={order.isClaimed}
                        onCheckedChange={() =>
                          run(() => toggleOrderClaimed({ orderId: order._id, characterId }), 'Updated character sheet log state!')
                        }
                        className="border-emerald-400 data-[state=checked]:bg-emerald-600"
                      />
                      <span className={cn('font-medium text-[11px]', order.isClaimed ? 'text-emerald-300' : 'text-muted-foreground')}>
                        {claimLabel}
                      </span>
                    </label>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>

      <ServiceOrderDialog
        isOpen={!!proposing}
        onClose={() => setProposing(null)}
        inquiry={proposing}
        characterId={characterId}
      />
      <ServiceOrderDialog
        isOpen={!!countering}
        onClose={() => setCountering(null)}
        order={countering}
        characterId={characterId}
      />
    </Card>
  )
}
