// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { BracketDiagram, layoutBracket, matchPath, runOpacity, type BracketAnnotation } from './BracketDiagram'
import type { DiveTree, TensorDiveLevel } from './TensorDive'

const LETTERS = 'abcdefghijkl'
/* queries (2, 6, 2, 1) — same example as the POCs and TensorDive.test.tsx */
const values: DiveTree = Array.from({ length: 2 }, () =>
  Array.from({ length: 6 }, (_, t) =>
    Array.from({ length: 2 }, (_, h) => [LETTERS[t * 2 + h]])))

const levels: TensorDiveLevel[] = [
  { name: 'batch' },
  { name: 'tokens', indexLabels: ['Your', '␣journey', '␣starts', '␣with', '␣one', '␣step'] },
  { name: 'heads' },
  { name: 'head_dim' },
]

const annotations: BracketAnnotation[] = [
  { target: [0, 0, null, null], label: 'one token = 2 heads × (1 value each)', side: 'above' },
  { target: [0, null, 0, null], label: 'head 0’s slots — .transpose(1, 2) gathers these', side: 'left', color: '#eb6834' },
]

const indexExamples = [
  [0, 0, 0, 0],
  [0, 0, 1, 0],
  [0, 1, 0, 0],
  [0, 1, 1, 0],
]

afterEach(() => {
  cleanup()
})

describe('layoutBracket (pure)', () => {
  const layout = layoutBracket({ name: 'queries', levels, values, annotations, indexExamples })

  it('emits exactly 24 letter runs (2 batches × 6 tokens × 2 heads × 1 value)', () => {
    const letters = layout.runs.filter((r) => r.role === 'letter')
    expect(letters).toHaveLength(24)
    // each of a–l appears exactly twice — once per (identical) batch
    const counts = new Map<string, number>()
    for (const r of letters) counts.set(r.text, (counts.get(r.text) ?? 0) + 1)
    expect([...counts.values()]).toEqual(Array(12).fill(2))
    expect([...counts.keys()].sort().join('')).toBe(LETTERS)
  })

  it('emits exactly 78 bracket runs (2 root + 4 batch + 6 tokens × 2 batches × 6 head/head_dim brackets)', () => {
    const brackets = layout.runs.filter((r) => r.role === 'bracket')
    expect(brackets).toHaveLength(78)
  })

  it('every letter run carries a full 4-part path and matching leafIdx', () => {
    const letters = layout.runs.filter((r) => r.role === 'letter')
    for (const r of letters) {
      expect(r.path?.split('.')).toHaveLength(4)
      expect(r.leafIdx).toHaveLength(4)
      expect(r.path).toBe(r.leafIdx!.join('.'))
    }
  })

  it('aligns every head-0 letter in batch 0 to the same x (required for the lasso annotation)', () => {
    const head0Batch0 = layout.runs.filter((r) => r.role === 'letter' && /^0\.\d\.0\.0$/.test(r.path ?? ''))
    expect(head0Batch0).toHaveLength(6)
    const xs = new Set(head0Batch0.map((r) => r.x))
    expect(xs.size).toBe(1)
  })

  it('aligns the condensed batch 1 rows to the same start x as batch 0 (chunk restart)', () => {
    // token 0 head 0 in batch 0 vs token 3 head 0 in batch 1 — both are the first
    // item on their respective (re-started) line, so must share the same x.
    const a = layout.runs.find((r) => r.path === '0.0.0.0')!
    const g = layout.runs.find((r) => r.path === '1.3.0.0')!
    expect(g.x).toBe(a.x)
  })

  it('has no NaN in any run position', () => {
    expect(layout.runs.some((r) => Number.isNaN(r.x) || Number.isNaN(r.y))).toBe(false)
  })

  it('produces a finite height greater than the body', () => {
    expect(Number.isFinite(layout.height)).toBe(true)
    const bodyRuns = layout.runs.filter((r) => r.role !== 'index' && r.role !== 'title')
    const bodyMaxY = Math.max(...bodyRuns.map((r) => r.y))
    expect(layout.height).toBeGreaterThan(bodyMaxY)
  })

  it('places exactly 4 header shape-chips (before any index-block chips) with no x-overlap', () => {
    const headerChips = layout.chips.slice(0, 4)
    expect(headerChips).toHaveLength(4)
    expect(new Set(headerChips.map((c) => c.y)).size).toBe(1) // all on the header row
    const sorted = [...headerChips].sort((a, b) => a.x - b.x)
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].x).toBeGreaterThanOrEqual(sorted[i - 1].x + sorted[i - 1].w)
    }
  })

  it('produces exactly one scribble per matching annotation', () => {
    expect(layout.scribbles).toHaveLength(2)
  })

  it('is deterministic: identical props produce identical geometry', () => {
    const layout2 = layoutBracket({ name: 'queries', levels, values, annotations, indexExamples })
    expect(layout2.scribbles).toEqual(layout.scribbles)
    expect(layout2.runs.map((r) => [r.x, r.y, r.text])).toEqual(layout.runs.map((r) => [r.x, r.y, r.text]))
  })
})

