import path from 'node:path'
import picomatch from 'picomatch'
import { findContentPages, runPageSnapshot, writePageSnapshot } from '@strides/runtime/node'
import { loadStridesConfig } from '../config-loader'
import { preflightPython } from '../python-preflight'
import { getFreePort } from '../port'
import { spawnKernelGateway, waitForGatewayReady } from '../gateway'

export async function runSnapshotCommand(glob?: string, cwd: string = process.cwd()): Promise<void> {
  const config = await loadStridesConfig(cwd)

  const preflight = preflightPython(config.pythonVenv, cwd)
  if (!preflight.ok) {
    console.error(`strides: ${preflight.error}`)
    process.exitCode = 1
    return
  }

  const allPages = findContentPages(config.contentDir)
  const pages = glob ? allPages.filter((page) => picomatch(glob)(page.slug)) : allPages

  if (pages.length === 0) {
    console.warn('strides: no content pages matched.')
    return
  }

  const gatewayPort = await getFreePort()
  const gateway = spawnKernelGateway({ pythonPath: preflight.pythonPath, port: gatewayPort, corsOrigin: '*', cwd })
  await waitForGatewayReady(gateway.url)

  const snapshotDir = path.resolve(cwd, config.snapshotDir)
  let hasAnyErrors = false

  for (const page of pages) {
    const { snapshot, summary } = await runPageSnapshot(page.slug, page.mdxBody, { gatewayUrl: gateway.url, snapshotDir })
    writePageSnapshot(snapshot, snapshotDir)
    hasAnyErrors = hasAnyErrors || summary.hasErrors
    console.log(`strides: ${page.slug} — ${summary.cellsRun} cell(s), ${summary.durationMs}ms [${summary.hasErrors ? 'ERROR' : 'ok'}]`)
  }

  await gateway.stop()

  if (hasAnyErrors) {
    process.exitCode = 1
  }
}
