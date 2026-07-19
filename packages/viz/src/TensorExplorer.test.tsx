// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TensorExplorer } from './TensorExplorer'

// (batch=2, token=3, head=2, head_dim=2) — small but genuinely 4D.
const values = [
  [
    [
      [1, 2],
      [3, 4],
    ],
    [
      [5, 6],
      [7, 8],
    ],
    [
      [9, 10],
      [11, 12],
    ],
  ],
  [
    [
      [13, 14],
      [15, 16],
    ],
    [
      [17, 18],
      [19, 20],
    ],
    [
      [21, 22],
      [23, 24],
    ],
  ],
]

const axisLabels = ['Batch', 'Token', 'Head']
const axisIndexLabels = [undefined, ['The', 'cat', 'sat'], ['Head 0', 'Head 1']]

afterEach(() => {
  cleanup()
})

describe('TensorExplorer', () => {
  it('auto-expands index 0 at every level, showing one full path to real numbers', () => {
    render(<TensorExplorer axisLabels={axisLabels} axisIndexLabels={axisIndexLabels} values={values} />)
    // Batch 0 -> The -> Head 0 -> [1, 2] should all be visible without clicking anything.
    expect(screen.getByText('The')).toBeTruthy()
    expect(screen.getByText('Head 0')).toBeTruthy()
    expect(screen.getByText('1.00')).toBeTruthy()
    expect(screen.getByText('2.00')).toBeTruthy()
  })

  it('does not show sibling groups contents until expanded', () => {
    render(<TensorExplorer axisLabels={axisLabels} axisIndexLabels={axisIndexLabels} values={values} />)
    expect(screen.getByText('cat')).toBeTruthy() // the sibling label itself is visible
    expect(screen.queryByText('5.00')).toBeNull() // but not its (collapsed) contents
  })

  it('expands a sibling on click without collapsing the first path', () => {
    render(<TensorExplorer axisLabels={axisLabels} axisIndexLabels={axisIndexLabels} values={values} />)
    fireEvent.click(screen.getByText('cat'))
    expect(screen.getByText('5.00')).toBeTruthy() // cat -> Head 0 -> [5, 6]
    expect(screen.getByText('1.00')).toBeTruthy() // The's path is still expanded too
  })

  it('collapses a path on a second click', () => {
    render(<TensorExplorer axisLabels={axisLabels} axisIndexLabels={axisIndexLabels} values={values} />)
    expect(screen.getByText('1.00')).toBeTruthy()
    fireEvent.click(screen.getByText('The'))
    expect(screen.queryByText('1.00')).toBeNull()
  })

  it('falls back to "{axisLabel} {index}" when no index labels are given for that axis', () => {
    render(<TensorExplorer axisLabels={['Batch', 'Token', 'Head']} values={values} />)
    expect(screen.getByText('Batch 0')).toBeTruthy()
    expect(screen.getByText('Token 0')).toBeTruthy()
    expect(screen.getByText('Head 0')).toBeTruthy()
  })

  it('renders the leaf axis as a Matrix row of real numbers', () => {
    const { container } = render(<TensorExplorer axisLabels={axisLabels} axisIndexLabels={axisIndexLabels} values={values} />)
    expect(container.querySelector('.strides-matrix')).toBeTruthy()
  })
})
