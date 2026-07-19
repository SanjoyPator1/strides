'use client'

import { useState, type ReactNode } from 'react'
import { CATEGORICAL, DIM_COLORS, tint } from './palette'
import { roughArrowPaths, roughEllipsePaths } from './rough'
import type { DiveTree, TensorDiveLevel } from './TensorDive'

export interface BracketAnnotation {
  /** Index constraints, one per dimension; null = any index. E.g. [0, null, 0, null] = "head 0's slots in batch 0". */
  target: (number | null)[]
  label: string
  /** Where the label sits: 'left' = the gutter beside the body, 'above' = the band under the legend. */
  side?: 'left' | 'above'
  color?: string
}

export interface BracketDiagramProps {
  /** Tensor name, e.g. "queries". */
  name: string
  /** One entry per dimension, outermost first (same shape as TensorDive's levels). */
  levels: TensorDiveLevel[]
  /** Nested to levels.length depth; leaves are the cell values (letters, numbers). */
  values: DiveTree
  /** Bracket colors, one per dimension. Defaults to the validated DIM_COLORS set. */
  dimColors?: string[]
  /** Identity colors for row labels (dots) and letter washes. Defaults to the validated categorical palette. */
  palette?: string[]
  /** Render dim-0 siblings after the first as condensed inline blocks (default true for 3+ dims). */
  condenseAfterFirst?: boolean
  /** Hand-drawn teacher markup anchored to index constraints. */
  annotations?: BracketAnnotation[]
  /** Example indices rendered below with hover-to-trace arrows, e.g. [[0,1,0,0]]. */
  indexExamples?: number[][]
}

/* ---------- pure layout ---------- */

const FS = 20
const CW = FS * 0.6
const LH = 36
const HX = 70
const X0 = 230
const Y0 = 190
const VIEW_W = 1200
const MARGIN_X = X0 + 26 * CW

export interface BracketRun {
  x: number
  y: number
  text: string
  fs: number
  fill: string
  weight?: number
  italic?: boolean
  role: 'plain' | 'bracket' | 'letter' | 'margin' | 'index' | 'title'
  dim?: number
  path?: string
  leafIdx?: number[]
}

interface Chip { x: number; y: number; w: number; h: number; color: string }
interface Scribble {
  ellipse: { cx: number; cy: number; rx: number; ry: number }
  labelLines: { x: number; y: number; text: string }[]
  arrow: { x1: number; y1: number; x2: number; y2: number }
  color: string
  seed: number
}
export interface BracketLayout {
  runs: BracketRun[]
  chips: Chip[]
  indexLines: { idx: number[]; y: number; endX: number }[]
  scribbles: Scribble[]
  height: number
}

const INK = 'var(--strides-color-fg)'
const MUTED = 'var(--strides-color-fg-muted, #898781)'

export function matchPath(runPath: string, focusPath: string): boolean {
  return runPath === '' || focusPath === runPath || focusPath.startsWith(runPath + '.')
}

