import React, { useMemo } from 'react'

export const MAX_MAP_ZOOM = 32

export interface TilePyramidLayerProps {
  tileUrl: string
  mapWidth: number
  mapHeight: number
  scale: number
  position: { x: number; y: number }
  containerRef: React.RefObject<HTMLDivElement | null>
  viewportRef: React.RefObject<HTMLDivElement | null>
  tileSize?: number
  minZoom?: number
  maxZoom?: number
  imageUpdatedAt?: number
  opacity?: number
}

export function TilePyramidLayer({
  tileUrl,
  mapWidth,
  mapHeight,
  scale,
  position,
  containerRef,
  viewportRef,
  tileSize = 256,
  minZoom = 0,
  maxZoom,
  imageUpdatedAt,
  opacity = 1,
}: TilePyramidLayerProps) {
  // Normalize DeepZoom template URL if user pasted a .dzi URL
  const normalizedTemplate = useMemo(() => {
    let url = (tileUrl || '').trim()
    if (url.endsWith('.dzi')) {
      url = url.replace(/\.dzi$/, '_files/{z}/{x}_{y}.webp')
    }
    return url
  }, [tileUrl])

  // Calculate maximum LOD level in DeepZoom pyramid
  const maxLevel = useMemo(() => {
    if (maxZoom !== undefined && maxZoom > 0) return maxZoom
    const maxDim = Math.max(mapWidth || 2000, mapHeight || 2000)
    return Math.ceil(Math.log2(maxDim))
  }, [mapWidth, mapHeight, maxZoom])

  // Determine current optimal LOD level z based on display scale and screen DPI
  const targetLevel = useMemo(() => {
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1
    // Boost LOD selection for high-DPI screens or zoom transitions:
    // +0.5 to prefer sharper higher-res tiles rather than dropping to blurry lower-res early
    const dprBonus = Math.log2(Math.min(dpr, 2))
    const computedLevel = maxLevel + Math.log2(Math.max(scale, 0.0001)) + dprBonus + 0.35
    const clamped = Math.floor(computedLevel)
    return Math.max(minZoom, Math.min(maxLevel, clamped))
  }, [maxLevel, scale, minZoom])

  // Calculate level dimensions and grid
  const s = 1 / Math.pow(2, maxLevel - targetLevel)
  const levelW = Math.ceil(mapWidth * s)
  const levelH = Math.ceil(mapHeight * s)
  const tSize = tileSize || 256

  const numCols = Math.ceil(levelW / tSize)
  const numRows = Math.ceil(levelH / tSize)

  // Compute visible viewport bounds in map coordinate space [0..mapWidth, 0..mapHeight]
  const visibleTiles = useMemo(() => {
    let minCol = 0
    let maxCol = Math.max(0, numCols - 1)
    let minRow = 0
    let maxRow = Math.max(0, numRows - 1)

    if (containerRef.current && viewportRef.current) {
      const vRect = viewportRef.current.getBoundingClientRect()
      const cRect = containerRef.current.getBoundingClientRect()

      if (vRect.width > 0 && vRect.height > 0 && cRect.width > 0 && cRect.height > 0) {
        const visLeft = Math.max(0, (vRect.left - cRect.left) / scale)
        const visRight = Math.min(mapWidth, (vRect.right - cRect.left) / scale)
        const visTop = Math.max(0, (vRect.top - cRect.top) / scale)
        const visBottom = Math.min(mapHeight, (vRect.bottom - cRect.top) / scale)

        const lvlLeft = visLeft * s
        const lvlRight = visRight * s
        const lvlTop = visTop * s
        const lvlBottom = visBottom * s

        // 1 tile padding on all sides for smooth preloading during pan
        minCol = Math.max(0, Math.floor(lvlLeft / tSize) - 1)
        maxCol = Math.min(numCols - 1, Math.floor(lvlRight / tSize) + 1)
        minRow = Math.max(0, Math.floor(lvlTop / tSize) - 1)
        maxRow = Math.min(numRows - 1, Math.floor(lvlBottom / tSize) + 1)
      }
    }

    const tiles: { col: number; row: number; left: number; top: number; width: number; height: number; url: string }[] = []

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const xInLvl = col * tSize
        const yInLvl = row * tSize
        const wInLvl = Math.min(tSize, levelW - xInLvl)
        const hInLvl = Math.min(tSize, levelH - yInLvl)
        if (wInLvl <= 0 || hInLvl <= 0) continue

        const nativeLeft = xInLvl / s
        const nativeTop = yInLvl / s
        const nativeW = wInLvl / s
        const nativeH = hInLvl / s

        let formattedUrl = normalizedTemplate
          .replace(/\{z\}/g, String(targetLevel))
          .replace(/\{x\}/g, String(col))
          .replace(/\{y\}/g, String(row))

        if (imageUpdatedAt) {
          formattedUrl += (formattedUrl.includes('?') ? '&' : '?') + `t=${imageUpdatedAt}`
        }

        tiles.push({
          col,
          row,
          left: nativeLeft,
          top: nativeTop,
          width: nativeW,
          height: nativeH,
          url: formattedUrl,
        })
      }
    }

    return tiles
  }, [containerRef, viewportRef, mapWidth, mapHeight, scale, position, targetLevel, s, levelW, levelH, tSize, numCols, numRows, normalizedTemplate, imageUpdatedAt])

  if (!normalizedTemplate) return null

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
      style={{ width: `${mapWidth}px`, height: `${mapHeight}px`, opacity }}
    >
      {visibleTiles.map((tile) => (
        <img
          key={`${targetLevel}_${tile.col}_${tile.row}`}
          src={tile.url}
          alt=""
          loading="eager"
          decoding="async"
          draggable={false}
          className="absolute select-none pointer-events-none"
          style={{
            left: `${tile.left}px`,
            top: `${tile.top}px`,
            width: `${tile.width}px`,
            height: `${tile.height}px`,
            objectFit: 'fill',
            imageRendering: 'auto',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      ))}
    </div>
  )
}
