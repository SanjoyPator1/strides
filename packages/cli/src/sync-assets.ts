import fs from 'node:fs'
import path from 'node:path'

/**
 * Mirrors snapshotDir/assets into public/_strides/assets so Next.js can serve frozen
 * cell images as plain static files. Run before `next dev`/`next build`; the destination
 * is a gitignored build artifact, not a second source of truth.
 */
export function syncSnapshotAssets(cwd: string, snapshotDir: string): void {
  const src = path.resolve(cwd, snapshotDir, 'assets')
  const dest = path.resolve(cwd, 'public', '_strides', 'assets')

  fs.rmSync(dest, { recursive: true, force: true })
  if (!fs.existsSync(src)) return

  fs.mkdirSync(dest, { recursive: true })
  fs.cpSync(src, dest, { recursive: true })
}
