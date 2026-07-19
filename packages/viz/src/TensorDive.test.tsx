// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { TensorDive, buildDiveTree, drillTargetPath, fitCamera, zoomLadder, type DiveTree } from './TensorDive'

const LETTERS = 'abcdefghijkl'
/* queries (2, 6, 2, 1) — same example as the POCs */
const values: DiveTree = Array.from({ length: 2 }, () =>
  Array.from({ length: 6 }, (_, t) =>
    Array.from({ length: 2 }, (_, h) => [LETTERS[t * 2 + h]])))

const levels = [
  { name: 'batch' },
  { name: 'tokens', indexLabels: ['Your', '␣journey', '␣starts', '␣with', '␣one', '␣step'] },
  { name: 'heads' },
  { name: 'head_dim' },
]

afterEach(() => {
  cleanup()
})

describe('TensorDive layout (pure)', () => {
  const root = buildDiveTree(values, 4)

  it('builds the full nested tree: 2 batches × 6 tokens × 2 heads × 1 value', () => {
    const count = (n: ReturnType<typeof buildDiveTree>): number => 1 + n.children.reduce((a, c) => a + count(c), 0)
    expect(count(root)).toBe(1 + 2 + 12 + 24 + 24)
  })

  it('keeps every child geometrically inside its parent', () => {
    let violations = 0
    const walk = (n: ReturnType<typeof buildDiveTree>) => {
      for (const c of n.children) {
        if (c.x < n.x || c.y < n.y || c.x + c.w > n.x + n.w + 0.01 || c.y + c.h > n.y + n.h + 0.01) violations++
        walk(c)
      }
    }
    walk(root)
    expect(violations).toBe(0)
  })

  it('produces a strictly increasing zoom ladder so every dive level magnifies', () => {
    const ladder = zoomLadder(root, 4)
    expect(ladder).toHaveLength(5)
    for (let i = 1; i < ladder.length; i++) expect(ladder[i]).toBeGreaterThan(ladder[i - 1])
  })

  it('fits the camera to a node center', () => {
    const batch0 = root.children[0]
    const cam = fitCamera(batch0)
    expect(cam.cx).toBeCloseTo(batch0.x + batch0.w / 2)
    expect(cam.z).toBeGreaterThan(1)
  })
})

describe('drillTargetPath', () => {
  it('dives one level toward a deep click', () => {
    expect(drillTargetPath([0, 1, 0, 0], [])).toEqual([0])
    expect(drillTargetPath([0, 1, 0, 0], [0])).toEqual([0, 1])
    expect(drillTargetPath([0, 1, 0, 0], [0, 1, 0])).toEqual([0, 1, 0, 0])
  })

  it('rises one level when clicking the focus itself or outside it', () => {
    expect(drillTargetPath([0], [0])).toEqual([])
    expect(drillTargetPath([0], [0, 1])).toEqual([0])
    expect(drillTargetPath([1, 2], [0, 1])).toEqual([0])
  })
})

describe('TensorDive component', () => {
  it('renders the shape bar with the first dimension pending', () => {
    const { container } = render(<TensorDive name="queries" levels={levels} values={values} />)
    const bar = container.querySelector('[data-strides-dive-shapebar]')!
    expect(bar.textContent).toContain('queries[·, ·, ·, ·]')
    expect(bar.textContent).toContain('batch ← choose')
  })

  it('clicking a batch dives: breadcrumb and shape bar update', () => {
    const { container } = render(<TensorDive name="queries" levels={levels} values={values} />)
    fireEvent.click(container.querySelector('[data-strides-dive-node="0"]')!)
    const bar = container.querySelector('[data-strides-dive-shapebar]')!
    expect(bar.textContent).toContain('queries[0, ·, ·, ·]')
    expect(bar.textContent).toContain('tokens ← choose')
    const crumbs = container.querySelector('.strides-dive-crumbs')!
    expect(crumbs.textContent).toContain('batch 0')
  })

  it('clicking a deep leaf from the root only dives one level', () => {
    const { container } = render(<TensorDive name="queries" levels={levels} values={values} />)
    fireEvent.click(container.querySelector('[data-strides-dive-leaf="0.1.0.0"]')!)
    const bar = container.querySelector('[data-strides-dive-shapebar]')!
    expect(bar.textContent).toContain('queries[0, ·, ·, ·]')
  })

  it('uses token index labels in the breadcrumb and Escape rises', () => {
    const { container } = render(<TensorDive name="queries" levels={levels} values={values} />)
    fireEvent.click(container.querySelector('[data-strides-dive-node="0"]')!)
    fireEvent.click(container.querySelector('[data-strides-dive-node="0.1"]')!)
    expect(container.querySelector('.strides-dive-crumbs')!.textContent).toContain('␣journey')
    fireEvent.keyDown(container.querySelector('.strides-tensor-dive')!, { key: 'Escape' })
    const bar = container.querySelector('[data-strides-dive-shapebar]')!
    expect(bar.textContent).toContain('queries[0, ·, ·, ·]')
  })
})
