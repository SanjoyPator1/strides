/** Modeled on Jupyter's output message types (spec 03 §3/§4). */
export type CellOutput =
  | { type: 'stream'; name: 'stdout' | 'stderr'; text: string }
  | { type: 'execute_result'; data: Record<string, string> }
  | { type: 'display_data'; data: Record<string, string> }
  | { type: 'error'; ename: string; evalue: string; traceback: string[] }

export type CellState = 'idle' | 'queued' | 'running' | 'ok' | 'error'
