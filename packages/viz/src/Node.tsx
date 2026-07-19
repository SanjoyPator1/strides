'use client'

import type { ReactNode } from 'react'
import { useAnchorRef } from './Arrow'

export type NodeShape = 'rect' | 'pill' | 'hexagon' | 'trapezoid' | 'circle'

export interface NodeProps {
  children: ReactNode
  /** default 'rect' */
  shape?: NodeShape
  color?: string
  textColor?: string
  /** If inside an ArrowOverlay, registers this node as an arrow endpoint under this name. */
  anchor?: string
  className?: string
}

/**
 * A labeled operation box — the building block for architecture/flow diagrams (Linear,
 * LayerNorm, Softmax, ...). Purely presentational: layout is up to you (flex/grid/`Flow`),
 * and it becomes an `Arrow` endpoint automatically when given an `anchor` name.
 */
export function Node({ children, shape = 'rect', color, textColor, anchor, className }: NodeProps) {
  const anchorRef = useAnchorRef(anchor)

  return (
    <div
      ref={anchorRef}
      data-anchor={anchor}
      className={className ? `strides-node strides-node--${shape} ${className}` : `strides-node strides-node--${shape}`}
      style={{ background: color, color: textColor }}
    >
      {children}
    </div>
  )
}
