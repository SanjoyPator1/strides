import { spawn } from 'node:child_process'
import { loadStridesConfig } from '../config-loader'
import { preflightPython } from '../python-preflight'
import { getFreePort } from '../port'
import { spawnKernelGateway, waitForGatewayReady, type KernelGatewayHandle } from '../gateway'
import { syncSnapshotAssets } from '../sync-assets'

export async function runDevCommand(cwd: string = process.cwd()): Promise<void> {
  const config = await loadStridesConfig(cwd)
  syncSnapshotAssets(cwd, config.snapshotDir)
  const nextPort = await getFreePort()
  const nextOrigin = `http://localhost:${nextPort}`

  let gateway: KernelGatewayHandle | null = null
  let gatewayUrl: string | null = null

  const preflight = preflightPython(config.pythonVenv, cwd)
  if (!preflight.ok) {
    console.warn(`strides: ${preflight.error}`)
    console.warn('strides: continuing without a kernel — cells will be read-only.')
  } else {
    const gatewayPort = await getFreePort()
    gateway = spawnKernelGateway({ pythonPath: preflight.pythonPath, port: gatewayPort, corsOrigin: nextOrigin, cwd })
    try {
      await waitForGatewayReady(gateway.url)
      gatewayUrl = gateway.url
    } catch (error) {
      console.warn(`strides: ${(error as Error).message}`)
      console.warn('strides: continuing without a kernel — cells will be read-only.')
      await gateway.stop()
      gateway = null
    }
  }

  const next = spawn('next', ['dev', '--port', String(nextPort), '--hostname', 'localhost'], {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...(gatewayUrl ? { NEXT_PUBLIC_STRIDES_KERNEL_URL: gatewayUrl } : {}),
    },
  })

  console.log(`strides: site      → ${nextOrigin}`)
  if (gatewayUrl) console.log(`strides: kernel    → ${gatewayUrl}`)

  let shuttingDown = false
  const shutdown = async () => {
    if (shuttingDown) return
    shuttingDown = true
    next.kill('SIGTERM')
    await gateway?.stop()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  await new Promise<void>((resolve) => {
    next.on('exit', () => resolve())
  })
  await gateway?.stop()
}
