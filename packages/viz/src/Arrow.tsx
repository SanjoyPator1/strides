'use client'

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

interface AnchorRect {
  top: number
  left: number
  width: number
  height: number
}

interface ArrowOverlayContextValue {
  registerAnchor: (name: string, el: Element | null) => void
  rects: Map<string, AnchorRect>
  markerId: string
  svgLayer: SVGGElement | null
}

const ArrowOverlayContext = createContext<ArrowOverlayContextValue | null>(null)

export interface ArrowOverlayProps {
  /** Anchors, plain content, and Arrow elements, freely mixed — Arrow can be nested anywhere in here. */
  children: ReactNode
  className?: string
}

/**
 * A positioned region that lets `<Arrow>` elements connect named `<Anchor>`s
 * anywhere inside it — including across separate components (a label pointing
 * at a Matrix, one Matrix pointing at another), at any relative position or
 * angle — without hand-computed pixel coordinates. Arrows portal their SVG
 * markup into a shared overlay layer, so they can live anywhere in the tree
 * (not just as direct children) and never end up rendered outside an <svg>.
 */
export function ArrowOverlay({ children, className }: ArrowOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const anchorsRef = useRef(new Map<string, Element>())
  const [rects, setRects] = useState<Map<string, AnchorRect>>(new Map())
  const [svgLayer, setSvgLayer] = useState<SVGGElement | null>(null)
  const markerId = `strides-arrowhead-${useId().replace(/:/g, '')}`

  const measure = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const containerBox = container.getBoundingClientRect()
    const next = new Map<string, AnchorRect>()
    for (const [name, el] of anchorsRef.current) {
      const box = el.getBoundingClientRect()
      next.set(name, {
        top: box.top - containerBox.top,
        left: box.left - containerBox.left,
        width: box.width,
        height: box.height,
      })
    }
    setRects(next)
  }, [])

  const registerAnchor = useCallback(
    (name: string, el: Element | null) => {
      if (el) anchorsRef.current.set(name, el)
      else anchorsRef.current.delete(name)
      measure()
    },
    [measure],
  )

  const svgLayerRef = useCallback((el: SVGGElement | null) => {
    setSvgLayer(el)
  }, [])

  useLayoutEffect(() => {
    measure()
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => measure())
    observer.observe(container)
    return () => observer.disconnect()
  }, [measure, children])

  const value = useMemo<ArrowOverlayContextValue>(
    () => ({ registerAnchor, rects, markerId, svgLayer }),
    [registerAnchor, rects, markerId, svgLayer],
  )

  return (
    <ArrowOverlayContext.Provider value={value}>
      <div ref={containerRef} className={className ? `strides-arrow-overlay ${className}` : 'strides-arrow-overlay'}>
        {children}
        <svg className="strides-arrow-svg" aria-hidden="true">
          <defs>
            <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="strides-arrow-marker" />
            </marker>
          </defs>
          <g ref={svgLayerRef} />
        </svg>
      </div>
    </ArrowOverlayContext.Provider>
  )
}

export interface AnchorProps {
  /** Name other `<Arrow>`s use to point at this element. */
  name: string
  children: ReactNode
  as?: 'div' | 'span'
  className?: string
}

/**
 * Registers `name` as an arrow endpoint pointing at whatever DOM/SVG element the returned
 * ref callback is attached to. Lower-level than `<Anchor>` — use this when you need to
 * anchor an element that already has its own tag (e.g. an SVG `<g>` inside `Matrix`),
 * rather than wrapping it in an extra `<div>`/`<span>`. `name` may be undefined to opt out
 * (e.g. no `anchorPrefix` given) without a conditional hook call.
 */
export function useAnchorRef(name: string | undefined): (el: Element | null) => void {
  const ctx = useContext(ArrowOverlayContext)
  // registerAnchor itself is stable (see ArrowOverlay); depending on it (not `ctx`, which is
  // a new object whenever rects changes) keeps this ref callback's identity stable too — an
  // unstable ref here causes React to detach+reattach on every render, which re-measures,
  // which re-renders, forever.
  const registerAnchor = ctx?.registerAnchor
  return useCallback(
    (el: Element | null) => {
      if (name) registerAnchor?.(name, el)
    },
    [registerAnchor, name],
  )
}

