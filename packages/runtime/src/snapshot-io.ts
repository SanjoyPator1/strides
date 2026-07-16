import fs from 'node:fs'
import path from 'node:path'
import type { PageSnapshot } from './snapshot-types'

export interface SnapshotIOConfig {
  snapshotDir?: string
}

function snapshotRoot(config: SnapshotIOConfig): string {
  return path.resolve(process.cwd(), config.snapshotDir ?? 'snapshots')
}

/** Reads a page's frozen snapshot JSON, if one has been committed. Node-only (server-side). */
export function loadPageSnapshot(slug: string, config: SnapshotIOConfig): PageSnapshot | null {
  const root = snapshotRoot(config)
  const filePath = path.resolve(root, `${slug}.json`)

  if (!filePath.startsWith(root + path.sep) || !fs.existsSync(filePath)) {
    return null
  }

  const raw = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(raw) as PageSnapshot
}
