// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Node } from './Node'
import { ArrowOverlay } from './Arrow'

afterEach(() => {
  cleanup()
})

describe('Node', () => {
  it('renders its label and defaults to the rect shape', () => {
    const { container } = render(<Node>Linear</Node>)
    expect(screen.getByText('Linear')).toBeTruthy()
    expect(container.querySelector('.strides-node--rect')).toBeTruthy()
  })

  it.each(['rect', 'pill', 'hexagon', 'trapezoid', 'circle'] as const)('renders the %s shape variant', (shape) => {
    const { container } = render(<Node shape={shape}>x</Node>)
    expect(container.querySelector(`.strides-node--${shape}`)).toBeTruthy()
  })

  it('applies color/textColor as inline styles', () => {
    const { container } = render(
      <Node color="#2563eb" textColor="#ffffff">
        Linear
      </Node>,
    )
    const el = container.querySelector('.strides-node') as HTMLElement
    expect(el.style.background).toBe('rgb(37, 99, 235)')
    expect(el.style.color).toBe('rgb(255, 255, 255)')
  })

  it('registers as an arrow anchor when given an `anchor` name, inside an ArrowOverlay', () => {
    const { container } = render(
      <ArrowOverlay>
        <Node anchor="linear">Linear</Node>
      </ArrowOverlay>,
    )
    expect(container.querySelector('[data-anchor="linear"]')).toBeTruthy()
  })

  it('does not set a data-anchor attribute when no anchor name is given', () => {
    const { container } = render(<Node>Linear</Node>)
    expect(container.querySelector('.strides-node')?.hasAttribute('data-anchor')).toBe(false)
  })
})
