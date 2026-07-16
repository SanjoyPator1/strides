import { codeToHtml } from 'shiki'
import { hashCode } from '../code-hash'
import type { PageSnapshot } from '../snapshot-types'
import { PyCellClient } from './PyCellClient'

export interface PyCellProps {
  /** From the remark cell plugin: the fence source. */
  code: string
  /** From the remark cell plugin: 0-based cell index on this page, as a string. */
  index: string
  /** Injected by SnapshotProvider's component-map wrapping; null if the page has no snapshot. */
  snapshot?: PageSnapshot | null
}

export async function PyCell({ code, index, snapshot = null }: PyCellProps) {
  const cellIndex = Number(index)
  const highlightedHtml = await codeToHtml(code, {
    lang: 'python',
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
  })

  const cellSnapshot = snapshot?.cells.find((cell) => cell.index === cellIndex) ?? null
  const isStale = cellSnapshot ? hashCode(code) !== cellSnapshot.codeHash : false

  return (
    <PyCellClient
      index={cellIndex}
      code={code}
      highlightedHtml={highlightedHtml}
      frozenOutputs={cellSnapshot?.outputs ?? null}
      isStale={isStale}
      hasSnapshot={cellSnapshot !== null}
    />
  )
}