/** Marks any piece of content — a label, a Matrix, a paragraph — as an arrow endpoint. */
export function Anchor({ name, children, as = 'div', className }: AnchorProps) {
  const refCallback = useAnchorRef(name)
  const Tag = as

  return (
    <Tag ref={refCallback} className={className ? `strides-anchor ${className}` : 'strides-anchor'} data-anchor={name}>
      {children}
    </Tag>
  )
}

type Side = 'top' | 'bottom' | 'left' | 'right' | 'auto'
type ArrowPath = 'curved' | 'straight' | 'elbow'

export interface ArrowProps {
  /** Name of the `<Anchor>` this arrow starts at. */
  from: string
  /** Name of the `<Anchor>` this arrow points to. */
  to: string
  label?: string
  /** Which side of the "from" anchor to leave from; 'auto' (default) picks whichever side faces "to". */
  fromSide?: Side
  /** Which side of the "to" anchor to arrive at; 'auto' (default) picks whichever side faces "from". */
  toSide?: Side
  /**
   * 'curved' (default): a gentle quadratic bend. 'straight': a direct line. 'elbow': a single
   * right-angle bend — the standard look for a residual/skip connection running alongside a
   * main flow before rejoining it, rather than cutting diagonally across other content.
   */
  path?: ArrowPath
  /** Dashed stroke — the usual convention for a "this box is shown in more detail over here" pointer. */
  dashed?: boolean
  color?: string
}

function sidePoint(rect: AnchorRect, side: Side, towards: { x: number; y: number }): { x: number; y: number } {
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2

  if (side !== 'auto') {
    switch (side) {
      case 'top':
        return { x: cx, y: rect.top }
      case 'bottom':
        return { x: cx, y: rect.top + rect.height }
      case 'left':
        return { x: rect.left, y: cy }
      case 'right':
        return { x: rect.left + rect.width, y: cy }
    }
  }

  const candidates: Array<{ x: number; y: number }> = [
    { x: cx, y: rect.top },
    { x: cx, y: rect.top + rect.height },
    { x: rect.left, y: cy },
    { x: rect.left + rect.width, y: cy },
  ]
  return candidates.reduce((best, candidate) =>
    Math.hypot(candidate.x - towards.x, candidate.y - towards.y) < Math.hypot(best.x - towards.x, best.y - towards.y)
      ? candidate
      : best,
  )
}

function resolvedSide(rect: AnchorRect, side: Side, towards: { x: number; y: number }): Side {
  if (side !== 'auto') return side
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const dx = towards.x - cx
  const dy = towards.y - cy
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'bottom' : 'top'
}

const ELBOW_GUTTER_MARGIN = 24

/**
 * The coordinate an 'elbow' path should run alongside before turning back in to the target —
 * pushed just past whichever anchor's edge extends furthest in that direction among anchors
 * actually positioned between `start` and `end` along the travel axis. A bend placed at just
 * the target's own edge (rather than this gutter) cuts straight through any wider content
 * sitting in between, since the two connected nodes are often narrower than nodes they skip
 * over (e.g. a residual connection from a slim "+" node past a wide attention block).
 */
