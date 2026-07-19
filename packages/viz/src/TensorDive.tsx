'use client'

import {
  useEffect, useRef, useState,
  type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode,
} from 'react'
import { CATEGORICAL, tint } from './palette'

/** Nested arrays matching the tensor's shape; leaves are the innermost values. */
export type DiveTree = (string | number)[] | DiveTree[]

export interface TensorDiveLevel {
  /** Dimension name, e.g. "batch", "tokens". */
  name: string
  /** Optional per-index labels for this dimension (e.g. token strings). */
  indexLabels?: string[]
}

export interface TensorDiveProps {
  /** Tensor name shown in the breadcrumb and index bar, e.g. "queries". */
  name: string
  /** One entry per dimension, outermost first. */
  levels: TensorDiveLevel[]
  /** Nested to levels.length depth; the innermost array holds the leaf values. */
  values: DiveTree
  /** Identity colors, assigned by index along `colorDim`. Defaults to the validated categorical palette. */
  palette?: string[]
  /** Which dimension's index picks a node's color (default 1 if it exists, else 0). */
  colorDim?: number
  /** Optional dimension whose index picks a border dash pattern (identity without another hue). */
  dashDim?: number
}

export interface DiveNode {
  path: number[]
  level: number
  x: number
  y: number
  w: number
  h: number
  value?: string
  children: DiveNode[]
}

const VIEW_W = 1200
const VIEW_H = 675
const DASHES = ['none', '4 3', '1.5 3']

/* ---------- pure layout ---------- */

export function buildDiveTree(values: DiveTree, depth: number): DiveNode {
  const root: DiveNode = { path: [], level: 0, x: 80, y: 60, w: VIEW_W - 160, h: VIEW_H - 115, children: [] }
  layoutChildren(root, values, depth)
  return root
}

function layoutChildren(node: DiveNode, values: DiveTree, depth: number): void {
  const items = values as DiveTree[]
  const k = items.length
  if (k === 0) return

  const pad = Math.max(6, Math.min(24, Math.min(node.w, node.h) * 0.06))
  const topPad = node.level === 0 ? 48 : pad
  const labelStrip = node.level === 0 ? 8 : Math.max(14, Math.min(34, node.h * 0.16))
  const innerX = node.x + pad
  const innerY = node.y + topPad
  const innerW = node.w - pad * 2
  const innerH = node.h - topPad - pad - labelStrip
  if (innerW <= 0 || innerH <= 0) return

  const cols = Math.min(k, Math.max(1, Math.round(Math.sqrt((k * innerW) / innerH))))
  const rows = Math.ceil(k / cols)
  const gap = Math.max(4, Math.min(16, innerW * 0.03))
  const cellW = (innerW - gap * (cols - 1)) / cols
  const cellH = (innerH - gap * (rows - 1)) / rows
  // breathing space: children fill ~82% of their cell so each dive level zooms meaningfully
  const shrink = 0.82
  const childW = cellW * shrink
  const childH = cellH * shrink

  const isLeafLevel = node.level + 1 === depth
  items.forEach((item, i) => {
    const c = i % cols
    const r = Math.floor(i / cols)
    const cx = innerX + c * (cellW + gap) + cellW / 2
    const cy = innerY + r * (cellH + gap) + cellH / 2
    let child: DiveNode
    if (isLeafLevel) {
      const radius = Math.min(childW, childH) / 2
      child = {
        path: [...node.path, i], level: node.level + 1,
        x: cx - radius, y: cy - radius, w: radius * 2, h: radius * 2,
        value: String(item), children: [],
      }
    } else {
      child = {
        path: [...node.path, i], level: node.level + 1,
        x: cx - childW / 2, y: cy - childH / 2, w: childW, h: childH,
        children: [],
      }
      layoutChildren(child, item, depth)
    }
    node.children.push(child)
  })
}

export function fitCamera(node: DiveNode): { cx: number; cy: number; z: number } {
  if (node.level === 0) return { cx: VIEW_W / 2, cy: VIEW_H / 2, z: 1 }
  const pad = 1.35
  const z = Math.min(VIEW_W / (node.w * pad), VIEW_H / (node.h * pad), 24)
  return { cx: node.x + node.w / 2, cy: node.y + node.h / 2, z: Math.max(z, 1) }
}

const isPrefix = (a: number[], b: number[]) => a.length <= b.length && a.every((v, i) => b[i] === v)

/**
 * Click semantics: clicking inside the focus dives ONE level toward the click;
 * clicking the focus itself or outside it rises one level.
 */
