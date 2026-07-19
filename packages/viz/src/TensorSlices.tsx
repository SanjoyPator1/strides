'use client'

import { useState, type CSSProperties } from 'react'
import { Matrix, getMatrixSize } from './Matrix'
import type { ColorScaleKind } from './color-scale'

export interface TensorSlice {
  label: string
  values: number[][]
  rowLabels?: string[]
  colLabels?: string[]
  color?: string
  /** Offsets within a same-`id` Matrix's global grid — set these so a split animates cells
   *  apart from where they actually came from, instead of just fading in at slot 0,0. */
  rowOffset?: number
  colOffset?: number
}

export interface TensorSlicesProps {
  slices: TensorSlice[]
  colorScale?: ColorScaleKind
  precision?: number
  cellSize?: number
  /** 'row': side by side. 'stack': overlapping, offset like a deck of cards (no 3D camera — decision #6). */
  layout?: 'row' | 'stack'
  /** Scene identity, shared with the pre-split Matrix so cells tween apart instead of remounting. */
  id?: string
  /** Click a slice's label to focus it (dim + enlarge the rest); click again to release. */
  focusable?: boolean
}

const STACK_OFFSET = 14
// Rough allowance for each slice's own label/padding/border, on top of its Matrix's own size —
// approximate is fine here (unlike Matrix's own layout, this only needs to *reserve room*, not
// pixel-perfect-align content), so a fixed constant avoids a runtime DOM-measurement round trip.
const SLICE_CHROME_WIDTH = 20
const SLICE_CHROME_HEIGHT = 40

export function TensorSlices({ slices, colorScale = 'sequential', precision, cellSize, layout = 'row', id, focusable = false }: TensorSlicesProps) {
  const [focused, setFocused] = useState<number | null>(null)

  const handleClick = (index: number) => {
    if (!focusable) return
    setFocused((current) => (current === index ? null : index))
  }

  let containerStyle: CSSProperties = {}
  if (layout === 'stack') {
    const sizes = slices.map((slice) =>
      getMatrixSize(slice.values.length, slice.values[0]?.length ?? 0, {
        cellSize,
        hasRowLabels: !!slice.rowLabels,
        hasColLabels: !!slice.colLabels,
      }),
    )
    const maxWidth = Math.max(...sizes.map((s) => s.width)) + SLICE_CHROME_WIDTH
    const maxHeight = Math.max(...sizes.map((s) => s.height)) + SLICE_CHROME_HEIGHT
    const spread = STACK_OFFSET * (slices.length - 1)
    containerStyle = { position: 'relative', width: maxWidth + spread, height: maxHeight + spread }
  }

  return (
    <div className={`strides-tensor-slices strides-tensor-slices--${layout}`} style={containerStyle}>
      {slices.map((slice, index) => {
        const isFocused = focused === index
        const isDimmed = focused !== null && !isFocused
        // z-index must be inline (it depends on focus, which is per-render state), but inline
        // styles always win over CSS classes — so the focused card needs its raised z-index
        // computed *here*, not left to a ".strides-tensor-slice--focused { z-index: ... }" rule,
        // or a card further back in the deck can never actually come to the front when clicked.
        const stackStyle: CSSProperties =
          layout === 'stack'
            ? { position: 'absolute', top: index * STACK_OFFSET, left: index * STACK_OFFSET, zIndex: isFocused ? slices.length : index }
            : {}

        return (
          <div
            key={slice.label}
            className={
              'strides-tensor-slice' +
              (isFocused ? ' strides-tensor-slice--focused' : '') +
              (isDimmed ? ' strides-tensor-slice--dimmed' : '') +
              (focusable ? ' strides-tensor-slice--focusable' : '')
            }
            style={{ ...stackStyle, borderColor: slice.color }}
            onClick={() => handleClick(index)}
          >
            <div className="strides-tensor-slice-label" style={{ color: slice.color }}>
              {slice.label}
            </div>
            <Matrix
              values={slice.values}
              rowLabels={slice.rowLabels}
              colLabels={slice.colLabels}
              colorScale={colorScale}
              precision={precision}
              cellSize={cellSize}
              getLayoutId={
                id ? (row, col) => `${id}-cell-${(slice.rowOffset ?? 0) + row}-${(slice.colOffset ?? 0) + col}` : undefined
              }
            />
          </div>
        )
      })}
    </div>
  )
}
