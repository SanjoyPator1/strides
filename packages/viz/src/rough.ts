/**
 * Hand-drawn ("teacher scribble") SVG path generators. All jitter is driven by
 * a seeded PRNG so the same seed always renders the same strokes — required for
 * SSR/hydration equality and for stable snapshots.
 */

/** Deterministic PRNG (LCG). */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/**
 * A rough ellipse as two overlapping imperfect strokes.
 * Returns one `d` string per pass (draw pass 0 heavier, pass 1 lighter).
 */
export function roughEllipsePaths(
  cx: number, cy: number, rx: number, ry: number, seed: number,
): string[] {
  const passes: string[] = []
  for (let pass = 0; pass < 2; pass++) {
    const rand = seededRandom(seed + pass * 7)
    const segments = 26
    let d = ''
    for (let k = 0; k <= segments; k++) {
      const theta = (k / segments) * Math.PI * 2 - Math.PI / 6
      const px = cx + Math.cos(theta) * rx + (rand() - 0.5) * 3
      const py = cy + Math.sin(theta) * ry + (rand() - 0.5) * 3
      d += (k === 0 ? 'M' : 'L') + px.toFixed(1) + ' ' + py.toFixed(1)
    }
    passes.push(d)
  }
  return passes
}

export interface RoughArrow {
  /** The curved shaft. */
  curve: string
  /** The two-stroke arrowhead. */
  head: string
}

/** A gently curved hand-drawn arrow from (x1,y1) to (x2,y2). */
export function roughArrowPaths(
  x1: number, y1: number, x2: number, y2: number, seed: number,
): RoughArrow {
  const rand = seededRandom(seed)
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const bend = 0.18 * len
  const cx = mx - (dy / len) * bend + (rand() - 0.5) * 4
  const cy = my + (dx / len) * bend + (rand() - 0.5) * 4
  const angle = Math.atan2(y2 - cy, x2 - cx)
  const a1 = angle + Math.PI * 0.86
  const a2 = angle - Math.PI * 0.86
  return {
    curve: `M${x1} ${y1} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2} ${y2}`,
    head:
      `M${x2} ${y2} L${(x2 + Math.cos(a1) * 9).toFixed(1)} ${(y2 + Math.sin(a1) * 9).toFixed(1)} ` +
      `M${x2} ${y2} L${(x2 + Math.cos(a2) * 9).toFixed(1)} ${(y2 + Math.sin(a2) * 9).toFixed(1)}`,
  }
}
