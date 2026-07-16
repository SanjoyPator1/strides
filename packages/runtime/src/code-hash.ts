import { createHash } from 'node:crypto'

/** Hash of an exact cell fence's source, used to detect stale frozen output. Server-only. */
export function hashCode(code: string): string {
  return `sha256:${createHash('sha256').update(code, 'utf8').digest('hex')}`
}
