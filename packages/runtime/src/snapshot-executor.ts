import fs from 'node:fs'
import path from 'node:path'
import { StridesKernelClient } from './kernel-client'
import { extractCells } from './extract-cells'
import { hashCode } from './code-hash'
import type { CellOutput } from './output-types'
import type { CellSnapshot, PageEnvironment, PageSnapshot } from './snapshot-types'

const DEFAULT_CELL_TIMEOUT_MS = 120_000

const ENV_PROBE = `
import json, platform, subprocess

def _cpu_brand():
    try:
        return subprocess.check_output(["sysctl", "-n", "machdep.cpu.brand_string"], text=True).strip()
    except Exception:
        return platform.processor() or platform.machine()

info = {"python": platform.python_version(), "platform": platform.platform(), "gpu": None, "packages": {}}
try:
    import torch
    info["packages"]["torch"] = torch.__version__
    if torch.cuda.is_available():
        info["gpu"] = torch.cuda.get_device_name(0)
    elif getattr(getattr(torch.backends, "mps", None), "is_available", lambda: False)():
        info["gpu"] = _cpu_brand() + " (mps)"
except ImportError:
    pass
print(json.dumps(info))
`.trim()

export interface SnapshotExecutorOptions {
  gatewayUrl: string
  snapshotDir: string
  cellTimeoutMs?: number
}

export interface PageSnapshotSummary {
  slug: string
  cellsRun: number
  durationMs: number
  hasErrors: boolean
}

async function probeEnvironment(kernel: StridesKernelClient): Promise<PageEnvironment> {
  const result = await kernel.execute(ENV_PROBE, { silent: true })
  const streamText = result.outputs
    .filter((o): o is Extract<CellOutput, { type: 'stream' }> => o.type === 'stream')
    .map((o) => o.text)
    .join('')

  try {
    return JSON.parse(streamText.trim()) as PageEnvironment
  } catch {
    return { python: 'unknown', platform: 'unknown', gpu: null, packages: {} }
  }
}

/** Extracts base64 image/png outputs to asset files, rewriting the value to a relative path. */
function extractImages(slug: string, cellIndex: number, outputs: CellOutput[], snapshotDir: string): CellOutput[] {
  let outputIndex = 0

  return outputs.map((output) => {
    if (output.type !== 'execute_result' && output.type !== 'display_data') return output
    const png = output.data['image/png']
    if (!png) return output

    const assetDir = path.join(snapshotDir, 'assets', slug)
    fs.mkdirSync(assetDir, { recursive: true })
    const fileName = `${cellIndex}-${outputIndex}.png`
    outputIndex += 1
    fs.writeFileSync(path.join(assetDir, fileName), Buffer.from(png, 'base64'))

    return { ...output, data: { ...output.data, 'image/png': `assets/${slug}/${fileName}` } }
  })
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer!)
  }
}

/** Runs one page's cells against a fresh-per-page kernel and returns its snapshot. */
export async function runPageSnapshot(
  slug: string,
  mdxBody: string,
  options: SnapshotExecutorOptions,
): Promise<{ snapshot: PageSnapshot; summary: PageSnapshotSummary }> {
  const cellCodes = extractCells(mdxBody)

  const assetDir = path.join(options.snapshotDir, 'assets', slug)
  fs.rmSync(assetDir, { recursive: true, force: true })

  const kernel = await StridesKernelClient.connect({ gatewayUrl: options.gatewayUrl })
  await kernel.start()

  const environment = await probeEnvironment(kernel)
  const cells: CellSnapshot[] = []
  let hasErrors = false
  const start = Date.now()

  for (let index = 0; index < cellCodes.length; index += 1) {
    const code = cellCodes[index]
    try {
      const result = await withTimeout(
        kernel.execute(code),
        options.cellTimeoutMs ?? DEFAULT_CELL_TIMEOUT_MS,
        `cell ${index} on page "${slug}" timed out after ${options.cellTimeoutMs ?? DEFAULT_CELL_TIMEOUT_MS}ms`,
      )
      if (!result.ok) hasErrors = true
      cells.push({
        index,
        codeHash: hashCode(code),
        durationMs: result.durationMs,
        outputs: extractImages(slug, index, result.outputs, options.snapshotDir),
      })
    } catch (error) {
      hasErrors = true
      cells.push({
        index,
        codeHash: hashCode(code),
        durationMs: 0,
        outputs: [{ type: 'error', ename: 'TimeoutError', evalue: (error as Error).message, traceback: [] }],
      })
      break // the kernel may be wedged; stop this page rather than queue more work behind it
    }
  }

  await kernel.shutdown().catch(() => {})
  kernel.dispose()

  const snapshot: PageSnapshot = {
    version: 1,
    page: slug,
    generatedAt: new Date().toISOString(),
    environment,
    hasErrors,
    cells,
  }

  return { snapshot, summary: { slug, cellsRun: cells.length, durationMs: Date.now() - start, hasErrors } }
}

/** Serializes a snapshot with deterministic key order and stable 2-space formatting. */
export function serializeSnapshot(snapshot: PageSnapshot): string {
  const ordered: PageSnapshot = {
    version: snapshot.version,
    page: snapshot.page,
    generatedAt: snapshot.generatedAt,
    environment: {
      python: snapshot.environment.python,
      platform: snapshot.environment.platform,
      gpu: snapshot.environment.gpu,
      packages: snapshot.environment.packages,
    },
    hasErrors: snapshot.hasErrors,
    cells: snapshot.cells.map((cell) => ({
      index: cell.index,
      codeHash: cell.codeHash,
      durationMs: cell.durationMs,
      outputs: cell.outputs,
    })),
  }
  return `${JSON.stringify(ordered, null, 2)}\n`
}

/** Writes a page's snapshot JSON to snapshotDir/<slug>.json, creating parent directories as needed. */
export function writePageSnapshot(snapshot: PageSnapshot, snapshotDir: string): string {
  const filePath = path.join(snapshotDir, `${snapshot.page}.json`)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, serializeSnapshot(snapshot))
  return filePath
}
