'use client'

import { useState } from 'react'
import { Matrix } from './Matrix'

/** A nested array matching a tensor's shape, bottoming out in a plain number[] (the innermost axis). */
export type TensorTree = number[] | TensorTree[]

export interface TensorExplorerProps {
  /** One label per axis *except* the innermost, which renders as a row of numbers (e.g. "head_dim"). */
  axisLabels: string[]
  /** Optional per-axis index labels (e.g. axisIndexLabels[1] = token strings). Falls back to "{axisLabel} {index}". */
  axisIndexLabels?: (string[] | undefined)[]
  /** Nested to a depth of axisLabels.length, bottoming out in number[] arrays. */
  values: TensorTree
  /** One color per axis depth; cycles if there are more axes than colors. */
  colors?: string[]
  precision?: number
  cellSize?: number
}

const DEFAULT_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2']

/**
 * Drills into a tensor of arbitrary depth (batch, sequence, heads, head_dim, ...) — click a
 * group to expand it and see what's inside. The first index at every level starts expanded,
 * so there's always one complete path down to real numbers visible without clicking anything;
 * click any sibling to compare. Each depth gets its own color, consistent across the whole tree.
 */
export function TensorExplorer({ axisLabels, axisIndexLabels, values, colors = DEFAULT_COLORS, precision = 2, cellSize }: TensorExplorerProps) {
  return (
    <div className="strides-tensor-explorer">
      <TensorLevel depth={0} axisLabels={axisLabels} axisIndexLabels={axisIndexLabels} values={values} colors={colors} precision={precision} cellSize={cellSize} />
    </div>
  )
}

interface TensorLevelProps {
  depth: number
  axisLabels: string[]
  axisIndexLabels?: (string[] | undefined)[]
  values: TensorTree
  colors: string[]
  precision: number
  cellSize?: number
}

function TensorLevel({ depth, axisLabels, axisIndexLabels, values, colors, precision, cellSize }: TensorLevelProps) {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([0]))

  if (depth >= axisLabels.length) {
    const leaf = values as number[]
    return <Matrix values={[leaf]} colorScale="sequential" precision={precision} cellSize={cellSize} />
  }

  const children = values as TensorTree[]
  const color = colors[depth % colors.length]
  const indexLabels = axisIndexLabels?.[depth]

  const toggle = (index: number) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  return (
    <div className={depth === 0 ? 'strides-tensor-explorer-level strides-tensor-explorer-level--row' : 'strides-tensor-explorer-level strides-tensor-explorer-level--column'}>
      {children.map((child, index) => {
        const label = indexLabels?.[index] ?? `${axisLabels[depth]} ${index}`
        const isExpanded = expanded.has(index)
        return (
          <div key={index} className="strides-tensor-explorer-group" style={{ borderColor: color }}>
            <button
              type="button"
              className="strides-tensor-explorer-toggle"
              style={{ color }}
              aria-expanded={isExpanded}
              onClick={() => toggle(index)}
            >
              <span className="strides-tensor-explorer-caret">{isExpanded ? '▾' : '▸'}</span>
              {label}
            </button>
            {isExpanded ? (
              <div className="strides-tensor-explorer-children">
                <TensorLevel
                  depth={depth + 1}
                  axisLabels={axisLabels}
                  axisIndexLabels={axisIndexLabels}
                  values={child}
                  colors={colors}
                  precision={precision}
                  cellSize={cellSize}
                />
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
