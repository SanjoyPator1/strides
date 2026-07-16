'use client'

import { useEffect, useState } from 'react'
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

function readCssVars(): Record<VarName, string> {
  const styles = typeof window === 'undefined' ? null : getComputedStyle(document.documentElement)
  const result = {} as Record<VarName, string>
  for (const name of VAR_NAMES) {
    result[name] = styles?.getPropertyValue(name).trim() || '#888888'
  }
  return result
}

/** Re-reads strides' viz color variables whenever <html>'s class changes (e.g. dark-mode toggle). */
function useVizColors(): Record<VarName, string> {
  const [colors, setColors] = useState(readCssVars)

  useEffect(() => {
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
