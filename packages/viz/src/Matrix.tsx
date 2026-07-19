'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { useColorScale, type ColorScaleKind } from './color-scale'
import { useAnimatedNumber } from './animated-number'
import { useAnchorRef } from './Arrow'

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

export interface MatrixGroup {
  label: string
  axis: 'row' | 'col'
  /** Inclusive range along the axis, e.g. { start: 0, end: 1 } covers the first two columns. */
  start: number
  end: number
  color?: string
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
  /** Colored brackets spanning a range of rows or columns, with a label (e.g. "head 1"). */
  groups?: MatrixGroup[]
  /** Show a symbolic label per cell (e.g. "a", "b"...) instead of its numeric value; the number still drives color. */
  cellLabels?: string[][]
  /** If inside an ArrowOverlay, each cell registers as an anchor named `${anchorPrefix}-{row}-{col}`. */
  anchorPrefix?: string
  /** Advanced: override how a cell's layoutId is computed. Takes precedence over `id`; TensorSlices
   *  uses this to match a pre-split Matrix's cell ids for a real "splitting apart" tween. */
  getLayoutId?: (row: number, col: number) => string | undefined
}

const DEFAULT_CELL_SIZE = 44
const LABEL_GUTTER = 40
const GROUP_BAND = 26

export interface MatrixSizeOptions {
  cellSize?: number
  hasRowLabels?: boolean
  hasColLabels?: boolean
  hasRowGroups?: boolean
  hasColGroups?: boolean
}

/** The pixel size Matrix will render at for a given shape — exported so composed
 *  components (TensorSlices) can reserve layout space without duplicating this math. */
export function getMatrixSize(rows: number, cols: number, options: MatrixSizeOptions = {}): { width: number; height: number } {
  const cellSize = options.cellSize ?? DEFAULT_CELL_SIZE
  const groupTop = options.hasColGroups ? GROUP_BAND : 0
  const groupLeft = options.hasRowGroups ? GROUP_BAND : 0
  const gutterLeft = groupLeft + (options.hasRowLabels ? LABEL_GUTTER : 0)
  const gutterTop = groupTop + (options.hasColLabels ? LABEL_GUTTER : 0)
  return { width: gutterLeft + cols * cellSize, height: gutterTop + rows * cellSize }
}

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
  label?: string
  anchorName?: string
  onHoverChange: (cell: MatrixHoverCell | null) => void
}

function MatrixCell({ row, col, value, x, y, size, color, precision, highlighted, layoutId, label, anchorName, onHoverChange }: MatrixCellProps) {
  const displayValue = useAnimatedNumber(value)
  const anchorRef = useAnchorRef(anchorName)

  return (
    <g
      ref={anchorRef}
      data-anchor={anchorName}
      onMouseEnter={() => onHoverChange({ row, col, value })}
      onMouseLeave={() => onHoverChange(null)}
    >
      <motion.rect
        layoutId={layoutId}
        x={x}
        y={y}
        width={size}
        height={size}
        rx={3}
        className={highlighted ? 'strides-matrix-cell strides-matrix-cell--highlight' : 'strides-matrix-cell'}
        initial={{ fill: color }}
        animate={{ fill: color }}
        transition={{ duration: 0.35 }}
      />
      <text x={x + size / 2} y={y + size / 2} textAnchor="middle" dominantBaseline="middle" className="strides-matrix-value">
        {label ?? displayValue.toFixed(precision)}
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
  groups,
  cellLabels,
  anchorPrefix,
  getLayoutId,
}: MatrixProps) {
  const rows = values.length
  const cols = values[0]?.length ?? 0
  const colorFor = useColorScale(colorScale, values)
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(null)

  const colGroups = groups?.filter((g) => g.axis === 'col') ?? []
  const rowGroups = groups?.filter((g) => g.axis === 'row') ?? []
  const groupTop = colGroups.length ? GROUP_BAND : 0
  const groupLeft = rowGroups.length ? GROUP_BAND : 0

  const gutterLeft = groupLeft + (rowLabels ? LABEL_GUTTER : 0)
  const gutterTop = groupTop + (colLabels ? LABEL_GUTTER : 0)
  const { width, height } = getMatrixSize(rows, cols, {
    cellSize,
    hasRowLabels: !!rowLabels,
    hasColLabels: !!colLabels,
    hasRowGroups: rowGroups.length > 0,
    hasColGroups: colGroups.length > 0,
  })

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
      {colGroups.map((group, i) => {
        const x = gutterLeft + group.start * cellSize
        const w = (group.end - group.start + 1) * cellSize
        const color = group.color ?? 'var(--strides-color-accent)'
        return (
          <g key={`col-group-${i}`}>
            <rect
              x={x + 2}
              y={4}
              width={w - 4}
              height={GROUP_BAND - 10}
              rx={4}
              className="strides-matrix-group"
              style={{ stroke: color, fill: color }}
            />
            <text x={x + w / 2} y={groupTop - 12} textAnchor="middle" className="strides-matrix-group-label" style={{ fill: color }}>
              {group.label}
            </text>
          </g>
        )
      })}
      {rowGroups.map((group, i) => {
        const y = gutterTop + group.start * cellSize
        const h = (group.end - group.start + 1) * cellSize
        const color = group.color ?? 'var(--strides-color-accent)'
        return (
          <g key={`row-group-${i}`}>
            <rect
              x={4}
              y={y + 2}
              width={groupLeft - 10}
              height={h - 4}
              rx={4}
              className="strides-matrix-group"
              style={{ stroke: color, fill: color }}
            />
            <text x={groupLeft - 12} y={y + h / 2} textAnchor="end" dominantBaseline="middle" className="strides-matrix-group-label" style={{ fill: color }}>
              {group.label}
            </text>
          </g>
        )
      })}
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
            layoutId={getLayoutId ? getLayoutId(row, col) : id ? `${id}-cell-${row}-${col}` : undefined}
            label={cellLabels?.[row]?.[col]}
            anchorName={anchorPrefix ? `${anchorPrefix}-${row}-${col}` : undefined}
            onHoverChange={handleHoverChange}
          />
        )),
      )}
    </svg>
  )
}
