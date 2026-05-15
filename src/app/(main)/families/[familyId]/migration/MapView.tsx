'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export const GEN_COLORS = [
  '#8a1717', '#2d4a4e', '#b8895b', '#a07d2b',
  '#4a6741', '#5b4a82', '#c44a2f', '#1a5276',
]

export type MapMember = {
  id: string; name: string; zi?: string | null; sex: string; gen: number
  branch?: string | null; birth?: string | null; death?: string | null; deceased: boolean
  lat: number | null; lng: number | null; parentIds: string[]
}

type Props = {
  members: MapMember[]
  selectedId: string | null
  placing: boolean
  onMarkerClick: (id: string) => void
  onMapClick: (lat: number, lng: number) => void
}

export default function MapView({ members, selectedId, placing, onMarkerClick, onMapClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const linesRef = useRef<L.Polyline[]>([])

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, { center: [35, 105], zoom: 5 })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map)

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Crosshair cursor + click handler for "placing" mode
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const handler = (e: L.LeafletMouseEvent) => { if (placing) onMapClick(e.latlng.lat, e.latlng.lng) }
    map.on('click', handler)
    map.getContainer().style.cursor = placing ? 'crosshair' : ''
    return () => { map.off('click', handler) }
  }, [placing, onMapClick])

  // Rebuild markers + lines whenever members or selection changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    linesRef.current.forEach(l => l.remove())
    linesRef.current = []

    const locMap = new Map<string, [number, number]>()
    for (const m of members) {
      if (m.lat != null && m.lng != null) locMap.set(m.id, [m.lat, m.lng])
    }

    for (const m of members) {
      const loc = locMap.get(m.id)
      if (!loc) continue

      const isSelected = m.id === selectedId
      const color = GEN_COLORS[(m.gen - 1) % GEN_COLORS.length]
      const size = isSelected ? 22 : 14
      const border = isSelected ? '3px solid #fff' : '2px solid rgba(255,255,255,.85)'

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;background:${color};border:${border};border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.4);cursor:pointer"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        tooltipAnchor: [size / 2 + 4, -size / 2],
      })

      const parts = [
        m.name,
        `第${m.gen}世`,
        m.branch ? m.branch + '支' : null,
        (m.birth || m.death) ? `(${[m.birth, m.death].filter(Boolean).join('—')})` : null,
      ].filter(Boolean)

      const marker = L.marker(loc, { icon })
        .bindTooltip(parts.join(' · '), {
          permanent: isSelected,
          direction: 'top',
          offset: [0, -size / 2 - 4],
        })
        .on('click', () => onMarkerClick(m.id))
        .addTo(map)

      if (isSelected) marker.openTooltip()
      markersRef.current.push(marker)
    }

    // Migration lines: dashed, parent → child
    for (const m of members) {
      const childLoc = locMap.get(m.id)
      if (!childLoc) continue
      for (const parentId of m.parentIds) {
        const parentLoc = locMap.get(parentId)
        if (!parentLoc) continue
        if (childLoc[0] === parentLoc[0] && childLoc[1] === parentLoc[1]) continue
        linesRef.current.push(
          L.polyline([parentLoc, childLoc], {
            color: GEN_COLORS[(m.gen - 1) % GEN_COLORS.length],
            weight: 1.5,
            opacity: 0.5,
            dashArray: '5 5',
          }).addTo(map)
        )
      }
    }
  }, [members, selectedId, onMarkerClick])

  // Pan to selected member if they have a location
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedId) return
    const m = members.find(x => x.id === selectedId)
    if (m?.lat != null && m?.lng != null) {
      map.panTo([m.lat, m.lng], { animate: true })
    }
  }, [selectedId, members])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
