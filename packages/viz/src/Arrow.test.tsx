// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { ArrowOverlay, Anchor, Arrow } from './Arrow'

afterEach(() => {
  cleanup()
})

describe('ArrowOverlay / Anchor / Arrow', () => {
  it('renders a connecting path once both anchors have mounted', () => {
    const { container } = render(
      <ArrowOverlay>
        <Anchor name="a">A</Anchor>
        <Anchor name="b">B</Anchor>
        <Arrow from="a" to="b" label="to b" />
      </ArrowOverlay>,
    )

    const path = container.querySelector('.strides-arrow-path')
    expect(path).toBeTruthy()
    expect(path?.getAttribute('d')).toMatch(/^M /)
  })

  it('renders no path when an anchor name does not exist', () => {
    const { container } = render(
      <ArrowOverlay>
        <Anchor name="a">A</Anchor>
        <Arrow from="a" to="missing" />
      </ArrowOverlay>,
    )

    expect(container.querySelector('.strides-arrow-path')).toBeNull()
  })

  it('gives each ArrowOverlay instance its own unique marker id', () => {
    const { container } = render(
      <>
        <ArrowOverlay>
          <Anchor name="a">A</Anchor>
          <Anchor name="b">B</Anchor>
          <Arrow from="a" to="b" />
        </ArrowOverlay>
        <ArrowOverlay>
          <Anchor name="a">A</Anchor>
          <Anchor name="b">B</Anchor>
          <Arrow from="a" to="b" />
        </ArrowOverlay>
      </>,
    )

    const markerIds = Array.from(container.querySelectorAll('marker')).map((m) => m.id)
    expect(new Set(markerIds).size).toBe(markerIds.length)
    expect(markerIds.length).toBe(2)
  })

  it('separates Arrow children (SVG layer) from regular content (normal flow)', () => {
    const { container } = render(
      <ArrowOverlay>
        <Anchor name="a">A</Anchor>
        <Anchor name="b">B</Anchor>
        <Arrow from="a" to="b" />
      </ArrowOverlay>,
    )

    const svg = container.querySelector('.strides-arrow-svg')
    expect(svg?.querySelector('.strides-arrow-path')).toBeTruthy()
    expect(container.querySelector('.strides-arrow-overlay > .strides-anchor')).toBeTruthy()
  })

  it('defaults to a curved (quadratic) path', () => {
    const { container } = render(
      <ArrowOverlay>
        <Anchor name="a">A</Anchor>
        <Anchor name="b">B</Anchor>
        <Arrow from="a" to="b" />
      </ArrowOverlay>,
    )
    expect(container.querySelector('.strides-arrow-path')?.getAttribute('d')).toContain('Q')
  })

  it('path="straight" produces a single line segment, no curve', () => {
    const { container } = render(
      <ArrowOverlay>
        <Anchor name="a">A</Anchor>
        <Anchor name="b">B</Anchor>
        <Arrow from="a" to="b" path="straight" />
      </ArrowOverlay>,
    )
    const d = container.querySelector('.strides-arrow-path')?.getAttribute('d') ?? ''
    expect(d).not.toContain('Q')
    expect(d.match(/L/g)?.length).toBe(1)
  })

  it('path="elbow" produces a dogleg via a clear gutter (two right-angle bends)', () => {
    const { container } = render(
      <ArrowOverlay>
        <Anchor name="a">A</Anchor>
        <Anchor name="b">B</Anchor>
        <Arrow from="a" to="b" path="elbow" fromSide="right" toSide="right" />
      </ArrowOverlay>,
    )
    const d = container.querySelector('.strides-arrow-path')?.getAttribute('d') ?? ''
    expect(d).not.toContain('Q')
    expect(d.match(/L/g)?.length).toBe(3)
  })

  it('routes an elbow path around a wider anchor sitting between the endpoints, not through it', () => {
    const rectFor: Record<string, { top: number; left: number; width: number; height: number }> = {
      a: { top: 0, left: 0, width: 40, height: 20 },
      obstacle: { top: 40, left: 0, width: 300, height: 20 },
      b: { top: 80, left: 0, width: 40, height: 20 },
    }
    const spy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const name = this.getAttribute('data-anchor')
      const rect = name ? rectFor[name] : undefined
      const left = rect?.left ?? 0
      const top = rect?.top ?? 0
      const width = rect?.width ?? 0
      const height = rect?.height ?? 0
      return {
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        x: left,
        y: top,
        toJSON: () => {},
      } as DOMRect
    })

    const { container } = render(
      <ArrowOverlay>
        <Anchor name="a">A</Anchor>
        <Anchor name="obstacle">Obstacle</Anchor>
        <Anchor name="b">B</Anchor>
        <Arrow from="a" to="b" path="elbow" fromSide="right" toSide="right" />
      </ArrowOverlay>,
    )

    const d = container.querySelector('.strides-arrow-path')?.getAttribute('d') ?? ''
    // "M x0 y0 L x1 y1 L x2 y2 L x3 y3" -> x-coordinates are tokens 0, 2, 4, 6
    const numbers = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []
    const xs = [numbers[0], numbers[2], numbers[4], numbers[6]]
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(300)

    spy.mockRestore()
  })

  it('dashed adds a stroke-dasharray to the path style', () => {
    const { container } = render(
      <ArrowOverlay>
        <Anchor name="a">A</Anchor>
        <Anchor name="b">B</Anchor>
        <Arrow from="a" to="b" dashed />
      </ArrowOverlay>,
    )
    const path = container.querySelector('.strides-arrow-path') as SVGPathElement
    expect(path.style.strokeDasharray).toBe('6 4')
  })

  it('is not dashed by default', () => {
    const { container } = render(
      <ArrowOverlay>
        <Anchor name="a">A</Anchor>
        <Anchor name="b">B</Anchor>
        <Arrow from="a" to="b" />
      </ArrowOverlay>,
    )
    const path = container.querySelector('.strides-arrow-path') as SVGPathElement
    expect(path.style.strokeDasharray).toBe('')
  })
})