function elbowGutter(
  rects: Map<string, AnchorRect>,
  start: { x: number; y: number },
  end: { x: number; y: number },
  exitSide: Side,
): number {
  const vertical = exitSide === 'left' || exitSide === 'right'
  const spanLo = vertical ? Math.min(start.y, end.y) : Math.min(start.x, end.x)
  const spanHi = vertical ? Math.max(start.y, end.y) : Math.max(start.x, end.x)
  const growing = exitSide === 'right' || exitSide === 'bottom'

  let extreme = vertical
    ? growing
      ? Math.max(start.x, end.x)
      : Math.min(start.x, end.x)
    : growing
      ? Math.max(start.y, end.y)
      : Math.min(start.y, end.y)

  for (const rect of rects.values()) {
    const rectLo = vertical ? rect.top : rect.left
    const rectHi = vertical ? rect.top + rect.height : rect.left + rect.width
    if (rectHi < spanLo || rectLo > spanHi) continue // outside the travel span, not in the way

    const edge = vertical ? (growing ? rect.left + rect.width : rect.left) : growing ? rect.top + rect.height : rect.top
    extreme = growing ? Math.max(extreme, edge) : Math.min(extreme, edge)
  }

  return growing ? extreme + ELBOW_GUTTER_MARGIN : extreme - ELBOW_GUTTER_MARGIN
}

function buildPath(
  start: { x: number; y: number },
  end: { x: number; y: number },
  path: ArrowPath,
  exitSide: Side,
  gutter: number,
): string {
  if (path === 'straight') {
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`
  }
  if (path === 'elbow') {
    // Runs alongside the flow at `gutter` (clear of anything in between) before turning back
    // in to the target — the standard "residual connection" look, rather than a single bend
    // that cuts straight through whatever sits between the two endpoints.
    if (exitSide === 'left' || exitSide === 'right') {
      return `M ${start.x} ${start.y} L ${gutter} ${start.y} L ${gutter} ${end.y} L ${end.x} ${end.y}`
    }
    return `M ${start.x} ${start.y} L ${start.x} ${gutter} L ${end.x} ${gutter} L ${end.x} ${end.y}`
  }
  const midX = (start.x + end.x) / 2
  return `M ${start.x} ${start.y} Q ${midX} ${start.y} ${end.x} ${end.y}`
}

/**
 * Draws a connector between two `<Anchor>`s, wherever they are — diagonal, stacked,
 * scattered in a grid, it doesn't matter, since the path is computed from each
 * anchor's actual measured position. Renders via a portal, so it can be placed
 * anywhere inside `<ArrowOverlay>`, not just as a direct child.
 */
export function Arrow({ from, to, label, fromSide = 'auto', toSide = 'auto', path = 'curved', dashed = false, color }: ArrowProps) {
  const ctx = useContext(ArrowOverlayContext)
  if (!ctx || !ctx.svgLayer) return null

  const fromRect = ctx.rects.get(from)
  const toRect = ctx.rects.get(to)
  if (!fromRect || !toRect) return null

  const toCenter = { x: toRect.left + toRect.width / 2, y: toRect.top + toRect.height / 2 }
  const fromCenter = { x: fromRect.left + fromRect.width / 2, y: fromRect.top + fromRect.height / 2 }

  const exitSide = resolvedSide(fromRect, fromSide, toCenter)
  const start = sidePoint(fromRect, exitSide, toCenter)
  const end = sidePoint(toRect, toSide, fromCenter)

  const gutter = path === 'elbow' ? elbowGutter(ctx.rects, start, end, exitSide) : 0
  const d = buildPath(start, end, path, exitSide, gutter)

  // For an elbow, label alongside the gutter run (where the connector actually is), not the
  // straight-line midpoint between the two endpoints — which for a dogleg route can land
  // nowhere near the visible path.
  const labelPos =
    path === 'elbow'
      ? exitSide === 'left' || exitSide === 'right'
        ? { x: gutter, y: (start.y + end.y) / 2 }
        : { x: (start.x + end.x) / 2, y: gutter }
      : { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }

  return createPortal(
    <>
      <path
        d={d}
        className="strides-arrow-path"
        markerEnd={`url(#${ctx.markerId})`}
        fill="none"
        style={{ ...(color ? { stroke: color } : undefined), ...(dashed ? { strokeDasharray: '6 4' } : undefined) }}
      />
      {label ? (
        <text x={labelPos.x} y={labelPos.y - 6} textAnchor="middle" className="strides-arrow-label">
          {label}
        </text>
      ) : null}
    </>,
    ctx.svgLayer,
  )
}
