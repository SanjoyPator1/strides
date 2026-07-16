import { describe, expect, it } from 'vitest'
import { compareOrderable, deriveTitle, kebabToTitleCase, parseOrderPrefix } from './content'

describe('parseOrderPrefix', () => {
  it('extracts a numeric prefix and the remaining name', () => {
    expect(parseOrderPrefix('01-welcome')).toEqual({ order: 1, rest: 'welcome' })
    expect(parseOrderPrefix('10-attention-weights')).toEqual({ order: 10, rest: 'attention-weights' })
  })

  it('treats names without a numeric prefix as unordered', () => {
    expect(parseOrderPrefix('appendix')).toEqual({ order: Number.POSITIVE_INFINITY, rest: 'appendix' })
  })

  it('does not treat a bare number as a prefix (requires a trailing dash)', () => {
    expect(parseOrderPrefix('2024')).toEqual({ order: Number.POSITIVE_INFINITY, rest: '2024' })
  })
})

describe('kebabToTitleCase / deriveTitle', () => {
  it('converts kebab-case to Title Case', () => {
    expect(kebabToTitleCase('getting-started')).toBe('Getting Started')
    expect(kebabToTitleCase('welcome')).toBe('Welcome')
  })

  it('strips numeric prefixes before deriving a title', () => {
    expect(deriveTitle('01-welcome')).toBe('Welcome')
    expect(deriveTitle('02-attention-weights')).toBe('Attention Weights')
    expect(deriveTitle('getting-started')).toBe('Getting Started')
  })
})

describe('compareOrderable', () => {
  it('sorts numeric prefixes numerically, not lexicographically', () => {
    const entries = [
      { order: 10, sortKey: 'ten' },
      { order: 2, sortKey: 'two' },
      { order: 1, sortKey: 'one' },
    ]
    expect([...entries].sort(compareOrderable).map((e) => e.sortKey)).toEqual(['one', 'two', 'ten'])
  })

  it('falls back to alphabetical order when prefixes are equal (or absent)', () => {
    const entries = [
      { order: Number.POSITIVE_INFINITY, sortKey: 'zeta' },
      { order: Number.POSITIVE_INFINITY, sortKey: 'alpha' },
    ]
    expect([...entries].sort(compareOrderable).map((e) => e.sortKey)).toEqual(['alpha', 'zeta'])
  })

  it('orders prefixed entries before unprefixed ones', () => {
    const entries = [
      { order: Number.POSITIVE_INFINITY, sortKey: 'appendix' },
      { order: 1, sortKey: 'welcome' },
    ]
    expect([...entries].sort(compareOrderable).map((e) => e.sortKey)).toEqual(['welcome', 'appendix'])
  })
})
