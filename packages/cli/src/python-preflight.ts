import { existsSync } from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

export interface PreflightResult {
  ok: boolean
  pythonPath: string
  error?: string
}

/** Resolves <venv>/bin/python and checks that ipykernel + kernel_gateway are importable. */
export function preflightPython(venv: string, cwd: string = process.cwd()): PreflightResult {
  const pythonPath = path.resolve(cwd, venv, 'bin', 'python')

  if (!existsSync(pythonPath)) {
    return {
      ok: false,
      pythonPath,
      error: `no Python venv found at ${path.relative(cwd, pythonPath)}. Run \`uv sync\` to create it.`,
    }
  }

  try {
    execFileSync(pythonPath, ['-c', 'import ipykernel, kernel_gateway'], { stdio: 'ignore' })
    return { ok: true, pythonPath }
  } catch {
    return {
      ok: false,
      pythonPath,
      error: `the Python venv at ${path.relative(cwd, pythonPath)} is missing ipykernel or jupyter-kernel-gateway. Run \`uv sync\` to install them.`,
    }
  }
}
