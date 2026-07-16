import { KernelManager, ServerConnection, KernelMessage } from '@jupyterlab/services'
import type { Kernel } from '@jupyterlab/services'
import type { CellOutput } from './output-types'

export interface KernelClientOptions {
  gatewayUrl: string
  /** Node only: inject the `ws` WebSocket implementation. Omit in the browser. */
  webSocketImpl?: typeof WebSocket
  /** Node only: inject a `fetch` implementation if the global isn't suitable. */
  fetchImpl?: typeof fetch
}

export interface ExecuteResult {
  outputs: CellOutput[]
  durationMs: number
  ok: boolean
}

function toText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.join('')
  return JSON.stringify(value)
}

function toTextRecord(data: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [mime, value] of Object.entries(data)) {
    out[mime] = toText(value)
  }
  return out
}

/** Translates one iopub message into our output model; returns null for message types we don't render (status, execute_input, ...). */
export function translateIOPubMessage(msg: KernelMessage.IIOPubMessage): CellOutput | null {
  if (KernelMessage.isStreamMsg(msg)) {
    return { type: 'stream', name: msg.content.name, text: toText(msg.content.text) }
  }
  if (KernelMessage.isExecuteResultMsg(msg)) {
    return { type: 'execute_result', data: toTextRecord(msg.content.data) }
  }
  if (KernelMessage.isDisplayDataMsg(msg)) {
    return { type: 'display_data', data: toTextRecord(msg.content.data) }
  }
  if (KernelMessage.isErrorMsg(msg)) {
    return { type: 'error', ename: msg.content.ename, evalue: msg.content.evalue, traceback: msg.content.traceback }
  }
  return null
}

/**
 * Thin wrapper around @jupyterlab/services for a single kernel session.
 * Works in the browser (native WebSocket/fetch) and in Node (inject `ws`).
 */
export class StridesKernelClient {
  private manager: KernelManager
  private kernel: Kernel.IKernelConnection | null = null

  private constructor(manager: KernelManager) {
    this.manager = manager
  }

  static async connect(options: KernelClientOptions): Promise<StridesKernelClient> {
    const url = new URL(options.gatewayUrl)
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:'

    const settings = ServerConnection.makeSettings({
      baseUrl: options.gatewayUrl,
      wsUrl: `${wsProtocol}//${url.host}`,
      init: { cache: 'no-store' },
      ...(options.webSocketImpl ? { WebSocket: options.webSocketImpl } : {}),
      ...(options.fetchImpl ? { fetch: options.fetchImpl } : {}),
    })

    const manager = new KernelManager({ serverSettings: settings })
    await manager.ready
    return new StridesKernelClient(manager)
  }

  get isStarted(): boolean {
    return this.kernel !== null && this.kernel.status !== 'dead'
  }

  /** Starts a fresh kernel (if not already started) and silently enables inline matplotlib figures. */
  async start(): Promise<void> {
    if (this.isStarted) return
    this.kernel = await this.manager.startNew({ name: 'python3' })
    await this.execute('%matplotlib inline', { silent: true })
  }

  async execute(code: string, opts: { onOutput?: (output: CellOutput) => void; silent?: boolean } = {}): Promise<ExecuteResult> {
    if (!this.kernel) throw new Error('strides: kernel not started; call start() first')

    const start = Date.now()
    const outputs: CellOutput[] = []
    let ok = true

    const future = this.kernel.requestExecute({ code, silent: opts.silent ?? false })
    future.onIOPub = (msg) => {
      const output = translateIOPubMessage(msg)
      if (!output) return
      if (output.type === 'error') ok = false
      outputs.push(output)
      opts.onOutput?.(output)
    }

    const reply = await future.done
    if (reply.content.status === 'error') ok = false

    return { outputs, durationMs: Date.now() - start, ok }
  }

  async restart(): Promise<void> {
    if (!this.kernel) return
    await this.kernel.restart()
    await this.execute('%matplotlib inline', { silent: true })
  }

  async shutdown(): Promise<void> {
    if (!this.kernel) return
    await this.kernel.shutdown()
    this.kernel = null
  }

  dispose(): void {
    this.manager.dispose()
  }
}
