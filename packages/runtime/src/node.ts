/**
 * Node-only entry point: content/snapshot utilities with no React/JSX, safe for
 * @strides/cli (a plain Node process, never bundled) to import without pulling
 * in the component tree.
 */
export type { CellOutput, CellState } from './output-types'
export type { CellSnapshot, PageEnvironment, PageSnapshot } from './snapshot-types'

export { hashCode } from './code-hash'
export { extractCells } from './extract-cells'
export { findContentPages } from './content-scan'
export type { ContentPage } from './content-scan'
export { loadPageSnapshot } from './snapshot-io'
export type { SnapshotIOConfig } from './snapshot-io'

export { StridesKernelClient } from './kernel-client'
export type { KernelClientOptions, ExecuteResult } from './kernel-client'

export { runPageSnapshot, serializeSnapshot, writePageSnapshot } from './snapshot-executor'
export type { SnapshotExecutorOptions, PageSnapshotSummary } from './snapshot-executor'
