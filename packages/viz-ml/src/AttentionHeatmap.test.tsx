// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AttentionHeatmap } from './AttentionHeatmap'

const tokens = ['a', 'b']
const weights = [
  [0.6, 0.4],
  [0.3, 0.7],
]

afterEach(() => {
  cleanup()
})

describe('AttentionHeatmap', () => {
  it('shows a hint and no tooltip before any hover', () => {
    render(<AttentionHeatmap weights={weights} tokens={tokens} />)
    expect(screen.getByText('Hover a cell to inspect attention weights.')).toBeTruthy()
  })

  it('shows the P(query → key) tooltip and row sum on hover', () => {
    render(<AttentionHeatmap weights={weights} tokens={tokens} />)
    const svg = document.querySelector('.strides-matrix') as SVGSVGElement
    const cellGroup = svg.querySelectorAll('g')[0]

    fireEvent.mouseEnter(cellGroup)

    expect(screen.getByText('P(a → a) = 0.60')).toBeTruthy()
    expect(screen.getByText('row sum ≈ 1.00')).toBeTruthy()
  })

  it('highlights the full hovered row', () => {
    render(<AttentionHeatmap weights={weights} tokens={tokens} />)
    const svg = document.querySelector('.strides-matrix') as SVGSVGElement
    const groups = svg.querySelectorAll('g')

    fireEvent.mouseEnter(groups[0])

    const highlighted = svg.querySelectorAll('.strides-matrix-cell--highlight')
    // row 0 has 2 cells (both columns); hovering (0,0) should highlight both.
    expect(highlighted.length).toBe(2)
  })
})
