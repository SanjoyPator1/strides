// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { HeadSplitViz } from './HeadSplitViz'

const values = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
]

afterEach(() => {
  cleanup()
})

describe('HeadSplitViz', () => {
  it('shows an error instead of crashing when d_out does not divide evenly by numHeads', () => {
    render(<HeadSplitViz values={values} numHeads={3} />)
    expect(screen.getByText(/doesn't split evenly/)).toBeTruthy()
  })

  it('labels each head-column-group on the first (projected) step', () => {
    const { container } = render(<HeadSplitViz values={values} numHeads={2} />)
    const labels = Array.from(container.querySelectorAll('.strides-matrix-group-label')).map((el) => el.textContent)
    expect(labels).toEqual(['Head 0', 'Head 1'])
  })

  it('splits into head_dim-wide slices with the correct sub-matrix per head', () => {
    render(<HeadSplitViz values={values} numHeads={2} />)
    fireEvent.click(screen.getByLabelText('Next step'))

    // Head 0 = columns [0,1], Head 1 = columns [2,3]
    expect(screen.getByText('Head 0')).toBeTruthy()
    expect(screen.getByText('Head 1')).toBeTruthy()
    // Spot-check a couple of values landed in the right slice (row 0: [1,2] | [3,4]).
    expect(screen.getByText('1.00')).toBeTruthy()
    expect(screen.getByText('4.00')).toBeTruthy()
  })
})
