import { describe, expect, it } from 'vitest'
import { serializeSnapshot } from './snapshot-executor'
import type { PageSnapshot } from './snapshot-types'

const base: PageSnapshot = {
  version: 1,
  page: 'getting-started/01-welcome',
  generatedAt: '2026-07-16T10:00:00Z',
  environment: { python: '3.12.4', platform: 'macOS-15.5-arm64', gpu: null, packages: { torch: '2.7.1' } },
  hasErrors: false,
  cells: [
    {
      index: 0,
      codeHash: 'sha256:ab12',
      durationMs: 342,
      outputs: [{ type: 'stream', name: 'stdout', text: 'hi\n' }],
    },
  ],
}

describe('serializeSnapshot', () => {
  it('produces stable 2-space-indented JSON with a trailing newline', () => {
    const out = serializeSnapshot(base)
    expect(out.endsWith('\n')).toBe(true)
    expect(out).toContain('{\n  "version": 1,')
  })

  it('produces byte-identical output regardless of input key insertion order', () => {
    // Same data, but constructed with keys in a different order (e.g. as if from
    // a differently-ordered object literal or JSON.parse of a differently-shaped file).
    const reordered: PageSnapshot = JSON.parse(
      JSON.stringify({
        hasErrors: base.hasErrors,
        cells: base.cells.map((c) => ({ outputs: c.outputs, durationMs: c.durationMs, codeHash: c.codeHash, index: c.index })),
        environment: {
          packages: base.environment.packages,
          gpu: base.environment.gpu,
          platform: base.environment.platform,
          python: base.environment.python,
        },
        generatedAt: base.generatedAt,
        page: base.page,
        version: base.version,
      }),
    )

    expect(serializeSnapshot(reordered)).toBe(serializeSnapshot(base))
  })

  it('emits the exact key order from spec §4: version, page, generatedAt, environment, hasErrors, cells', () => {
    const out = serializeSnapshot(base)
    const keys = ['version', 'page', 'generatedAt', 'environment', 'hasErrors', 'cells']
    let lastIndex = -1
    for (const key of keys) {
      const idx = out.indexOf(`"${key}"`)
      expect(idx).toBeGreaterThan(lastIndex)
      lastIndex = idx
    }
  })
})
