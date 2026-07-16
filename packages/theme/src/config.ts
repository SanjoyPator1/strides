import type { NextConfig } from 'next'

export interface StridesConfig {
  /** Site title, shown in the header and used as the default page metadata title. */
  title: string
  /** One-line site description, used as the default meta description. */
  description?: string
  /** Directory (relative to the repo root) containing .mdx content. */
  contentDir?: string
  /** Directory (relative to the repo root) containing frozen cell-output snapshots. */
  snapshotDir?: string
  python?: {
    /** Path to the Python venv (relative to the repo root) used to run cells. */
    venv?: string
  }
}

const STRIDES_TRANSPILE_PACKAGES = ['@strides/theme', '@strides/runtime', '@strides/viz', '@strides/viz-ml']

export function withStrides(nextConfig: NextConfig = {}): NextConfig {
  const existing = nextConfig.transpilePackages ?? []
  return {
    ...nextConfig,
    transpilePackages: Array.from(new Set([...existing, ...STRIDES_TRANSPILE_PACKAGES])),
  }
}
