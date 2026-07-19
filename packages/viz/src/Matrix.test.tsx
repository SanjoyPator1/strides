// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { Matrix } from './Matrix'
import { ArrowOverlay } from './Arrow'

afterEach(() => {
  cleanup()
})

describe('Matrix', () => {
  it('renders a group bracket + label for a column range', () => {
    const { container } = render(
      <Matrix
        values={[
          [1, 2, 3],
          [4, 5, 6],
        ]}
        groups={[{ label: 'Head 0', axis: 'col', start: 0, end: 1, color: '#2563eb' }]}
      />,
    )

    const label = container.querySelector('.strides-matrix-group-label')
    expect(label?.textContent).toBe('Head 0')
    expect(container.querySelector('.strides-matrix-group')).toBeTruthy()
  })

  it('renders cellLabels instead of numeric values when given', () => {
    const { container } = render(
      <Matrix
        values={[
          [1, 2],
          [3, 4],
        ]}
        cellLabels={[
          ['a', 'b'],
          ['c', 'd'],
        ]}
      />,
    )

    const texts = Array.from(container.querySelectorAll('.strides-matrix-value')).map((el) => el.textContent)
    expect(texts).toEqual(['a', 'b', 'c', 'd'])
  })

  it('falls back to the numeric value (fixed to precision) when no cellLabels given', () => {
    const { container } = render(<Matrix values={[[1, 2.5]]} precision={1} />)
    const texts = Array.from(container.querySelectorAll('.strides-matrix-value')).map((el) => el.textContent)
    expect(texts).toEqual(['1.0', '2.5'])
  })

  it('uses getLayoutId to override the default id-based layoutId scheme', () => {
    // Indirect check: rendering shouldn't throw, and cells should still render normally.
    const { container } = render(<Matrix values={[[1, 2]]} id="m" getLayoutId={(r, c) => `custom-${r}-${c}`} />)
    expect(container.querySelectorAll('.strides-matrix-cell').length).toBe(2)
  })

  it('registers each cell as an anchor named `${anchorPrefix}-{row}-{col}` inside an ArrowOverlay', () => {
    const { container } = render(
      <ArrowOverlay>
        <Matrix
          values={[
            [1, 2],
            [3, 4],
          ]}
          anchorPrefix="scores"
        />
      </ArrowOverlay>,
    )

    const anchors = Array.from(container.querySelectorAll('[data-anchor]')).map((el) => el.getAttribute('data-anchor'))
    expect(anchors.sort()).toEqual(['scores-0-0', 'scores-0-1', 'scores-1-0', 'scores-1-1'])
  })
})
