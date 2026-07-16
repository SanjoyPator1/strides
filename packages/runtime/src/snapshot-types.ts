import type { CellOutput } from './output-types'

export interface CellSnapshot {
  index: number
  /** "sha256:<hex>" hash of the exact fence source, used to detect stale output. */
  codeHash: string
  durationMs: number
  outputs: CellOutput[]
}

export interface PageEnvironment {
  python: string
  platform: string
  gpu: string | null
  packages: Record<string, string>
}

export interface PageSnapshot {
  version: 1
  /** Page slug, e.g. "getting-started/01-welcome". */
  page: string
  generatedAt: string
  environment: PageEnvironment
  hasErrors: boolean
  cells: CellSnapshot[]
}
