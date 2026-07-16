'use client'

import { useState } from 'react'
import { Matrix, type MatrixHoverCell } from '@strides/viz'

export interface AttentionHeatmapProps {
  /** rows should sum to 1 */
  weights: number[][]
  /** axis labels, len === weights.length */
  tokens: string[]
  precision?: number
}

export function AttentionHeatmap({ weights, tokens, precision = 2 }: AttentionHeatmapProps) {
  const [hovered, setHovered] = useState<MatrixHoverCell | null>(null)
  const rowSum = hovered ? weights[hovered.row].reduce((sum, value) => sum + value, 0) : null

  return (
    <div className="strides-attention-heatmap">
      <Matrix
        values={weights}
        rowLabels={tokens}
        colLabels={tokens}
        colorScale="sequential"
        precision={precision}
        highlight={hovered ? { row: hovered.row } : undefined}
        onCellHover={setHovered}
      />
      <div className="strides-attention-tooltip" aria-live="polite">
        {hovered ? (
          <>
            <p>
              P({tokens[hovered.row]} → {tokens[hovered.col]}) = {hovered.value.toFixed(precision)}
            </p>
            <p>row sum ≈ {rowSum?.toFixed(precision)}</p>
          </>
        ) : (
          <p className="strides-attention-tooltip-hint">Hover a cell to inspect attention weights.</p>
        )}
      </div>
    </div>
  )
}
