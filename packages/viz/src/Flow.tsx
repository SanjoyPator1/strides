'use client'

import { Children, type ReactNode } from 'react'
import { ArrowOverlay, Anchor, Arrow } from './Arrow'

export interface FlowExtraArrow {
  /** Item position, 0-indexed, e.g. 0 for the first child. */
  from: number
  to: number
  label?: string
  path?: 'curved' | 'straight' | 'elbow'
  /** Which side to leave/arrive from. Defaults to the side opposite the main flow axis (e.g.
   *  'right' for a vertical flow) so a skip connection routes *around* the nodes it jumps
   *  over, rather than a straight line running back through them. */
  fromSide?: 'top' | 'bottom' | 'left' | 'right'
  toSide?: 'top' | 'bottom' | 'left' | 'right'
  dashed?: boolean
  color?: string
}

export interface FlowProps {
  /** Each child becomes one node in the pipeline, in order. */
  children: ReactNode
  /** default 'vertical' */
  direction?: 'vertical' | 'horizontal'
  /** Gap between items, in px. Default 32. */
  gap?: number
  /** Label to show on each automatic consecutive-item arrow, e.g. one per pair. */
  arrowLabels?: (string | undefined)[]
  color?: string
  /**
   * Extra arrows beyond the automatic consecutive-item connectors — e.g. a residual/skip
   * connection running from item 0 to item 2. Reference items by their position in `children`.
   */
  extraArrows?: FlowExtraArrow[]
}

/**
 * A simple top-to-bottom (or left-to-right) pipeline: each child gets wired to the next with
 * an automatic arrow, so you don't have to name-and-connect every box by hand for the common
 * straight-line case. Wraps its own `ArrowOverlay` — for diagrams that need arrows crossing
 * *between* separate diagrams (e.g. a "shown in detail over here" pointer), compose
 * `ArrowOverlay`/`Anchor`/`Arrow`/`Node` directly instead.
 */
export function Flow({ children, direction = 'vertical', gap = 32, arrowLabels, color, extraArrows }: FlowProps) {
  const items = Children.toArray(children)
  const fromSide = direction === 'vertical' ? 'bottom' : 'right'
  const toSide = direction === 'vertical' ? 'top' : 'left'
  const anchorName = (index: number) => `flow-item-${index}`

  return (
    <ArrowOverlay>
      <div
        className={`strides-flow strides-flow--${direction}`}
        style={{ display: 'flex', flexDirection: direction === 'vertical' ? 'column' : 'row', alignItems: 'center', gap }}
      >
        {items.map((item, index) => (
          <Anchor key={index} name={anchorName(index)}>
            {item}
          </Anchor>
        ))}
      </div>
      {items.slice(1).map((_, index) => (
        <Arrow
          key={index}
          from={anchorName(index)}
          to={anchorName(index + 1)}
          fromSide={fromSide}
          toSide={toSide}
          path="straight"
          color={color}
          label={arrowLabels?.[index]}
        />
      ))}
      {extraArrows?.map((extra, index) => {
        const skipSide = direction === 'vertical' ? 'right' : 'bottom'
        return (
          <Arrow
            key={`extra-${index}`}
            from={anchorName(extra.from)}
            to={anchorName(extra.to)}
            fromSide={extra.fromSide ?? skipSide}
            toSide={extra.toSide ?? skipSide}
            path={extra.path ?? 'elbow'}
            dashed={extra.dashed}
            color={extra.color ?? color}
            label={extra.label}
          />
        )
      })}
    </ArrowOverlay>
  )
}