describe('matchPath', () => {
  it('matches a path against its own prefix, itself, and the empty (root) prefix', () => {
    expect(matchPath('0.1', '0.1.0.0')).toBe(true)
    expect(matchPath('0.1.0.0', '0.1.0.0')).toBe(true)
    expect(matchPath('', '0.1.0.0')).toBe(true)
  })

  it('does not match a sibling prefix', () => {
    expect(matchPath('0.0', '0.1.0.0')).toBe(false)
  })
})

describe('runOpacity', () => {
  const bracketRun = { role: 'bracket', dim: 2, path: '0.1' } as Parameters<typeof runOpacity>[0]
  const indexRun = { role: 'index' } as Parameters<typeof runOpacity>[0]

  it('keeps everything at full opacity with no hover', () => {
    expect(runOpacity(bracketRun, null)).toBe(1)
  })

  it('dims a bracket outside the hovered path, keeps one on it', () => {
    expect(runOpacity({ ...bracketRun, path: '0.1' }, { kind: 'path', path: '0.1.0.0' })).toBe(1)
    expect(runOpacity({ ...bracketRun, path: '0.0' }, { kind: 'path', path: '0.1.0.0' })).toBe(0.18)
  })

  it('keeps index/title runs prominent during a path hover', () => {
    expect(runOpacity(indexRun, { kind: 'path', path: '0.1.0.0' })).toBe(0.9)
  })

  it('isolates one dimension on a dim hover', () => {
    expect(runOpacity(bracketRun, { kind: 'dim', dim: 2 })).toBe(1)
    expect(runOpacity(bracketRun, { kind: 'dim', dim: 0 })).toBe(0.15)
  })
})

describe('BracketDiagram component', () => {
  it('renders without crashing', () => {
    const { container } = render(<BracketDiagram name="queries" levels={levels} values={values} />)
    expect(container.querySelector('.strides-bracket-diagram')).toBeTruthy()
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('shows a default readout hint with nothing hovered', () => {
    const { container } = render(<BracketDiagram name="queries" levels={levels} values={values} />)
    expect(container.querySelector('.strides-bracket-readout')!.textContent).toMatch(/hover/i)
  })

  it('hovering an indexing line traces an arrow and highlights the matching letter path', () => {
    const { container } = render(
      <BracketDiagram name="queries" levels={levels} values={values} indexExamples={indexExamples} />,
    )
    const indexHit = container.querySelector('[data-strides-bracket-index="0.1.0.0"]')!
    fireEvent.pointerEnter(indexHit)
    expect(container.querySelector('[data-strides-bracket-trace]')).toBeTruthy()
    const letterC = container.querySelector('[data-strides-bracket-letter="0.1.0.0"]')!
    // the trace only draws to the hovered letter, so the readout should name it
    expect(container.querySelector('.strides-bracket-readout')!.textContent).toContain('queries[0, 1, 0, 0] = c')
    expect(letterC).toBeTruthy()
    fireEvent.pointerLeave(indexHit)
    expect(container.querySelector('[data-strides-bracket-trace]')).toBeNull()
  })

  it('hovering a dimension chip dims brackets of every other dimension', () => {
    const { container } = render(<BracketDiagram name="queries" levels={levels} values={values} />)
    const dimHit = container.querySelector('[data-strides-bracket-dim="2"]')!
    fireEvent.pointerEnter(dimHit)
    const texts = Array.from(container.querySelectorAll('text.strides-bracket-text'))
    const bracketTexts = texts.filter((t) => t.textContent === '[' || t.textContent === ']')
    const opacities = bracketTexts.map((t) => t.getAttribute('opacity'))
    expect(opacities).toContain('1')
    expect(opacities).toContain('0.15')
    expect(container.querySelector('.strides-bracket-readout')!.textContent).toContain('heads')
    fireEvent.pointerLeave(dimHit)
  })

  it('hovering a letter directly highlights its own bracket path', () => {
    const { container } = render(<BracketDiagram name="queries" levels={levels} values={values} />)
    const letterHit = container.querySelector('[data-strides-bracket-letter="0.1.0.0"]')!
    fireEvent.pointerEnter(letterHit)
    expect(container.querySelector('.strides-bracket-readout')!.textContent).toContain('queries[0, 1, 0, 0] = c')
    fireEvent.pointerLeave(letterHit)
  })

  it('renders one scribble group per matching annotation, each with rough ellipse + arrow strokes', () => {
    const { container } = render(
      <BracketDiagram name="queries" levels={levels} values={values} annotations={annotations} />,
    )
    const groups = container.querySelectorAll('.strides-bracket-scribble')
    expect(groups).toHaveLength(2)
    for (const g of groups) {
      expect(g.querySelectorAll('path')).toHaveLength(4) // 2 ellipse passes + curve + arrowhead
      expect(g.querySelector('text')).toBeTruthy()
    }
  })

  it('renders identical scribble geometry across two independent renders (determinism)', () => {
    const r1 = render(<BracketDiagram name="queries" levels={levels} values={values} annotations={annotations} />)
    const d1 = r1.container.querySelectorAll('.strides-bracket-scribble path')[0].getAttribute('d')
    cleanup()
    const r2 = render(<BracketDiagram name="queries" levels={levels} values={values} annotations={annotations} />)
    const d2 = r2.container.querySelectorAll('.strides-bracket-scribble path')[0].getAttribute('d')
    expect(d1).toBe(d2)
  })
})
