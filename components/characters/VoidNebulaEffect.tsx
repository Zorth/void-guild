'use client'

import React, { useEffect, useRef } from 'react'

interface StarMote {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  baseAlpha: number
  pulseSpeed: number
  pulseOffset: number
  hue: number
}

export default function VoidNebulaEffect({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = 0
    let height = 0
    let motes: StarMote[] = []

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height

      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)

      // Initialize cosmic dust motes
      if (width > 0 && height > 0 && motes.length === 0) {
        motes = Array.from({ length: 18 }, () => ({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: 0.05 + Math.random() * 0.15,
          vy: -0.05 - Math.random() * 0.12,
          size: 0.7 + Math.random() * 1.5,
          baseAlpha: 0.3 + Math.random() * 0.45,
          pulseSpeed: 1.5 + Math.random() * 2.5,
          pulseOffset: Math.random() * Math.PI * 2,
          hue: 270 + Math.random() * 35, // Purple to magenta
        }))
      }
    }

    const ro = new ResizeObserver(() => {
      resize()
    })

    if (canvas.parentElement) {
      ro.observe(canvas.parentElement)
    }
    resize()

    let startTime = performance.now()

    const render = (now: number) => {
      const elapsed = (now - startTime) * 0.001

      ctx.clearRect(0, 0, width, height)

      if (width <= 0 || height <= 0) {
        animationFrameId = requestAnimationFrame(render)
        return
      }

      ctx.save()
      ctx.globalCompositeOperation = 'screen'

      // 1. Nebula Cloud A (Radiant Violet Flow)
      const cx1 = width * 0.28 + Math.cos(elapsed * 0.6) * width * 0.15
      const cy1 = height * 0.35 + Math.sin(elapsed * 0.5) * height * 0.2
      const r1 = Math.max(width, height) * 0.55 + Math.sin(elapsed * 0.9) * 15
      const grad1 = ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, r1)
      grad1.addColorStop(0, 'rgba(192, 132, 252, 0.32)')
      grad1.addColorStop(0.4, 'rgba(147, 51, 234, 0.18)')
      grad1.addColorStop(1, 'rgba(147, 51, 234, 0)')
      ctx.fillStyle = grad1
      ctx.fillRect(0, 0, width, height)

      // 2. Nebula Cloud B (Deep Void Purple Swirl)
      const cx2 = width * 0.72 + Math.sin(elapsed * 0.55) * width * 0.18
      const cy2 = height * 0.68 + Math.cos(elapsed * 0.7) * height * 0.18
      const r2 = Math.max(width, height) * 0.6 + Math.cos(elapsed * 0.8) * 20
      const grad2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r2)
      grad2.addColorStop(0, 'rgba(168, 85, 247, 0.28)')
      grad2.addColorStop(0.5, 'rgba(88, 28, 135, 0.16)')
      grad2.addColorStop(1, 'rgba(88, 28, 135, 0)')
      ctx.fillStyle = grad2
      ctx.fillRect(0, 0, width, height)

      // 3. Nebula Cloud C (Stellar Magenta Core Pulse)
      const cx3 = width * 0.5 + Math.sin(elapsed * 0.85 + 1.5) * width * 0.22
      const cy3 = height * 0.5 + Math.cos(elapsed * 0.95 + 1.5) * height * 0.15
      const r3 = Math.max(width, height) * 0.35 + Math.sin(elapsed * 1.3) * 12
      const grad3 = ctx.createRadialGradient(cx3, cy3, 0, cx3, cy3, r3)
      grad3.addColorStop(0, 'rgba(232, 121, 249, 0.25)')
      grad3.addColorStop(0.6, 'rgba(126, 34, 206, 0.12)')
      grad3.addColorStop(1, 'rgba(126, 34, 206, 0)')
      ctx.fillStyle = grad3
      ctx.fillRect(0, 0, width, height)

      // 4. Drifting Cosmic Motes
      for (const m of motes) {
        m.x += m.vx
        m.y += m.vy

        // Wrap around boundaries
        if (m.x > width + 5) m.x = -5
        if (m.x < -5) m.x = width + 5
        if (m.y < -5) m.y = height + 5
        if (m.y > height + 5) m.y = -5

        const pulse = Math.sin(elapsed * m.pulseSpeed + m.pulseOffset) * 0.5 + 0.5
        const alpha = m.baseAlpha * (0.4 + pulse * 0.6)

        ctx.fillStyle = `hsla(${m.hue}, 90%, 75%, ${alpha})`
        ctx.shadowColor = `hsla(${m.hue}, 100%, 80%, ${alpha})`
        ctx.shadowBlur = 4
        ctx.beginPath()
        ctx.arc(m.x, m.y, m.size * (0.8 + pulse * 0.3), 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()

      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationFrameId)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 rounded-[inherit] z-0 overflow-hidden ${className || ''}`}
    />
  )
}
