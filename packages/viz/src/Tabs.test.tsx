// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Tabs } from './Tabs'

afterEach(() => {
  cleanup()
})

describe('Tabs', () => {
  it('marks the active tab as selected', () => {
    render(<Tabs labels={['Batch 0', 'Batch 1']} active={1} onChange={() => {}} />)
    expect(screen.getByText('Batch 0').getAttribute('aria-selected')).toBe('false')
    expect(screen.getByText('Batch 1').getAttribute('aria-selected')).toBe('true')
  })

  it('calls onChange with the clicked tab index', () => {
    const onChange = vi.fn()
    render(<Tabs labels={['Batch 0', 'Batch 1']} active={0} onChange={onChange} />)
    fireEvent.click(screen.getByText('Batch 1'))
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('renders as a static, clickable-but-inert indicator when onChange is omitted', () => {
    render(<Tabs labels={['Batch 0', 'Batch 1']} active={0} />)
    // Should not throw when clicked without a handler.
    expect(() => fireEvent.click(screen.getByText('Batch 1'))).not.toThrow()
  })
})
