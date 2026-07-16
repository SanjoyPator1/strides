'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { useColorScale, type ColorScaleKind } from './color-scale'
import { useAnimatedNumber } from './animated-number'

export interface MatrixHoverCell {
  row: number
  col: number
  value: number
}

export interface MatrixHighlight {
  row?: number
  col?: number
  cell?: [number, number]
}

export interface MatrixProps {
  values: number[][]
  rowLabels?: string[]
  colLabels?: string[]
  /** default 'none'; d3-scale under the hood */
  colorScale?: ColorScaleKind
  /** displayed decimals, default 2 */
  precision?: number
  /** px, default 44 */
  cellSize?: number
  /** controlled highlight */
  highlight?: MatrixHighlight
  onCellHover?: (cell: MatrixHoverCell | null) => void
  /** scene identity — matching ids across Scene steps tween instead of remounting */
  id?: string
}

const DEFAULT_CELL_SIZE = 44
const LABEL_GUTTER = 40

interface MatrixCellProps {
  row: number
  col: number
  value: number
  x: number
  y: number
  size: number
  color: string
  precision: number
  highlighted: boolean
  layoutId?: string
  onHoverChange: (cell: MatrixHoverCell | null) => void
}

function MatrixCell({ row, col, value, x, y, size, color, precision, highlighted, layoutId, onHoverChange }: MatrixCellProps) {
  const displayValue = useAnimatedNumber(value)

  return (
    <g onMouseEnter={() => onHoverChange({ row, col, value })} onMouseLeave={() => onHoverChange(null)}>
      <motion.rect
        layoutId={layoutId}
        x={x}
        y={y}
        width={size}
        height={size}
        rx={3}
        className={highlighted ? 'strides-matrix-cell strides-matrix-cell--highlight' : 'strides-matrix-cell'}
        animate={{ fill: color }}
        transition={{ duration: 0.35 }}
      />
      <text x={x + size / 2} y={y + size / 2} textAnchor="middle" dominantBaseline="middle" className="strides-matrix-value">
        {displayValue.toFixed(precision)}
      </text>
    </g>
  )
}

export function Matrix({
  values,
  rowLabels,
  colLabels,
  colorScale = 'none',
  precision = 2,
  cellSize = DEFAULT_CELL_SIZE,
  highlight,
  onCellHover,
  id,
}: MatrixProps) {
  const rows = values.length
  const cols = values[0]?.length ?? 0
  const colorFor = useColorScale(colorScale, values)
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(null)

  const gutterLeft = rowLabels ? LABEL_GUTTER : 0
  const gutterTop = colLabels ? LABEL_GUTTER : 0
  const width = gutterLeft + cols * cellSize
  const height = gutterTop + rows * cellSize

  const isHighlighted = (row: number, col: number): boolean => {
    if (highlight?.cell) return highlight.cell[0] === row && highlight.cell[1] === col
    if (highlight?.row !== undefined || highlight?.col !== undefined) {
      return highlight.row === row || highlight.col === col
    }
    if (hovered) return hovered.row === row || hovered.col === col
    return false
  }

  const handleHoverChange = (cell: MatrixHoverCell | null) => {
    setHovered(cell)
    onCellHover?.(cell)
  }

  return (
    <svg className="strides-matrix" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="matrix">
      {colLabels?.map((label, col) => (
        <text
          key={`col-${col}`}
          className="strides-matrix-label"
          x={gutterLeft + col * cellSize + cellSize / 2}
          y={gutterTop - 12}
          textAnchor="middle"
        >
          {label}
        </text>
      ))}
      {rowLabels?.map((label, row) => (
        <text
          key={`row-${row}`}
          className="strides-matrix-label"
          x={gutterLeft - 12}
          y={gutterTop + row * cellSize + cellSize / 2}
          textAnchor="end"
          dominantBaseline="middle"
        >
          {label}
        </text>
      ))}
      {values.map((rowValues, row) =>
        rowValues.map((value, col) => (
          <MatrixCell
            key={`${row}-${col}`}
            row={row}
            col={col}
            value={value}
            x={gutterLeft + col * cellSize}
            y={gutterTop + row * cellSize}
            size={cellSize}
            color={colorFor(value)}
            precision={precision}
            highlighted={isHighlighted(row, col)}
            layoutId={id ? `${id}-cell-${row}-${col}` : undefined}
            onHoverChange={handleHoverChange}
          />
        )),
      )}
    </svg>
  )
}
