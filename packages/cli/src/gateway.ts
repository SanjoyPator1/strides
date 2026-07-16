import { spawn, type ChildProcess } from 'node:child_process'

export interface KernelGatewayHandle {
  process: ChildProcess
  url: string
  stop: () => Promise<void>
}

export interface SpawnGatewayOptions {
  pythonPath: string
  port: number
  corsOrigin: string
  cwd: string
}

/** Launches the kernel gateway via `python -m kernel_gateway` (avoids depending on the bin script's exact path). */
export function spawnKernelGateway(options: SpawnGatewayOptions): KernelGatewayHandle {
  const { pythonPath, port, corsOrigin, cwd } = options

  const child = spawn(pythonPath, ['-m', 'kernel_gateway', `--port=${port}`, '--ip=127.0.0.1'], {
    cwd,
    env: { ...process.env, KG_ALLOW_ORIGIN: corsOrigin },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  return {
    process: child,
    url: `http://127.0.0.1:${port}`,
    stop() {
      return new Promise((resolve) => {
        if (child.exitCode !== null || child.signalCode !== null) {
          resolve()
          return
        }
        child.once('exit', () => resolve())
        child.kill('SIGTERM')
      })
    },
  }
}

/** Polls the gateway's REST API until it responds, or throws after timeoutMs. */
export async function waitForGatewayReady(url: string, timeoutMs = 15_000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/kernelspecs`)
      if (res.ok) return
    } catch {
      // gateway not listening yet; keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`strides: kernel gateway at ${url} did not become ready within ${timeoutMs}ms`)
}
