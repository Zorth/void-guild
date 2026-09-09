'use client'

import React, { useEffect, useRef } from 'react'

interface TintParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  baseAlpha: number
  pulseSpeed: number
  pulseOffset: number
}

export default function TintParticlesEffect({
  variant,
  className,
}: {
  variant: 'cyan' | 'crimson'
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = 0
    let height = 0
    let particles: TintParticle[] = []

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

      // Initialize initial motes
      if (width > 0 && height > 0 && particles.length === 0) {
        particles = Array.from({ length: 14 }, () => ({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: -0.15 - Math.random() * 0.3,
          life: Math.random() * 50,
          maxLife: 60 + Math.random() * 60,
          size: 0.8 + Math.random() * 1.5,
          baseAlpha: 0.35 + Math.random() * 0.35,
          pulseSpeed: 1.2 + Math.random() * 2.0,
          pulseOffset: Math.random() * Math.PI * 2,
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

      // Spawn new subtle motes
      if (particles.length < 16 && Math.random() < 0.3) {
        particles.push({
          x: Math.random() * width,
          y: height + 2,
          vx: (Math.random() - 0.5) * 0.25,
          vy: -0.15 - Math.random() * 0.3,
          life: 0,
          maxLife: 60 + Math.random() * 60,
          size: 0.8 + Math.random() * 1.5,
          baseAlpha: 0.35 + Math.random() * 0.35,
          pulseSpeed: 1.2 + Math.random() * 2.0,
          pulseOffset: Math.random() * Math.PI * 2,
        })
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life++
        p.x += p.vx + Math.sin(p.life * 0.08) * 0.12
        p.y += p.vy

        // Wrap or respawn
        if (p.y < -5 || p.life >= p.maxLife) {
          particles.splice(i, 1)
          continue
        }

        const progress = p.life / p.maxLife
        const pulse = Math.sin(elapsed * p.pulseSpeed + p.pulseOffset) * 0.5 + 0.5
        const fadeInOut = Math.sin(progress * Math.PI)
        const alpha = p.baseAlpha * fadeInOut * (0.6 + pulse * 0.4)

        if (variant === 'cyan') {
          // Cyan ethereal motes
          ctx.fillStyle = `rgba(103, 232, 249, ${alpha})`
          ctx.shadowColor = `rgba(6, 182, 212, ${alpha * 0.9})`
        } else {
          // Crimson flame motes
          ctx.fillStyle = `rgba(252, 165, 165, ${alpha})`
          ctx.shadowColor = `rgba(239, 68, 68, ${alpha * 0.9})`
        }

        ctx.shadowBlur = 4
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * (0.85 + pulse * 0.25), 0, Math.PI * 2)
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
  }, [variant])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 rounded-[inherit] z-0 overflow-hidden ${className || ''}`}
    />
  )
}
