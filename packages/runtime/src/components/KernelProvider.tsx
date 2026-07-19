'use client'

import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { StridesKernelClient } from '../kernel-client'
import type { CellOutput, CellState } from '../output-types'

interface CellRuntimeState {
  code: string
  state: CellState
  outputs: CellOutput[]
}

export type KernelStatus = 'checking' | 'unavailable' | 'ready'

export interface KernelContextValue {
  status: KernelStatus
  registerCell: (index: number, code: string) => void
  getCellState: (index: number) => { state: CellState; outputs: CellOutput[] }
  updateCellCode: (index: number, code: string) => void
  run: (index: number) => Promise<void>
  restart: () => Promise<void>
}

const KernelContext = createContext<KernelContextValue | null>(null)

/** null outside a KernelProvider (published mode, or dev with no gateway configured). */
export function useKernel(): KernelContextValue | null {
  return useContext(KernelContext)
}

const HEALTH_CHECK_TIMEOUT_MS = 3000

export interface KernelProviderProps {
  gatewayUrl: string
  children: ReactNode
}

export function KernelProvider({ gatewayUrl, children }: KernelProviderProps) {
  const [version, forceRender] = useReducer((n: number) => n + 1, 0)
  const statusRef = useRef<KernelStatus>('checking')
  const cellsRef = useRef(new Map<number, CellRuntimeState>())
  const clientRef = useRef<StridesKernelClient | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`${gatewayUrl}/api/kernelspecs`, { signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS) })
      .then((res) => {
        if (cancelled) return
        statusRef.current = res.ok ? 'ready' : 'unavailable'
        forceRender()
      })
      .catch(() => {
        if (cancelled) return
        statusRef.current = 'unavailable'
        forceRender()
      })
    return () => {
      cancelled = true
    }
  }, [gatewayUrl])

  useEffect(() => {
    return () => {
      clientRef.current?.shutdown().catch(() => {})
      clientRef.current?.dispose()
    }
  }, [])

  const updateCell = (index: number, patch: Partial<CellRuntimeState>) => {
    const current = cellsRef.current.get(index)
    if (!current) return
    cellsRef.current.set(index, { ...current, ...patch })
    forceRender()
  }

  const value = useMemo<KernelContextValue>(
    () => ({
      status: statusRef.current,

      registerCell(index, code) {
        if (cellsRef.current.has(index)) return
        cellsRef.current.set(index, { code, state: 'idle', outputs: [] })
        forceRender()
      },

      getCellState(index) {
        return cellsRef.current.get(index) ?? { state: 'idle', outputs: [] }
      },

      /** Overwrites a cell's code (in-browser editing) and resets it to idle so `run` re-executes it. */
      updateCellCode(index, code) {
        const current = cellsRef.current.get(index)
        cellsRef.current.set(index, { code, state: 'idle', outputs: current?.outputs ?? [] })
        forceRender()
      },

      async run(targetIndex) {
        if (!clientRef.current) {
          clientRef.current = await StridesKernelClient.connect({ gatewayUrl })
        }
        if (!clientRef.current.isStarted) {
          await clientRef.current.start()
        }

        const indices = Array.from(cellsRef.current.keys())
          .filter((i) => i <= targetIndex)
          .sort((a, b) => a - b)

        for (const i of indices) {
          const cell = cellsRef.current.get(i)
          if (!cell || cell.state === 'ok' || cell.state === 'error') continue
          updateCell(i, { state: 'queued' })
        }

        for (const i of indices) {
          const cell = cellsRef.current.get(i)
          if (!cell || cell.state === 'ok' || cell.state === 'error') continue

          updateCell(i, { state: 'running', outputs: [] })
          const result = await clientRef.current.execute(cell.code, {
            onOutput: (output) => {
              const latest = cellsRef.current.get(i)
              if (latest) updateCell(i, { outputs: [...latest.outputs, output] })
            },
          })
          updateCell(i, { state: result.ok ? 'ok' : 'error' })
        }
      },

      async restart() {
        if (clientRef.current) {
          await clientRef.current.restart()
        }
        for (const [i, cell] of cellsRef.current) {
          cellsRef.current.set(i, { ...cell, state: 'idle', outputs: [] })
        }
        forceRender()
      },
    }),
    // `version` has no direct use in the body below; bumping it forces a new object
    // reference so React Context actually propagates the (mutable-ref-backed) status
    // and cell-state reads to consumers — see the note on statusRef/cellsRef above.
    [gatewayUrl, version],
  )

  return <KernelContext.Provider value={value}>{children}</KernelContext.Provider>
}
