import { spawn } from 'node:child_process'
import { loadStridesConfig } from '../config-loader'
import { syncSnapshotAssets } from '../sync-assets'

export async function runBuildCommand(cwd: string = process.cwd()): Promise<void> {
  const config = await loadStridesConfig(cwd)
  syncSnapshotAssets(cwd, config.snapshotDir)

  await new Promise<void>((resolve, reject) => {
    const next = spawn('next', ['build'], { cwd, stdio: 'inherit', env: process.env })
    next.on('error', reject)
    next.on('exit', (code) => {
      if (code !== 0) process.exitCode = code ?? 1
      resolve()
    })
  })
}
