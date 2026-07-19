// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Flow } from './Flow'
import { Node } from './Node'

afterEach(() => {
  cleanup()
})

describe('Flow', () => {
  it('renders every child, in order', () => {
    render(
      <Flow>
        <Node>A</Node>
        <Node>B</Node>
        <Node>C</Node>
      </Flow>,
    )
    expect(screen.getByText('A')).toBeTruthy()
    expect(screen.getByText('B')).toBeTruthy()
    expect(screen.getByText('C')).toBeTruthy()
  })

  it('auto-connects consecutive items with one arrow per gap (N items -> N-1 arrows)', () => {
    const { container } = render(
      <Flow>
        <Node>A</Node>
        <Node>B</Node>
        <Node>C</Node>
      </Flow>,
    )
    expect(container.querySelectorAll('.strides-arrow-path').length).toBe(2)
  })

  it('does not draw an arrow for a single item', () => {
    const { container } = render(
      <Flow>
        <Node>A</Node>
      </Flow>,
    )
    expect(container.querySelectorAll('.strides-arrow-path').length).toBe(0)
  })

  it('adds extraArrows on top of the automatic consecutive connectors', () => {
    const { container } = render(
      <Flow extraArrows={[{ from: 0, to: 2, label: 'skip connection' }]}>
        <Node>A</Node>
        <Node>B</Node>
        <Node>C</Node>
      </Flow>,
    )
    // 2 automatic (A->B, B->C) + 1 extra (A->C) = 3
    expect(container.querySelectorAll('.strides-arrow-path').length).toBe(3)
    expect(screen.getByText('skip connection')).toBeTruthy()
  })

  it('lays out vertically by default and horizontally when direction="horizontal"', () => {
    const { container: vertical } = render(
      <Flow>
        <Node>A</Node>
        <Node>B</Node>
      </Flow>,
    )
    expect((vertical.querySelector('.strides-flow') as HTMLElement).style.flexDirection).toBe('column')

    const { container: horizontal } = render(
      <Flow direction="horizontal">
        <Node>A</Node>
        <Node>B</Node>
      </Flow>,
    )
    expect((horizontal.querySelector('.strides-flow') as HTMLElement).style.flexDirection).toBe('row')
  })

  it('shows arrowLabels on the automatic connectors when given', () => {
    render(
      <Flow arrowLabels={['step 1', 'step 2']}>
        <Node>A</Node>
        <Node>B</Node>
        <Node>C</Node>
      </Flow>,
    )
    expect(screen.getByText('step 1')).toBeTruthy()
    expect(screen.getByText('step 2')).toBeTruthy()
  })
})