export function layoutBracket(props: BracketDiagramProps): BracketLayout {
  const { name, levels, values } = props
  const dimColors = props.dimColors ?? DIM_COLORS
  const palette = props.palette ?? CATEGORICAL
  const D = levels.length
  const breakDim = Math.max(1, D - 2)
  const rowDim = breakDim - 1
  const condense = props.condenseAfterFirst ?? D >= 3

  const runs: BracketRun[] = []
  const chips: Chip[] = []
  const indexLines: BracketLayout['indexLines'] = []
  let line = 0
  let chars = 0
  const lineY = (i = line) => Y0 + i * LH

  const put = (text: string, opts: Partial<BracketRun> & { x?: number; y?: number } = {}): BracketRun => {
    const run: BracketRun = {
      x: opts.x ?? X0 + chars * CW,
      y: opts.y ?? lineY(),
      text,
      fs: opts.fs ?? FS,
      fill: opts.fill ?? INK,
      weight: opts.weight,
      italic: opts.italic,
      role: opts.role ?? 'plain',
      dim: opts.dim,
      path: opts.path,
      leafIdx: opts.leafIdx,
    }
    runs.push(run)
    if (opts.x === undefined) chars += text.length
    return run
  }
  const bracket = (ch: string, dim: number, path: number[]) =>
    put(ch, { fill: dimColors[dim % dimColors.length], weight: 700, role: 'bracket', dim, path: path.join('.') })

  const dimIndexLabel = (dim: number, i: number) =>
    levels[dim]?.indexLabels?.[i] ?? `${levels[dim]?.name ?? 'dim'} ${i}`

  const marginNote = (parts: { text: string; fill?: string; weight?: number }[]) => {
    let x = MARGIN_X
    put('← ', { x, y: lineY(), fill: MUTED, role: 'margin' })
    x += 2 * CW
    for (const p of parts) {
      put(p.text, { x, y: lineY(), fill: p.fill ?? INK, fs: 16, role: 'margin', weight: p.weight })
      x += p.text.length * 16 * 0.6
    }
  }

  /** Inline emitter for subtrees from `dim` down; leaves become letter runs. */
  const emitInline = (value: DiveTree, dim: number, path: number[]): void => {
    bracket('[', dim, path)
    const items = value as (DiveTree | string | number)[]
    items.forEach((item, i) => {
      if (i > 0) put(', ', { fill: MUTED })
      if (dim + 1 >= D) {
        put(String(item), { weight: 700, role: 'letter', path: [...path, i].join('.'), leafIdx: [...path, i] })
      } else {
        emitInline(item as DiveTree, dim + 1, [...path, i])
      }
    })
    bracket(']', dim, path)
  }

  /* header: shape chips + legend */
  {
    const shape: number[] = []
    let cur: DiveTree = values
    for (let d = 0; d < D; d++) { shape.push((cur as DiveTree[]).length); cur = (cur as DiveTree[])[0] as DiveTree }
    let x = HX
    const hy = 62
    const r0 = put(`${name}.shape = (`, { x, y: hy, fs: 22, role: 'title' })
    x += r0.text.length * 22 * 0.6
    shape.forEach((n, d) => {
      const txt = String(n)
      const w = txt.length * 22 * 0.6 + 14
      chips.push({ x: x - 4, y: hy - 20, w, h: 28, color: dimColors[d % dimColors.length] })
      put(txt, { x: x + 3, y: hy, fs: 22, weight: 700, role: 'title' })
      x += w + 6
      if (d < D - 1) { put(', ', { x: x - 4, y: hy, fs: 22, fill: MUTED, role: 'title' }); x += 2 * 22 * 0.6 }
    })
    put(')', { x, y: hy, fs: 22, role: 'title' })

    let lx = HX
    const ly = 104
    put('(', { x: lx, y: ly, fs: 15, fill: MUTED, role: 'title' }); lx += 9
    levels.forEach((l, d) => {
      put('●', { x: lx, y: ly, fs: 12, fill: dimColors[d % dimColors.length], role: 'title' }); lx += 14
      put(l.name, { x: lx, y: ly, fs: 15, fill: MUTED, role: 'title' }); lx += l.name.length * 9
      if (d < D - 1) { put(', ', { x: lx, y: ly, fs: 15, fill: MUTED, role: 'title' }); lx += 18 }
    })
    put(')', { x: lx, y: ly, fs: 15, fill: MUTED, role: 'title' })
  }

  /* body */
  const emitBlock = (value: DiveTree, dim: number, path: number[], isLast = true): void => {
    const items = value as DiveTree[]
    if (dim === 0) {
      put(`${name} = `, {})
      bracket('[', 0, path)
      marginNote([{ text: `${levels[0].name} dim — holds ${items.length}`, fill: 'var(--strides-color-fg)' }])
    } else {
      bracket('[', dim, path)
      marginNote([{ text: `${dimIndexLabel(dim - 1, path[dim - 1])} — holds ${items.length} ${levels[dim].name}`, fill: 'var(--strides-color-fg)' }])
    }

    const condensed = condense && dim + 1 === breakDim && path.length > 0 && path[0] > 0
    if (condensed) {
      const chunk = Math.ceil(items.length / 2)
      for (let start = 0; start < items.length; start += chunk) {
        line++; chars = 4
        for (let i = start; i < Math.min(start + chunk, items.length); i++) {
          emitInline(items[i], dim + 1, [...path, i])
          if (i < items.length - 1) put(', ', { fill: MUTED })
        }
      }
    } else if (dim + 1 === breakDim) {
      items.forEach((item, i) => {
        line++; chars = 4
        emitInline(item, dim + 1, [...path, i])
        if (i < items.length - 1) put(',', { fill: MUTED })
        marginNote([
          { text: '● ', fill: palette[i % palette.length] },
          { text: `"${dimIndexLabel(dim, i)}"`, fill: 'var(--strides-color-fg)', weight: 600 },
        ])
      })
    } else {
      items.forEach((item, i) => {
        line++; chars = 2
        emitBlock(item, dim + 1, [...path, i], i === items.length - 1)
      })
    }

    line++; chars = dim === 0 ? 0 : 2
    bracket(']', dim, path)
    if (!isLast) put(',', { fill: MUTED })
    if (dim > 0) {
      marginNote([{ text: `end ${dimIndexLabel(dim - 1, path[dim - 1])}`, fill: MUTED }])
    }
  }
  emitBlock(values, 0, [])
  const bodyEnd = lineY()

  /* indexing block */
  if (props.indexExamples && props.indexExamples.length > 0) {
    const IY0 = bodyEnd + 78
    put(`Indexing: ${name}[${levels.map((l) => l.name).join(', ')}]`, { x: HX, y: IY0 - 40, fs: 16, fill: 'var(--strides-color-fg)', weight: 600, role: 'index' })
    props.indexExamples.forEach((idx, n) => {
      const y = IY0 + n * 36
      let x = HX
      put(`${name}[`, { x, y, fs: 18, role: 'index' }); x += (name.length + 1) * 18 * 0.6
      idx.forEach((v, d) => {
        chips.push({ x: x - 3, y: y - 16, w: 18 * 0.6 + 8, h: 24, color: dimColors[d % dimColors.length] })
        put(String(v), { x, y, fs: 18, weight: 700, role: 'index' }); x += 18 * 0.6 + 8
        if (d < idx.length - 1) { put(', ', { x, y, fs: 18, fill: MUTED, role: 'index' }); x += 2 * 18 * 0.6 }
      })
      put('] = ', { x, y, fs: 18, role: 'index' }); x += 4 * 18 * 0.6
      let leaf: DiveTree | string | number = values
      for (const v of idx) leaf = (leaf as DiveTree[])[v]
      put(String(leaf), { x, y, fs: 18, weight: 700, role: 'index' })
      const desc = idx.slice(0, Math.max(1, idx.length - 1)).map((v, d) => dimIndexLabel(d, v)).join(' · ')
      put(`← ${desc}`, { x: x + 3 * 18 * 0.6 + 12, y, fs: 14, fill: MUTED, role: 'index' })
      indexLines.push({ idx, y, endX: x + 18 * 0.6 })
    })
  }

  /* annotations → scribble geometry */
  const scribbles: Scribble[] = []
  const letterRuns = runs.filter((r) => r.role === 'letter')
  const matchesTarget = (leafIdx: number[], target: (number | null)[]) =>
    target.every((v, d) => v === null || leafIdx[d] === undefined || leafIdx[d] === v)
  props.annotations?.forEach((ann, ai) => {
    const hits = letterRuns.filter((r) => r.leafIdx && matchesTarget(r.leafIdx, ann.target))
    if (hits.length === 0) return
    const x1 = Math.min(...hits.map((r) => r.x)) - 10
    const x2 = Math.max(...hits.map((r) => r.x + r.text.length * CW)) + 10
    const y1 = Math.min(...hits.map((r) => r.y)) - FS * 0.9
    const y2 = Math.max(...hits.map((r) => r.y)) + FS * 0.35
    const cx = (x1 + x2) / 2
    const cy = (y1 + y2) / 2
    const color = ann.color ?? MUTED
    if (ann.side === 'left') {
      const words = ann.label.split(' ')
      const labelLines: Scribble['labelLines'] = []
      let cur = ''
      let ly = cy - 28
      for (const w of words) {
        if ((cur + ' ' + w).trim().length > 18) { labelLines.push({ x: 56, y: ly, text: cur.trim() }); ly += 20; cur = w } else cur += ' ' + w
      }
      if (cur.trim()) labelLines.push({ x: 56, y: ly, text: cur.trim() })
      scribbles.push({
        ellipse: { cx, cy, rx: (x2 - x1) / 2 + 4, ry: (y2 - y1) / 2 + 8 },
        labelLines,
        arrow: { x1: 190, y1: cy + 34, x2: x1 - 6, y2: cy + 6 },
        color, seed: 31 + ai * 13,
      })
    } else {
      const lx = Math.min(560 + ai * 30, VIEW_W - 420)
      const ly = 128 + ai * 22
      scribbles.push({
        ellipse: { cx, cy, rx: (x2 - x1) / 2 + 16, ry: LH * 0.62 * Math.max(1, (y2 - y1) / LH) },
        labelLines: [{ x: lx, y: ly, text: ann.label }],
        arrow: { x1: lx + 8, y1: ly + 12, x2: x2 + 28, y2: cy - 6 },
        color, seed: 11 + ai * 13,
      })
    }
  })

  const lastIndexY = indexLines.length > 0 ? indexLines[indexLines.length - 1].y : bodyEnd
  return { runs, chips, indexLines, scribbles, height: lastIndexY + 56 }
}

