'use client'

import { useEffect, useState } from 'react'
import { useKernel } from './KernelProvider'
import { OutputView } from './OutputView'
import type { CellOutput, CellState } from '../output-types'

export interface PyCellClientProps {
  index: number
  code: string
  highlightedHtml: string
  frozenOutputs: CellOutput[] | null
  isStale: boolean
  hasSnapshot: boolean
}

const STATE_LABEL: Record<CellState, string> = {
  idle: 'Idle',
  queued: 'Queued…',
  running: 'Running…',
  ok: 'Ran',
  error: 'Error',
}

export function PyCellClient({ index, code, highlightedHtml, frozenOutputs, isStale, hasSnapshot }: PyCellClientProps) {
  const kernel = useKernel()
  const [draft, setDraft] = useState(code)

  useEffect(() => {
    kernel?.registerCell(index, code)
    // Registration is keyed by index/code identity for this cell's lifetime; re-running on kernel
    // identity change would re-register into a fresh session, which is the desired behavior.
  }, [kernel, index, code])

  const live = kernel && kernel.status === 'ready' ? kernel.getCellState(index) : null
  const showLive = live !== null && live.state !== 'idle'
  const editable = kernel !== null && kernel.status === 'ready'

  const handleRun = () => {
    if (!kernel) return
    kernel.updateCellCode(index, draft)
    kernel.run(index)
  }

  return (
    <div className="strides-py-cell">
      {editable ? (
        <textarea
          className="strides-py-cell-editor"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          spellCheck={false}
          rows={Math.max(3, draft.split('\n').length)}
        />
      ) : (
        <div className="strides-py-cell-code" dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
      )}

      {editable ? (
        <div className="strides-py-cell-strip">
          <button
            type="button"
            className="strides-py-cell-run"
            disabled={live?.state === 'queued' || live?.state === 'running'}
            onClick={handleRun}
          >
            ▶ Run
          </button>
          <span className="strides-py-cell-state">{STATE_LABEL[live?.state ?? 'idle']}</span>
        </div>
      ) : null}

      {showLive ? (
        <div className="strides-py-cell-outputs">
          {live!.outputs.map((output, i) => (
            <OutputView key={i} output={output} source="live" />
          ))}
        </div>
      ) : (
        <FrozenOutputs
          outputs={frozenOutputs}
          hasSnapshot={hasSnapshot}
          isStale={isStale}
          annotate={kernel !== null && kernel.status === 'ready'}
        />
      )}
    </div>
  )
}

function FrozenOutputs({
  outputs,
  hasSnapshot,
  isStale,
  annotate,
}: {
  outputs: CellOutput[] | null
  hasSnapshot: boolean
  isStale: boolean
  annotate: boolean
}) {
  if (!hasSnapshot) {
    return <p className="strides-py-cell-note">Not yet run — no snapshot recorded.</p>
  }

  return (
    <div className="strides-py-cell-outputs">
      {annotate ? <p className="strides-py-cell-note">(from snapshot)</p> : null}
      {isStale ? <p className="strides-py-cell-badge">Output may be stale — re-run `strides snapshot`</p> : null}
      {(outputs ?? []).map((output, i) => (
        <OutputView key={i} output={output} source="frozen" />
      ))}
    </div>
  )
}
