'use client'

import { useKernel } from './KernelProvider'

/** Page-level (not per-cell): the "gateway down" banner, and the one "Restart kernel" control. */
export function KernelStatusBar() {
  const kernel = useKernel()
  if (!kernel) return null

  if (kernel.status === 'unavailable') {
    return <p className="strides-kernel-banner">Kernel not available — cells are read-only.</p>
  }

  if (kernel.status === 'ready') {
    return (
      <div className="strides-kernel-statusbar">
        <button type="button" className="strides-kernel-restart" onClick={() => kernel.restart()}>
          Restart kernel
        </button>
      </div>
    )
  }

  return null
}