/* ---------- hover model (pure) ---------- */

export type BracketHover =
  | { kind: 'path'; path: string }
  | { kind: 'dim'; dim: number }
  | null

export function runOpacity(run: BracketRun, hover: BracketHover): number {
  if (!hover) return 1
  if (hover.kind === 'dim') {
    if (run.role === 'bracket') return run.dim === hover.dim ? 1 : 0.15
    if (run.role === 'index' || run.role === 'title') return 0.9
    return 0.35
  }
  if (run.role === 'index' || run.role === 'title') return 0.9
  if (run.role === 'margin') return 0.35
  if (run.role === 'bracket') return matchPath(run.path ?? '', hover.path) ? 1 : 0.18
  if (run.role === 'letter') return run.path === hover.path ? 1 : 0.18
  return 0.35
}

/* ---------- component ---------- */

export function BracketDiagram(props: BracketDiagramProps) {
  const [layout] = useState(() => layoutBracket(props))
  const [hover, setHover] = useState<BracketHover>(null)
  const [arrowFrom, setArrowFrom] = useState<{ x: number; y: number } | null>(null)
  const palette = props.palette ?? CATEGORICAL
  const D = props.levels.length
  const rowDim = Math.max(1, D - 2) - 1

  const hoveredLetter = hover?.kind === 'path'
    ? layout.runs.find((r) => r.role === 'letter' && r.path === hover.path)
    : undefined

  const readout = ((): ReactNode => {
    if (!hover) return 'hover a value, a shape chip, or an indexing line'
    if (hover.kind === 'dim') {
      const l = props.levels[hover.dim]
      return <><span style={{ color: (props.dimColors ?? DIM_COLORS)[hover.dim % 4] }}>●</span> dim {hover.dim} — {l.name}</>
    }
    const idx = hover.path.split('.').map(Number)
    const parts = idx.slice(0, Math.max(1, idx.length - 1)).map((v, d) =>
      props.levels[d]?.indexLabels?.[v] ?? `${props.levels[d]?.name} ${v}`)
    return (
      <>
        <span style={{ color: palette[idx[rowDim] % palette.length] }}>●</span>{' '}
        {props.name}[{idx.join(', ')}] = {hoveredLetter?.text} · {parts.join(' · ')}
      </>
    )
  })()

  return (
    <div className="strides-bracket-diagram">
      <svg viewBox={`0 0 ${VIEW_W} ${layout.height}`} role="img" aria-label={`Bracket diagram of ${props.name}`}>
        {/* washes */}
        {layout.chips.map((c, i) => (
          <rect key={i} x={c.x} y={c.y} width={c.w} height={c.h} rx={6} fill={tint(c.color, 0.16)} stroke={c.color} strokeWidth={0.8} />
        ))}
        {hoveredLetter && (
          <rect
            x={hoveredLetter.x - 4} y={hoveredLetter.y - FS * 0.85}
            width={hoveredLetter.text.length * CW + 8} height={FS * 1.15} rx={5}
            fill={tint(palette[(hoveredLetter.leafIdx?.[rowDim] ?? 0) % palette.length], 0.28)}
          />
        )}
        {/* text runs */}
        {layout.runs.map((r, i) => (
          <text
            key={i} x={r.x} y={r.y} fontSize={r.fs} fill={r.fill}
            fontWeight={r.weight} fontStyle={r.italic ? 'italic' : undefined}
            className="strides-bracket-text" opacity={runOpacity(r, hover)}
          >
            {r.text}
          </text>
        ))}
        {/* scribbles */}
        {layout.scribbles.map((s, i) => (
          <g key={i} className="strides-bracket-scribble">
            {roughEllipsePaths(s.ellipse.cx, s.ellipse.cy, s.ellipse.rx, s.ellipse.ry, s.seed).map((d, p) => (
              <path key={p} d={d} fill="none" stroke={s.color} strokeWidth={p === 0 ? 1.8 : 1.1} opacity={p === 0 ? 0.85 : 0.4} strokeLinecap="round" />
            ))}
            {s.labelLines.map((l, k) => (
              <text key={k} x={l.x} y={l.y} fontSize={14} fontStyle="italic" fill={MUTED} className="strides-bracket-note">{l.text}</text>
            ))}
            {(() => {
              const a = roughArrowPaths(s.arrow.x1, s.arrow.y1, s.arrow.x2, s.arrow.y2, s.seed + 3)
              return (
                <>
                  <path d={a.curve} fill="none" stroke={s.color} strokeWidth={1.7} strokeLinecap="round" />
                  <path d={a.head} fill="none" stroke={s.color} strokeWidth={1.7} strokeLinecap="round" />
                </>
              )
            })()}
          </g>
        ))}
        {/* index-tracing arrow */}
        {arrowFrom && hoveredLetter && (() => {
          const a = roughArrowPaths(arrowFrom.x, arrowFrom.y, hoveredLetter.x + CW / 2 + 8, hoveredLetter.y + 6, 57)
          return (
            <g data-strides-bracket-trace>
              <path d={a.curve} fill="none" stroke={MUTED} strokeWidth={1.7} strokeLinecap="round" />
              <path d={a.head} fill="none" stroke={MUTED} strokeWidth={1.7} strokeLinecap="round" />
            </g>
          )
        })()}
        {/* hit areas */}
        {layout.runs.filter((r) => r.role === 'letter').map((r, i) => (
          <rect
            key={i} x={r.x - 5} y={r.y - FS * 0.9} width={r.text.length * CW + 10} height={FS * 1.3} fill="transparent"
            data-strides-bracket-letter={r.path}
            onPointerEnter={() => { setArrowFrom(null); setHover({ kind: 'path', path: r.path! }) }}
            onPointerLeave={() => setHover(null)}
          />
        ))}
        {layout.chips.slice(0, D).map((c, d) => (
          <rect
            key={d} x={c.x - 2} y={c.y - 2} width={c.w + 4} height={c.h + 4} fill="transparent"
            data-strides-bracket-dim={d}
            onPointerEnter={() => { setArrowFrom(null); setHover({ kind: 'dim', dim: d }) }}
            onPointerLeave={() => setHover(null)}
          />
        ))}
        {layout.indexLines.map((l, i) => (
          <rect
            key={i} x={HX - 6} y={l.y - 20} width={560} height={34} fill="transparent"
            data-strides-bracket-index={l.idx.join('.')}
            onPointerEnter={() => { setArrowFrom({ x: l.endX + 6, y: l.y - 8 }); setHover({ kind: 'path', path: l.idx.join('.') }) }}
            onPointerLeave={() => { setArrowFrom(null); setHover(null) }}
          />
        ))}
      </svg>
      <div className="strides-bracket-readout">{readout}</div>
    </div>
  )
}
