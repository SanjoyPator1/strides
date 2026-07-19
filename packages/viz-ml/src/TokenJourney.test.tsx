// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { TokenJourney, type JourneySequence } from './TokenJourney'
import { tokenColor, tokenHue } from './token-colors'

const sequences: JourneySequence[] = [
  {
    text: 'Your journey starts',
    tokens: [
      { text: 'Your', id: 7120, embedding: [0.43, 0.15, 0.89] },
      { text: ' journey', id: 7002, embedding: [0.55, 0.87, 0.66] },
      { text: ' starts', id: 4940, embedding: [0.57, 0.85, 0.64] },
    ],
  },
  {
    text: 'Every effort moves',
    tokens: [
      { text: 'Every', id: 6109, embedding: [0.1, 0.2, 0.3] },
      { text: ' effort', id: 3626, embedding: [0.4, 0.5, 0.6] },
      { text: ' moves', id: 6100, embedding: [0.7, 0.8, 0.9] },
    ],
  },
]

afterEach(() => {
  cleanup()
})

describe('TokenJourney', () => {
  it('renders every sequence header, with only the first expanded into token chips', () => {
    render(<TokenJourney sequences={sequences} />)
    expect(screen.getByText('“Your journey starts”')).toBeTruthy()
    expect(screen.getByText('“Every effort moves”')).toBeTruthy()
    // First sequence's chips are visible; second sequence's are not.
    expect(screen.getByRole('button', { name: '␣starts' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '␣effort' })).toBeNull()
  })

  it('starts with one complete path open: first token shows its id and embedding without any clicks', () => {
    const { container } = render(<TokenJourney sequences={sequences} />)
    const detail = container.querySelector('.strides-token-journey-detail') as HTMLElement
    expect(within(detail).getByText('id 7120')).toBeTruthy()
    expect(screen.getByText('0.43')).toBeTruthy()
  })

  it('renders a BPE leading space visibly as ␣ on token chips', () => {
    render(<TokenJourney sequences={sequences} />)
    expect(screen.getByRole('button', { name: '␣journey' })).toBeTruthy()
  })

  it('expands a collapsed sequence into chips on click', () => {
    render(<TokenJourney sequences={sequences} />)
    fireEvent.click(screen.getByRole('button', { name: /Every effort moves/ }))
    expect(screen.getByRole('button', { name: '␣effort' })).toBeTruthy()
  })

  it('drills token → id → embedding stage by stage', () => {
    const { container } = render(<TokenJourney sequences={sequences} />)
    // Clicking a chip reveals the id but not yet the embedding.
    fireEvent.click(screen.getByRole('button', { name: '␣journey' }))
    const details = container.querySelectorAll('.strides-token-journey-detail')
    const journeyDetail = details[details.length - 1] as HTMLElement
    expect(within(journeyDetail).getByText('id 7002')).toBeTruthy()
    expect(screen.queryByText('0.87')).toBeNull()
    // The detail row's "embedding" button reveals the embedding matrix.
    fireEvent.click(within(journeyDetail).getByRole('button', { name: 'embedding' }))
    expect(screen.getByText('0.87')).toBeTruthy()
    expect(within(journeyDetail).getByText('embedding (d = 3)')).toBeTruthy()
  })

  it('updates the breadcrumb as the reader drills', () => {
    const { container } = render(<TokenJourney sequences={sequences} />)
    const breadcrumb = () => container.querySelector('.strides-token-journey-breadcrumb')!.textContent
    // Initial path reflects the auto-opened first token.
    expect(breadcrumb()).toContain('“Your”')
    expect(breadcrumb()).toContain('embedding')
    fireEvent.click(screen.getByRole('button', { name: '␣starts' }))
    expect(breadcrumb()).toContain('“␣starts”')
    expect(breadcrumb()).toContain('id 4940')
  })

  it('gives the same token id the same color everywhere, and different ids different hues', () => {
    expect(tokenColor(7002)).toBe(tokenColor(7002))
    expect(tokenHue(7002)).not.toBe(tokenHue(7120))
    const shared: JourneySequence[] = [
      { text: 'a', tokens: [{ text: ' you', id: 345, embedding: [0.1] }] },
      { text: 'b', tokens: [{ text: ' you', id: 345, embedding: [0.2] }] },
    ]
    render(<TokenJourney sequences={shared} />)
    fireEvent.click(screen.getByRole('button', { name: /“b”/ }))
    const chips = screen.getAllByRole('button', { name: '␣you' })
    expect(chips).toHaveLength(2)
    expect(chips[0].style.background).toBe(chips[1].style.background)
  })
})
