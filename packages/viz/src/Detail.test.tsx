// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { Detail, DetailRail, DetailRailProvider } from './Detail'
import { ArrowOverlay } from './Arrow'

afterEach(() => {
  cleanup()
})

describe('Detail', () => {
  it('renders the summary and stays collapsed by default', () => {
    render(
      <Detail summary="Feed forward">
        <span>Linear -&gt; GELU -&gt; Linear</span>
      </Detail>,
    )
    expect(screen.getByText('Feed forward')).toBeTruthy()
    expect(screen.queryByText('Linear -> GELU -> Linear')).toBeNull()
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false')
  })

  it('reveals the detail content when the trigger is clicked', () => {
    render(
      <Detail summary="Feed forward">
        <span>Linear -&gt; GELU -&gt; Linear</span>
      </Detail>,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Linear -> GELU -> Linear')).toBeTruthy()
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('true')
  })

  it('marks the trigger collapsed again on a second click', () => {
    render(
      <Detail summary="Feed forward">
        <span>detail content</span>
      </Detail>,
    )
    const button = screen.getByRole('button')
    fireEvent.click(button)
    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })

  it('portals the expanded panel into a DetailRail placed elsewhere in the tree', () => {
    const { container } = render(
      <DetailRailProvider>
        <Detail summary="Feed forward">
          <span>detail content</span>
        </Detail>
        <DetailRail />
      </DetailRailProvider>,
    )
    fireEvent.click(screen.getByRole('button'))
    const rail = container.querySelector('.strides-detail-rail') as HTMLElement
    expect(within(rail).getByText('detail content')).toBeTruthy()
  })

  it('falls back to expanding inline when no DetailRail is present', () => {
    const { container } = render(
      <Detail summary="Feed forward">
        <span>detail content</span>
      </Detail>,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(container.querySelector('.strides-detail-rail')).toBeNull()
    expect(screen.getByText('detail content')).toBeTruthy()
  })

  it('draws a connecting arrow from the trigger to the panel once expanded', () => {
    const { container } = render(
      <ArrowOverlay>
        <Detail summary="Feed forward">
          <span>detail content</span>
        </Detail>
      </ArrowOverlay>,
    )
    expect(container.querySelectorAll('.strides-arrow-path').length).toBe(0)
    fireEvent.click(screen.getByRole('button'))
    expect(container.querySelectorAll('.strides-arrow-path').length).toBe(1)
  })
})
