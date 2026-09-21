'use client'

import { useState, useEffect, useCallback } from 'react'

const PF_STORAGE_KEY = 'void_filter_pf'
const DND_STORAGE_KEY = 'void_filter_dnd'

function getInitialValue(key: string, defaultValue: boolean): boolean {
  if (typeof window === 'undefined') return defaultValue
  try {
    const item = window.localStorage.getItem(key)
    if (item === null) return defaultValue
    return item === 'true'
  } catch {
    return defaultValue
  }
}

export function useSystemFilters() {
  const [pfFilter, setPfFilterState] = useState<boolean>(() => getInitialValue(PF_STORAGE_KEY, true))
  const [dndFilter, setDndFilterState] = useState<boolean>(() => getInitialValue(DND_STORAGE_KEY, true))

  // Listen for storage events across tabs or local custom events in the same tab
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent | CustomEvent) => {
      if ('key' in e) {
        if (e.key === PF_STORAGE_KEY && e.newValue !== null) {
          setPfFilterState(e.newValue === 'true')
        }
        if (e.key === DND_STORAGE_KEY && e.newValue !== null) {
          setDndFilterState(e.newValue === 'true')
        }
      } else if (e.type === 'void_system_filter_change') {
        const detail = (e as CustomEvent).detail
        if (detail?.key === PF_STORAGE_KEY) {
          setPfFilterState(detail.value)
        }
        if (detail?.key === DND_STORAGE_KEY) {
          setDndFilterState(detail.value)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange as EventListener)
    window.addEventListener('void_system_filter_change', handleStorageChange as EventListener)

    return () => {
      window.removeEventListener('storage', handleStorageChange as EventListener)
      window.removeEventListener('void_system_filter_change', handleStorageChange as EventListener)
    }
  }, [])

  const setPfFilter = useCallback((valueOrFn: boolean | ((prev: boolean) => boolean)) => {
    setPfFilterState((prev) => {
      const next = typeof valueOrFn === 'function' ? valueOrFn(prev) : valueOrFn
      try {
        window.localStorage.setItem(PF_STORAGE_KEY, String(next))
        window.dispatchEvent(
          new CustomEvent('void_system_filter_change', {
            detail: { key: PF_STORAGE_KEY, value: next },
          })
        )
      } catch (err) {
        console.error('Failed to save PF filter to localStorage:', err)
      }
      return next
    })
  }, [])

  const setDndFilter = useCallback((valueOrFn: boolean | ((prev: boolean) => boolean)) => {
    setDndFilterState((prev) => {
      const next = typeof valueOrFn === 'function' ? valueOrFn(prev) : valueOrFn
      try {
        window.localStorage.setItem(DND_STORAGE_KEY, String(next))
        window.dispatchEvent(
          new CustomEvent('void_system_filter_change', {
            detail: { key: DND_STORAGE_KEY, value: next },
          })
        )
      } catch (err) {
        console.error('Failed to save D&D filter to localStorage:', err)
      }
      return next
    })
  }, [])

  return {
    pfFilter,
    dndFilter,
    setPfFilter,
    setDndFilter,
  }
}
