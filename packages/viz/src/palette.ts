/**
 * Validated categorical palette (light mode) — fixed slot order.
 * The ordering is the colorblind-safety mechanism: it was validated as a set
 * (worst adjacent-pair CVD ΔE 24.2, all slots inside the lightness band).
 * Assign identity colors by index in this order; never cycle or generate hues.
 * Slots 2 (aqua), 3 (yellow), and 7 (magenta) sit below 3:1 contrast on light
 * surfaces — always pair them with a visible text label.
 */
export const CATEGORICAL = [
  '#2a78d6', // 1 blue
  '#1baf7a', // 2 aqua
  '#eda100', // 3 yellow
  '#008300', // 4 green
  '#4a3aa7', // 5 violet
  '#e34948', // 6 red
  '#e87ba4', // 7 magenta
  '#eb6834', // 8 orange
]

/**
 * Default colors for tensor *dimensions* (batch/tokens/heads/head_dim…) —
 * a validated 4-slot subset ordered for adjacency (worst pair ΔE 25.0),
 * deliberately starting away from CATEGORICAL[0] so dimension colors don't
 * collide with the first few identity colors on the same diagram.
 */
export const DIM_COLORS = ['#4a3aa7', '#1baf7a', '#eb6834', '#e87ba4']

/** Translucent wash of a hex color, for chip/box fills over any surface. */
export function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}