export function drillTargetPath(clicked: number[], focus: number[]): number[] {
  if (isPrefix(focus, clicked) && clicked.length > focus.length) return clicked.slice(0, focus.length + 1)
  return focus.slice(0, Math.max(0, focus.length - 1))
}

function nodeAt(root: DiveNode, path: number[]): DiveNode {
  let n = root
  for (const i of path) n = n.children[i]
  return n
}

/** Median fit-zoom per level — drives the label level-of-detail bands. */
export function zoomLadder(root: DiveNode, depth: number): number[] {
  const ladder: number[] = [1]
  let frontier = [root]
  for (let l = 1; l <= depth; l++) {
    frontier = frontier.flatMap((n) => n.children)
    if (frontier.length === 0) break
    const zs = frontier.map((n) => fitCamera(n).z).sort((a, b) => a - b)
    ladder.push(zs[Math.floor(zs.length / 2)])
  }
  return ladder
}

function lodOpacity(z: number, lo: number, hi?: number): number {
  if (lo > 0) {
    if (z < lo * 0.72) return 0
    if (z < lo) return (z - lo * 0.72) / (lo * 0.28)
  }
  if (hi !== undefined) {
    if (z > hi * 1.6) return 0
    if (z > hi) return 1 - (z - hi) / (hi * 0.6)
  }
  return 1
}

/* ---------- component ---------- */

