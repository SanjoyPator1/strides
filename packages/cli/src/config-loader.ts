import path from 'node:path'
import { createJiti } from 'jiti'

export interface LoadedStridesConfig {
  title: string
  description?: string
  contentDir: string
  snapshotDir: string
  pythonVenv: string
}

interface RawStridesConfig {
  title?: string
  description?: string
  contentDir?: string
  snapshotDir?: string
  python?: { venv?: string }
}

/** Loads strides.config.ts from the repo root via jiti, without depending on @strides/theme's type. */
export async function loadStridesConfig(cwd: string = process.cwd()): Promise<LoadedStridesConfig> {
  const jiti = createJiti(import.meta.url)
  const configPath = path.resolve(cwd, 'strides.config.ts')
  const raw = await jiti.import<RawStridesConfig>(configPath, { default: true })

  return {
    title: raw.title ?? 'strides',
    description: raw.description,
    contentDir: raw.contentDir ?? 'content',
    snapshotDir: raw.snapshotDir ?? 'snapshots',
    pythonVenv: raw.python?.venv ?? '.venv',
  }
}
