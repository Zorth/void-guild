'use client'

import React from 'react'

export function Select({
  value,
  onValueChange,
  children,
  className,
}: {
  value?: string
  onValueChange?: (val: string) => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      className={`bg-muted/40 border border-border/50 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary ${className || ''}`}
    >
      {children}
    </select>
  )
}

export function SelectTrigger({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <>{children}</>
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return null
}

export function SelectContent({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <option value={value}>{children}</option>
}
