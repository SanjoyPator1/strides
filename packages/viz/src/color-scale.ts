'use client'

import { useLayoutEffect, useState } from 'react'
import { scaleDiverging, scaleSequential } from 'd3-scale'
import { interpolateRgb, piecewise } from 'd3-interpolate'

const VAR_NAMES = [
  '--strides-viz-sequential-low',
  '--strides-viz-sequential-high',
  '--strides-viz-diverging-low',
  '--strides-viz-diverging-mid',
  '--strides-viz-diverging-high',
] as const

type VarName = (typeof VAR_NAMES)[number]

const FALLBACK_COLOR = '#888888'

// A plain literal, not a function call: the initial render must produce the exact same
// value on the server and on the client's first (pre-hydration) pass, or React flags a
// hydration mismatch. Real CSS values are only readable client-side, so they're deferred
// to useLayoutEffect below, same as next-themes' own "mounted" pattern for ThemeToggle.
const FALLBACK_COLORS: Record<VarName, string> = {
  '--strides-viz-sequential-low': FALLBACK_COLOR,
  '--strides-viz-sequential-high': FALLBACK_COLOR,
  '--strides-viz-diverging-low': FALLBACK_COLOR,
  '--strides-viz-diverging-mid': FALLBACK_COLOR,
  '--strides-viz-diverging-high': FALLBACK_COLOR,
}

function readCssVars(): Record<VarName, string> {
  const styles = getComputedStyle(document.documentElement)
  const result = {} as Record<VarName, string>
  for (const name of VAR_NAMES) {
    result[name] = styles.getPropertyValue(name).trim() || FALLBACK_COLOR
  }
  return result
}

/** Re-reads strides' viz color variables whenever <html>'s class changes (e.g. dark-mode toggle). */
function useVizColors(): Record<VarName, string> {
  const [colors, setColors] = useState<Record<VarName, string>>(FALLBACK_COLORS)

  useLayoutEffect(() => {
    const read = () => setColors(readCssVars())
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return colors
}

export type ColorScaleKind = 'none' | 'sequential' | 'diverging'

function domainOf(values: number[][]): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (const row of values) {
    for (const value of row) {
      if (value < min) min = value
      if (value > max) max = value
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1]
  if (min === max) return [min - 0.5, max + 0.5]
  return [min, max]
}

/** Maps cell values to fill colors for the requested scale kind; 'none' is a fixed neutral fill. */
export function useColorScale(kind: ColorScaleKind, values: number[][]): (value: number) => string {
  const colors = useVizColors()
  const [min, max] = domainOf(values)

  if (kind === 'sequential') {
    const scale = scaleSequential(
      interpolateRgb(colors['--strides-viz-sequential-low'], colors['--strides-viz-sequential-high']),
    ).domain([min, max])
    return (value: number) => scale(value)
  }

  if (kind === 'diverging') {
    const interpolator = piecewise(interpolateRgb, [
      colors['--strides-viz-diverging-low'],
      colors['--strides-viz-diverging-mid'],
      colors['--strides-viz-diverging-high'],
    ])
    const bound = Math.max(Math.abs(min), Math.abs(max)) || 1
    const scale = scaleDiverging(interpolator).domain([-bound, 0, bound])
    return (value: number) => scale(value)
  }

  return () => 'var(--strides-color-surface)'
}
