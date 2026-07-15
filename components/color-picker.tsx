"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  className?: string
}

const PRESET_COLORS = [
  "#10b981", // green
  "#3b82f6", // blue
  "#a855f7", // purple
  "#ef4444", // red
  "#f59e0b", // orange
  "#64748b", // slate
]

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const [hue, setHue] = React.useState(0)
  const [saturation, setSaturation] = React.useState(100)
  const [lightness, setLightness] = React.useState(50)
  const [opacity, setOpacity] = React.useState(100)
  const [format, setFormat] = React.useState<"hex" | "rgba">("hex")
  const [isGradientActive, setIsGradientActive] = React.useState(false)
  const [isHueActive, setIsHueActive] = React.useState(false)
  const [isOpacityActive, setIsOpacityActive] = React.useState(false)

  const gradientRef = React.useRef<HTMLDivElement>(null)
  const hueRef = React.useRef<HTMLDivElement>(null)
  const opacityRef = React.useRef<HTMLDivElement>(null)

  // Ref (not state) so the scroll-lock listener sees it synchronously: it is set
  // during pointerdown, before the gesture's first touchmove — state would only
  // propagate after a re-render, letting the browser start scrolling in between.
  const isDraggingRef = React.useRef(false)

  React.useEffect(() => {
    const parseColor = (color: string) => {
      if (color.startsWith("rgba")) {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d*\.?\d+))?\)/)
        if (match) {
          const r = Number.parseInt(match[1]) / 255
          const g = Number.parseInt(match[2]) / 255
          const b = Number.parseInt(match[3]) / 255
          const a = match[4] ? Number.parseFloat(match[4]) * 100 : 100

          const max = Math.max(r, g, b)
          const min = Math.min(r, g, b)
          const l = (max + min) / 2
          let h = 0
          let s = 0

          if (max !== min) {
            const d = max - min
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

            switch (max) {
              case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6
                break
              case g:
                h = ((b - r) / d + 2) / 6
                break
              case b:
                h = ((r - g) / d + 4) / 6
                break
            }
          }

          setHue(Math.round(h * 360))
          setSaturation(Math.round(s * 100))
          setLightness(Math.round(l * 100))
          setOpacity(Math.round(a))
          return
        }
      }

      if (color.startsWith("#")) {
        const hex = color.slice(1)
        const r = Number.parseInt(hex.slice(0, 2), 16) / 255
        const g = Number.parseInt(hex.slice(2, 4), 16) / 255
        const b = Number.parseInt(hex.slice(4, 6), 16) / 255

        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        const l = (max + min) / 2
        let h = 0
        let s = 0

        if (max !== min) {
          const d = max - min
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

          switch (max) {
            case r:
              h = ((g - b) / d + (g < b ? 6 : 0)) / 6
              break
            case g:
              h = ((b - r) / d + 2) / 6
              break
            case b:
              h = ((r - g) / d + 4) / 6
              break
          }
        }

        setHue(Math.round(h * 360))
        setSaturation(Math.round(s * 100))
        setLightness(Math.round(l * 100))
        setOpacity(100)
      }
    }

    parseColor(value)
  }, [value])

  const hslToHex = (h: number, s: number, l: number) => {
    s /= 100
    l /= 100

    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = l - c / 2
    let r = 0,
      g = 0,
      b = 0

    if (h >= 0 && h < 60) {
      r = c; g = x; b = 0
    } else if (h >= 60 && h < 120) {
      r = x; g = c; b = 0
    } else if (h >= 120 && h < 180) {
      r = 0; g = c; b = x
    } else if (h >= 180 && h < 240) {
      r = 0; g = x; b = c
    } else if (h >= 240 && h < 300) {
      r = x; g = 0; b = c
    } else {
      r = c; g = 0; b = x
    }

    const toHex = (n: number) => {
      const hex = Math.round((n + m) * 255).toString(16)
      return hex.length === 1 ? "0" + hex : hex
    }

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }

  const updateColor = React.useCallback((h: number, s: number, l: number, a?: number) => {
    const newOpacity = a ?? opacity

    setHue(h)
    setSaturation(s)
    setLightness(l)
    if (a !== undefined) setOpacity(newOpacity)

    const hexColor = hslToHex(h, s, l)

    if (newOpacity < 100) {
      const r = Number.parseInt(hexColor.slice(1, 3), 16)
      const g = Number.parseInt(hexColor.slice(3, 5), 16)
      const b = Number.parseInt(hexColor.slice(5, 7), 16)
      onChange(`rgba(${r}, ${g}, ${b}, ${newOpacity / 100})`)
    } else {
      onChange(hexColor)
    }
  }, [opacity, onChange])

  /** Picks saturation/lightness from a viewport position on the gradient square (clamped, so drags past the edge stick to it). */
  const pickGradientColor = React.useCallback(
    (clientX: number, clientY: number) => {
      if (gradientRef.current === null) return

      const rect = gradientRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top

      const s = Math.max(0, Math.min(100, Math.round((x / rect.width) * 100)))
      const l = Math.max(0, Math.min(100, Math.round(100 - (y / rect.height) * 100)))

      updateColor(hue, s, l)
    },
    [hue, updateColor]
  )

  const pickHueColor = React.useCallback(
    (clientX: number) => {
      if (hueRef.current === null) return

      const rect = hueRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      const h = Math.max(0, Math.min(360, Math.round((x / rect.width) * 360)))

      updateColor(h, saturation, lightness)
    },
    [saturation, lightness, updateColor]
  )

  const pickOpacityColor = React.useCallback(
    (clientX: number) => {
      if (opacityRef.current === null) return

      const rect = opacityRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      const a = Math.max(0, Math.min(100, Math.round((x / rect.width) * 100)))

      updateColor(hue, saturation, lightness, a)
    },
    [hue, saturation, lightness, updateColor]
  )

  /**
   * Locks the view while a drag is in progress: `touch-action: none` alone is
   * not honored consistently on mobile (notably iOS Safari), and once the
   * browser claims the gesture for scrolling it fires pointercancel, killing
   * the drag. Blocking `touchmove` at the document level is the mechanism
   * every mobile browser respects — and it must be a NATIVE non-passive
   * listener: React registers its touch listeners as passive, so
   * `preventDefault()` inside a React handler is a no-op for scrolling.
   * The lock engages on pointerdown (via `isDraggingRef`) and releases on
   * pointerup/pointercancel, so the page scrolls normally between drags.
   */
  React.useEffect(() => {
    const blockTouchScroll = (e: TouchEvent) => {
      if (isDraggingRef.current && e.cancelable) e.preventDefault()
    }

    document.addEventListener("touchmove", blockTouchScroll, { passive: false })

    return () => document.removeEventListener("touchmove", blockTouchScroll)
  }, [])

  React.useEffect(() => {
    const isDragging = isGradientActive || isHueActive || isOpacityActive

    if (!isDragging) return

    const handlePointerMove = (e: PointerEvent) => {
      if (isGradientActive) pickGradientColor(e.clientX, e.clientY)

      if (isHueActive) pickHueColor(e.clientX)

      if (isOpacityActive) pickOpacityColor(e.clientX)
    }

    const handlePointerEnd = () => {
      isDraggingRef.current = false

      setIsGradientActive(false)
      setIsHueActive(false)
      setIsOpacityActive(false)
    }

    document.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("pointerup", handlePointerEnd)
    document.addEventListener("pointercancel", handlePointerEnd)

    return () => {
      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerEnd)
      document.removeEventListener("pointercancel", handlePointerEnd)
    }
  }, [
    isGradientActive,
    isHueActive,
    isOpacityActive,
    pickGradientColor,
    pickHueColor,
    pickOpacityColor,
  ])

  const currentColor = hslToHex(hue, saturation, lightness)
  const gradientX = (saturation / 100) * 100
  const gradientY = 100 - lightness

  return (
    <div className={cn("space-y-3 p-4 bg-muted/50 rounded-lg border", className)}>
      <div
        ref={gradientRef}
        role="slider"
        aria-label="Saturation and lightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={saturation}
        aria-valuetext={`Saturation ${saturation}%, lightness ${lightness}%`}
        className="relative w-full h-48 rounded-lg cursor-crosshair overflow-hidden touch-none select-none"
        style={{
          background: `
            linear-gradient(to bottom, transparent, black),
            linear-gradient(to right, white, hsl(${hue}, 100%, 50%))
          `,
        }}
        onPointerDown={(e) => {
          e.preventDefault()
          isDraggingRef.current = true
          setIsGradientActive(true)
          pickGradientColor(e.clientX, e.clientY)
        }}
      >
        <div
          className="absolute w-4 h-4 border-2 border-white rounded-full shadow-lg pointer-events-none transition-transform duration-150"
          style={{
            left: `${gradientX}%`,
            top: `${gradientY}%`,
            transform: `translate(-50%, -50%) scale(${isGradientActive ? 1.25 : 1})`,
          }}
        />
      </div>

      <div
        ref={hueRef}
        role="slider"
        aria-label="Hue"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={hue}
        className="relative w-full h-3 rounded-full cursor-pointer overflow-hidden touch-none select-none"
        style={{
          background: "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
        }}
        onPointerDown={(e) => {
          e.preventDefault()
          isDraggingRef.current = true
          setIsHueActive(true)
          pickHueColor(e.clientX)
        }}
      >
        <div
          className="absolute w-4 h-4 border-2 border-white rounded-full shadow-lg pointer-events-none top-1/2 transition-transform duration-150"
          style={{
            left: `${(hue / 360) * 100}%`,
            transform: `translate(-50%, -50%) scale(${isHueActive ? 1.25 : 1})`,
          }}
        />
      </div>

      <div
        ref={opacityRef}
        role="slider"
        aria-label="Opacity"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={opacity}
        className="relative w-full h-3 rounded-full cursor-pointer overflow-hidden touch-none select-none"
        style={{
          background: `linear-gradient(to right, transparent, ${currentColor})`,
          backgroundImage: `
            linear-gradient(to right, transparent, ${currentColor}),
            repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 12px 12px
          `,
        }}
        onPointerDown={(e) => {
          e.preventDefault()
          isDraggingRef.current = true
          setIsOpacityActive(true)
          pickOpacityColor(e.clientX)
        }}
      >
        <div
          className="absolute w-4 h-4 border-2 border-white rounded-full shadow-lg pointer-events-none top-1/2 transition-transform duration-150"
          style={{
            left: `${opacity}%`,
            transform: `translate(-50%, -50%) scale(${isOpacityActive ? 1.25 : 1})`,
          }}
        />
      </div>

      <div className="flex gap-2 pt-2">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset}
            className="w-8 h-8 rounded-full border-2 border-background shadow-sm hover:scale-110 transition-transform"
            style={{ backgroundColor: preset }}
            onClick={() => onChange(preset)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex gap-2 text-xs">
          <button
            className={cn(
              "px-2 py-1 rounded",
              format === "hex" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
            onClick={() => setFormat("hex")}
          >
            HEX
          </button>
          <button
            className={cn(
              "px-2 py-1 rounded",
              format === "rgba" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
            onClick={() => setFormat("rgba")}
          >
            RGBA
          </button>
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          {format === "hex"
            ? currentColor.toUpperCase()
            : `rgba(${Number.parseInt(currentColor.slice(1, 3), 16)}, ${Number.parseInt(
                currentColor.slice(3, 5),
                16
              )}, ${Number.parseInt(currentColor.slice(5, 7), 16)}, ${opacity / 100})`}
        </div>
      </div>
    </div>
  )
}