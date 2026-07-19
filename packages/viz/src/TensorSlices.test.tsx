// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TensorSlices } from './TensorSlices'

const slices = [
  { label: 'Head 0', values: [[1, 2]], color: '#2563eb' },
  { label: 'Head 1', values: [[3, 4]], color: '#dc2626' },
]

const threeSlices = [
  { label: 'Head 0', values: [[1, 2]], color: '#2563eb' },
  { label: 'Head 1', values: [[3, 4]], color: '#dc2626' },
  { label: 'Head 2', values: [[5, 6]], color: '#16a34a' },
]

afterEach(() => {
  cleanup()
})

describe('TensorSlices', () => {
  it('renders one Matrix per slice, each labeled', () => {
    const { container } = render(<TensorSlices slices={slices} />)
    expect(container.querySelectorAll('.strides-tensor-slice').length).toBe(2)
    expect(screen.getByText('Head 0')).toBeTruthy()
    expect(screen.getByText('Head 1')).toBeTruthy()
  })

  it('is not focusable/clickable by default', () => {
    const { container } = render(<TensorSlices slices={slices} />)
    const first = container.querySelectorAll('.strides-tensor-slice')[0]
    fireEvent.click(first)
    expect(first.classList.contains('strides-tensor-slice--focused')).toBe(false)
  })

  it('focuses a slice on click and dims the rest when focusable', () => {
    const { container } = render(<TensorSlices slices={slices} focusable />)
    const [first, second] = Array.from(container.querySelectorAll('.strides-tensor-slice'))

    fireEvent.click(first)
    expect(first.classList.contains('strides-tensor-slice--focused')).toBe(true)
    expect(second.classList.contains('strides-tensor-slice--dimmed')).toBe(true)

    // clicking the focused slice again releases it
    fireEvent.click(first)
    expect(first.classList.contains('strides-tensor-slice--focused')).toBe(false)
    expect(second.classList.contains('strides-tensor-slice--dimmed')).toBe(false)
  })

  it('switching focus to a different slice un-dims the previous one', () => {
    const { container } = render(<TensorSlices slices={slices} focusable />)
    const [first, second] = Array.from(container.querySelectorAll('.strides-tensor-slice'))

    fireEvent.click(first)
    fireEvent.click(second)

    expect(first.classList.contains('strides-tensor-slice--dimmed')).toBe(true)
    expect(second.classList.contains('strides-tensor-slice--focused')).toBe(true)
  })

  it('applies stack layout with increasing offsets per slice', () => {
    const { container } = render(<TensorSlices slices={slices} layout="stack" />)
    const items = Array.from(container.querySelectorAll('.strides-tensor-slice')) as HTMLElement[]
    expect(items[0].style.top).toBe('0px')
    expect(items[1].style.top).toBe('14px')
  })

  it('gives the stack container an explicit size that fits every slice plus the offset spread (not padding, which does not reserve space for absolutely-positioned children)', () => {
    const { container } = render(<TensorSlices slices={slices} layout="stack" />)
    const root = container.querySelector('.strides-tensor-slices') as HTMLElement
    // Each slice here is a 1x2 Matrix at the default 44px cell size: width 88, height 44,
    // plus the slice's own chrome (label/padding/border), plus the (2-1)*14px stack spread.
    expect(root.style.position).toBe('relative')
    expect(parseInt(root.style.width, 10)).toBeGreaterThan(88)
    expect(parseInt(root.style.height, 10)).toBeGreaterThan(44)
  })

  it('row layout does not reserve stack space (no explicit width/height)', () => {
    const { container } = render(<TensorSlices slices={slices} layout="row" />)
    const root = container.querySelector('.strides-tensor-slices') as HTMLElement
    expect(root.style.width).toBe('')
    expect(root.style.height).toBe('')
  })

  it('brings a focused card in front of every other card, even ones stacked above it in z-order', () => {
    // Regression test: z-index must be computed inline (not left to a CSS class), since inline
    // styles always beat stylesheet rules — a CSS-only "focused { z-index: N }" rule can never
    // actually win against the inline `zIndex: index` used for the deck's default stacking order.
    const { container } = render(<TensorSlices slices={threeSlices} layout="stack" focusable />)
    const items = Array.from(container.querySelectorAll('.strides-tensor-slice')) as HTMLElement[]

    // Default stacking: z-index increases with array position (later cards on top).
    expect(Number(items[0].style.zIndex)).toBeLessThan(Number(items[1].style.zIndex))
    expect(Number(items[1].style.zIndex)).toBeLessThan(Number(items[2].style.zIndex))

    // Focusing the *back* card (index 0, normally buried under 1 and 2) must raise it above both.
    fireEvent.click(items[0])
    const zIndexes = items.map((el) => Number(el.style.zIndex))
    expect(zIndexes[0]).toBeGreaterThan(zIndexes[1])
    expect(zIndexes[0]).toBeGreaterThan(zIndexes[2])
  })
})
