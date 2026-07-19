'use client'

import { Matrix, Scene, Step, TensorSlices, type MatrixGroup, type TensorSlice } from '@strides/viz'

export interface HeadSplitVizProps {
  /** (tokens, d_out) — the projected Q/K/V values, before splitting into heads. */
  values: number[][]
  numHeads: number
  tokenLabels?: string[]
  /** One color per head; cycles if there are more heads than colors. */
  headColors?: string[]
  precision?: number
  /** Scene identity, so the wide matrix's cells tween apart into per-head slices instead of remounting. */
  id?: string
}

const DEFAULT_HEAD_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2']

export function HeadSplitViz({
  values,
  numHeads,
  tokenLabels,
  headColors = DEFAULT_HEAD_COLORS,
  precision = 2,
  id = 'headsplit',
}: HeadSplitVizProps) {
  const dOut = values[0]?.length ?? 0

  if (numHeads <= 0 || dOut % numHeads !== 0) {
    return (
      <p className="strides-headsplit-error">
        HeadSplitViz: d_out={dOut} doesn't split evenly into numHeads={numHeads} — each head needs the same width
        (d_out % numHeads must be 0).
      </p>
    )
  }

  const headDim = dOut / numHeads
  const colorFor = (head: number) => headColors[head % headColors.length]

  const groups: MatrixGroup[] = Array.from({ length: numHeads }, (_, head) => ({
    label: `Head ${head}`,
    axis: 'col',
    start: head * headDim,
    end: (head + 1) * headDim - 1,
    color: colorFor(head),
  }))

  const slices: TensorSlice[] = Array.from({ length: numHeads }, (_, head) => ({
    label: `Head ${head}`,
    values: values.map((row) => row.slice(head * headDim, (head + 1) * headDim)),
    rowLabels: tokenLabels,
    color: colorFor(head),
    rowOffset: 0,
    colOffset: head * headDim,
  }))

  return (
    <Scene>
      <Step caption={`Projected: one (${values.length}×${dOut}) matrix — d_out isn't split yet, just colored by which head it will become`}>
        <Matrix id={id} values={values} rowLabels={tokenLabels} colorScale="diverging" precision={precision} groups={groups} />
      </Step>
      <Step caption={`Reshaped: ${numHeads} heads of width head_dim=${headDim} — same numbers, now read as separate matrices`}>
        <TensorSlices id={id} slices={slices} colorScale="diverging" precision={precision} layout="row" focusable />
      </Step>
    </Scene>
  )
}
