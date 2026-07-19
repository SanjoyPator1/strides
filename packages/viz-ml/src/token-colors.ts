/**
 * Deterministic per-token colors: the same token id always maps to the same hue,
 * anywhere on the page, so a reader can follow one word through the whole pipeline
 * (sentence → ids → embedding row → attention row/col → ...).
 *
 * Hues step around the wheel by the golden angle so nearby ids land far apart.
 */
const GOLDEN_ANGLE = 137.508

export function tokenHue(id: number): number {
  return ((id * GOLDEN_ANGLE) % 360 + 360) % 360
}

/** Solid color for borders, underlines, and badges. Legible on light and dark themes. */
export function tokenColor(id: number): string {
  return `hsl(${tokenHue(id).toFixed(1)} 65% 48%)`
}

/** Translucent tint for chip/panel backgrounds — sits on top of either theme's background. */
export function tokenColorSoft(id: number): string {
  return `hsl(${tokenHue(id).toFixed(1)} 65% 48% / 0.14)`
}
