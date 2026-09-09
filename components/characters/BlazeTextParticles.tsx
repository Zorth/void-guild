'use client'

import React, { useEffect, useRef } from 'react'

interface TextParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  startAlpha: number
}

export default function BlazeTextParticles({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = 0
    let height = 0
    const padTop = 22
    const padHoriz = 10
    let particles: TextParticle[] = []

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(rect.width, 20)
      height = Math.max(rect.height, 14)

      canvas.width = (width + padHoriz * 2) * dpr
      canvas.height = (height + padTop) * dpr
      canvas.style.width = `${width + padHoriz * 2}px`
      canvas.style.height = `${height + padTop}px`
      canvas.style.left = `${-padHoriz}px`
      canvas.style.top = `${-padTop}px`

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

    const render = () => {
      ctx.clearRect(0, 0, width + padHoriz * 2, height + padTop)

      if (width <= 0 || height <= 0) {
        animationFrameId = requestAnimationFrame(render)
        return
      }

      ctx.save()
      ctx.globalCompositeOperation = 'screen'

      // Spawn particles
      if (particles.length < 16 && Math.random() < 0.65) {
        particles.push({
          x: padHoriz + Math.random() * width,
          y: padTop + height * 0.5 + Math.random() * (height * 0.5),
          vx: (Math.random() - 0.5) * 0.4,
          vy: -0.45 - Math.random() * 0.65,
          life: 0,
          maxLife: 25 + Math.random() * 30,
          size: 0.9 + Math.random() * 1.6,
          startAlpha: 0.7 + Math.random() * 0.3,
        })
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life++
        p.x += p.vx + Math.sin(p.life * 0.2) * 0.15
        p.y += p.vy
        p.size *= 0.975

        const progress = p.life / p.maxLife
        if (progress >= 1 || p.size <= 0.2) {
          particles.splice(i, 1)
          continue
        }

        const alpha = p.startAlpha * (1 - progress)

        if (progress < 0.25) {
          // White-hot / bright yellow
          ctx.fillStyle = `rgba(255, 250, 200, ${alpha})`
          ctx.shadowColor = `rgba(254, 240, 138, ${alpha})`
        } else if (progress < 0.65) {
          // Blazing orange
          ctx.fillStyle = `rgba(249, 115, 22, ${alpha})`
          ctx.shadowColor = `rgba(251, 146, 60, ${alpha})`
        } else {
          // Deep crimson/ember
          ctx.fillStyle = `rgba(220, 38, 38, ${alpha * 0.8})`
          ctx.shadowColor = `rgba(185, 28, 28, ${alpha * 0.6})`
        }

        ctx.shadowBlur = 4
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
      className={`pointer-events-none absolute z-10 overflow-visible select-none ${className || ''}`}
    />
  )
}