export function TensorDive({ name, levels, values, palette = CATEGORICAL, colorDim, dashDim }: TensorDiveProps) {
  const depth = levels.length
  const colorAxis = colorDim ?? (depth > 1 ? 1 : 0)
  const [root] = useState(() => buildDiveTree(values, depth))
  const [ladder] = useState(() => zoomLadder(root, depth))
  const [focus, setFocus] = useState<number[]>([])
  const [camera, setCamera] = useState(() => fitCamera(root))
  const [hover, setHover] = useState<number[] | null>(null)
  const animRef = useRef(0)
  const cameraRef = useRef(camera)
  cameraRef.current = camera

  useEffect(() => {
    const target = fitCamera(nodeAt(root, focus))
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      setCamera(target)
      return
    }
    cancelAnimationFrame(animRef.current)
    const from = { ...cameraRef.current }
    const start = performance.now()
    const dur = 850
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur)
      const e = ease(p)
      setCamera({
        cx: from.cx + (target.cx - from.cx) * e,
        cy: from.cy + (target.cy - from.cy) * e,
        z: from.z + (target.z - from.z) * e,
      })
      if (p < 1) animRef.current = requestAnimationFrame(step)
    }
    animRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus])

  const dimIndexLabel = (dim: number, i: number) =>
    levels[dim]?.indexLabels?.[i] ?? `${levels[dim]?.name ?? 'dim'} ${i}`

  const nodeColor = (n: DiveNode): string | null =>
    n.level - 1 === colorAxis || (n.value !== undefined && n.path.length > colorAxis)
      ? palette[n.path[colorAxis] % palette.length]
      : null

  const shapeOf = (v: DiveTree): number[] => {
    const s: number[] = []
    let cur: DiveTree = v
    for (let l = 0; l < depth; l++) {
      s.push((cur as DiveTree[]).length)
      cur = (cur as DiveTree[])[0]
    }
    return s
  }
  const shape = shapeOf(values)

  const onNodeClick = (n: DiveNode) => setFocus(drillTargetPath(n.path, focus))
  const rise = () => setFocus(focus.slice(0, Math.max(0, focus.length - 1)))

  const renderNode = (n: DiveNode): ReactNode => {
    const color = nodeColor(n)
    const dash = dashDim !== undefined && n.level - 1 === dashDim ? DASHES[n.path[dashDim] % DASHES.length] : 'none'
    const isHover = hover !== null && hover.length === n.path.length && isPrefix(n.path, hover)
    const strokeW = isHover ? 2.75 : n.level === 0 ? 1.5 : 1.3
    const labelLo = n.level <= 1 ? 0 : ladder[n.level - 1] * 0.72
    const labelHi = n.level + 1 < ladder.length ? ladder[n.level + 1] * 1.05 : undefined
    const labelOp = lodOpacity(camera.z, labelLo, labelHi)

    const common = {
      onClick: (e: ReactMouseEvent) => { e.stopPropagation(); onNodeClick(n) },
      onPointerEnter: (e: ReactPointerEvent) => { e.stopPropagation(); setHover(n.path) },
      onPointerLeave: () => setHover(null),
      style: { cursor: 'pointer' } as CSSProperties,
    }

    if (n.value !== undefined) {
      const leafLo = ladder[Math.max(0, n.level - 2)] * 0.6
      return (
        <g key={n.path.join('.')}>
          <circle
            cx={n.x + n.w / 2} cy={n.y + n.h / 2} r={n.w / 2}
            fill={color ? tint(color, 0.16) : 'var(--strides-color-surface)'}
            stroke={color ?? 'var(--strides-color-border)'}
            strokeWidth={strokeW} strokeDasharray={dash} vectorEffect="non-scaling-stroke"
            data-strides-dive-leaf={n.path.join('.')}
            {...common}
          />
          <text
            x={n.x + n.w / 2} y={n.y + n.h / 2} textAnchor="middle" dominantBaseline="middle"
            className="strides-dive-text strides-dive-text--value"
            opacity={lodOpacity(camera.z, leafLo)} fontSize={Math.max(6, n.w * 0.36)}
          >
            {n.value}
          </text>
        </g>
      )
    }

    const label = n.level === 0 ? `${name} (${shape.join(', ')})` : dimIndexLabel(n.level - 1, n.path[n.level - 1])
    return (
      <g key={n.path.join('.') || 'root'}>
        <rect
          x={n.x} y={n.y} width={n.w} height={n.h} rx={n.level === 0 ? 14 : 9}
          fill={color ? tint(color, 0.10) : n.level === 0 ? 'var(--strides-color-bg)' : 'var(--strides-color-surface)'}
          stroke={color ?? 'var(--strides-color-border)'}
          strokeWidth={strokeW} strokeDasharray={dash} vectorEffect="non-scaling-stroke"
          data-strides-dive-node={n.path.join('.') || 'root'}
          {...common}
        />
        {n.level === 0 ? (
          <text x={n.x + 22} y={n.y + 30} className="strides-dive-text strides-dive-text--title" opacity={labelOp} fontSize={16}>
            {label}
          </text>
        ) : (
          <text
            x={n.x + n.w / 2} y={n.y + n.h - Math.max(8, n.h * 0.07)} textAnchor="middle"
            className="strides-dive-text" opacity={labelOp}
            fontSize={Math.max(4, Math.min(13, n.h * 0.1))}
          >
            {label}
          </text>
        )}
        {n.children.map(renderNode)}
      </g>
    )
  }

  const chosen = focus
  return (
    <div className="strides-tensor-dive" onKeyDown={(e) => { if (e.key === 'Escape') rise() }} tabIndex={0}>
      <div className="strides-dive-shapebar" data-strides-dive-shapebar>
        {name}[
        {levels.map((l, d) => (
          <span key={d}>
            {d > 0 && ', '}
            <span className={d < chosen.length ? 'strides-dive-dim--done' : d === chosen.length ? 'strides-dive-dim--now' : undefined}>
              {d < chosen.length ? chosen[d] : '·'}
            </span>
          </span>
        ))}
        ]{' — ('}
        {levels.map((l, d) => (
          <span key={d} className={d < chosen.length ? 'strides-dive-dim--done' : d === chosen.length ? 'strides-dive-dim--now' : undefined}>
            {d > 0 && ', '}{l.name}{d === chosen.length ? ' ← choose' : d < chosen.length ? ' ✓' : ''}
          </span>
        ))}
        {')'}
      </div>
      <svg
        viewBox={`${camera.cx - VIEW_W / 2 / camera.z} ${camera.cy - VIEW_H / 2 / camera.z} ${VIEW_W / camera.z} ${VIEW_H / camera.z}`}
        className="strides-dive-stage"
        onClick={rise}
        role="img"
        aria-label={`Zoomable view of ${name}`}
      >
        {renderNode(root)}
      </svg>
      <div className="strides-dive-crumbs">
        <button type="button" className={focus.length === 0 ? 'strides-dive-crumb strides-dive-crumb--here' : 'strides-dive-crumb'} onClick={() => setFocus([])}>
          {name}
        </button>
        {focus.map((idx, d) => (
          <span key={d}>
            <span className="strides-dive-crumb-sep">›</span>
            <button
              type="button"
              className={d === focus.length - 1 ? 'strides-dive-crumb strides-dive-crumb--here' : 'strides-dive-crumb'}
              onClick={() => setFocus(focus.slice(0, d + 1))}
            >
              {dimIndexLabel(d, idx)}
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
