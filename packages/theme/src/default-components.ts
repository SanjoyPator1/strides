import type { MDXComponents } from 'next-mdx-remote-client/rsc'
import { Matrix, Scene, Step } from '@strides/viz'
import { AttentionHeatmap } from '@strides/viz-ml'

/** Viz components available to every page's MDX by default, ahead of the caller's own component map. */
export const defaultComponents: MDXComponents = {
  Matrix,
  Scene,
  Step,
  AttentionHeatmap,
}
