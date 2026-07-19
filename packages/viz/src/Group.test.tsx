// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Group } from './Group'

afterEach(() => {
  cleanup()
})

describe('Group', () => {
  it('renders its children', () => {
    render(
      <Group>
        <span>inside</span>
      </Group>,
    )
    expect(screen.getByText('inside')).toBeTruthy()
  })

  it('renders an optional label', () => {
    render(<Group label="Transformer Block">content</Group>)
    expect(screen.getByText('Transformer Block')).toBeTruthy()
  })

  it('omits the label element when none is given', () => {
    const { container } = render(<Group>content</Group>)
    expect(container.querySelector('.strides-node-group-label')).toBeNull()
  })

  it('applies the color as a background style', () => {
    const { container } = render(<Group color="#fef3c7">content</Group>)
    const el = container.querySelector('.strides-node-group') as HTMLElement
    expect(el.style.background).toBe('rgb(254, 243, 199)')
  })

  it('omits the repeat annotation when no repeat count is given', () => {
    const { container } = render(<Group>content</Group>)
    expect(container.querySelector('.strides-node-group-repeat')).toBeNull()
  })

  it('shows a "× N" repeat annotation when given a repeat count', () => {
    render(<Group repeat={12}>content</Group>)
    expect(screen.getByText('× 12')).toBeTruthy()
  })
})
