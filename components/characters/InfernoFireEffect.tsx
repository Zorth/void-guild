'use client'

import React, { useEffect, useRef } from 'react'

interface FireParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  baseAlpha: number
  hue: number // 10 (red) to 45 (gold)
}

export default function InfernoFireEffect({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = 0
    let height = 0
    let particles: FireParticle[] = []

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
    }

    const ro = new ResizeObserver(() => {
      resize()
    })

    if (canvas.parentElement) {
      ro.observe(canvas.parentElement)
    }
    resize()

    let startTime = performance.now()

    // Helper to draw an undulating flame silhouette layer
    const drawFlameLayer = (
      elapsed: number,
      speed: number,
      baseH: number,
      amplitude: number,
      frequency: number,
      colorGrad: CanvasGradient
    ) => {
      const columns = 28
      const colW = width / columns

      ctx.beginPath()
      ctx.moveTo(0, height)

      for (let i = 0; i <= columns; i++) {
        const x = i * colW
        const u = i / columns

        // Harmonic flame tongue calculation
        const noise =
          Math.sin(u * Math.PI * frequency + elapsed * speed) * amplitude +
          Math.cos(u * Math.PI * (frequency * 1.7) - elapsed * (speed * 1.3)) * (amplitude * 0.6) +
          Math.sin(u * Math.PI * (frequency * 3.1) + elapsed * (speed * 2.2)) * (amplitude * 0.35)

        const y = height - (baseH + noise)
        if (i === 0) {
          ctx.lineTo(x, y)
        } else {
          const prevX = (i - 1) * colW
          const cpX = (prevX + x) / 2
          ctx.quadraticCurveTo(cpX, y, x, y)
        }
      }

      ctx.lineTo(width, height)
      ctx.closePath()
      ctx.fillStyle = colorGrad
      ctx.fill()
    }

    const render = (now: number) => {
      const elapsed = (now - startTime) * 0.001

      ctx.clearRect(0, 0, width, height)

      if (width <= 0 || height <= 0) {
        animationFrameId = requestAnimationFrame(render)
        return
      }

      ctx.save()
      ctx.globalCompositeOperation = 'screen'

      // 1. Ambient Volcanic Base Glow
      const bgGrad = ctx.createLinearGradient(0, height * 0.2, 0, height)
      bgGrad.addColorStop(0, 'rgba(127, 29, 29, 0)')
      bgGrad.addColorStop(0.5, 'rgba(185, 28, 28, 0.15)')
      bgGrad.addColorStop(1, 'rgba(234, 88, 12, 0.3)')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // 2. Outer Crimson Flame Tongues (Tallest, ~75% card height)
      const gradCrimson = ctx.createLinearGradient(0, height * 0.25, 0, height)
      gradCrimson.addColorStop(0, 'rgba(185, 28, 28, 0.35)')
      gradCrimson.addColorStop(0.6, 'rgba(220, 38, 38, 0.25)')
      gradCrimson.addColorStop(1, 'rgba(239, 68, 68, 0)')
      drawFlameLayer(elapsed, 2.6, height * 0.6, height * 0.18, 4.5, gradCrimson)

      // 3. Middle Blazing Orange Flames (~50% card height)
      const gradOrange = ctx.createLinearGradient(0, height * 0.45, 0, height)
      gradOrange.addColorStop(0, 'rgba(249, 115, 22, 0.45)')
      gradOrange.addColorStop(0.6, 'rgba(234, 88, 12, 0.35)')
      gradOrange.addColorStop(1, 'rgba(180, 40, 0, 0.1)')
      drawFlameLayer(elapsed, 3.4, height * 0.42, height * 0.14, 6.0, gradOrange)

      // 4. Core Hot White-Yellow Flame Tongue Filament (~30% card height)
      const gradCore = ctx.createLinearGradient(0, height * 0.65, 0, height)
      gradCore.addColorStop(0, 'rgba(255, 250, 200, 0.65)')
      gradCore.addColorStop(0.4, 'rgba(253, 224, 71, 0.45)')
      gradCore.addColorStop(1, 'rgba(249, 115, 22, 0.15)')
      drawFlameLayer(elapsed, 4.2, height * 0.25, height * 0.09, 7.5, gradCore)

      // 5. Rising Ember Particles
      if (particles.length < 24 && Math.random() < 0.75) {
        particles.push({
          x: Math.random() * width,
          y: height - Math.random() * (height * 0.25),
          vx: (Math.random() - 0.5) * 0.5,
          vy: -0.6 - Math.random() * 0.9,
          life: 0,
          maxLife: 30 + Math.random() * 35,
          size: 0.9 + Math.random() * 2.0,
          baseAlpha: 0.6 + Math.random() * 0.35,
          hue: 15 + Math.random() * 28, // Fiery orange to gold
        })
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life++
        p.x += p.vx + Math.sin(p.life * 0.15) * 0.25
        p.y += p.vy
        p.size *= 0.98

        const progress = p.life / p.maxLife
        if (progress >= 1 || p.size <= 0.25 || p.y < -10) {
          particles.splice(i, 1)
          continue
        }

        const alpha = p.baseAlpha * (1 - progress)
        ctx.fillStyle = `hsla(${p.hue}, 95%, 60%, ${alpha})`
        ctx.shadowColor = `hsla(${p.hue}, 100%, 70%, ${alpha})`
        ctx.shadowBlur = 5
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
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
