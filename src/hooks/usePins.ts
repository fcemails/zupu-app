'use client'

import { useState, useCallback, useEffect } from 'react'

export type PinEntry = { id: string; name: string; gen: number; branch?: string | null }

const STORAGE_KEY = 'zupu-pins'
const MAX_PINS = 6
const EVENT = 'zupu-pins-changed'

function readAll(): Record<string, PinEntry[]> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}

function writeAll(data: Record<string, PinEntry[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  window.dispatchEvent(new Event(EVENT))
}

export function usePins(familyId: string) {
  const [pins, setPins] = useState<PinEntry[]>([])

  const refresh = useCallback(() => {
    setPins(readAll()[familyId] ?? [])
  }, [familyId])

  useEffect(() => {
    refresh()
    window.addEventListener(EVENT, refresh)
    return () => window.removeEventListener(EVENT, refresh)
  }, [refresh])

  const pin = useCallback((entry: PinEntry) => {
    const all = readAll()
    const list = all[familyId] ?? []
    if (list.some(p => p.id === entry.id)) return
    all[familyId] = [entry, ...list].slice(0, MAX_PINS)
    writeAll(all)
  }, [familyId])

  const unpin = useCallback((id: string) => {
    const all = readAll()
    all[familyId] = (all[familyId] ?? []).filter(p => p.id !== id)
    writeAll(all)
  }, [familyId])

  const isPinned = useCallback((id: string) => pins.some(p => p.id === id), [pins])

  return { pins, pin, unpin, isPinned }
}
