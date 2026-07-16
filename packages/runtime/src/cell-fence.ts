import type { Code } from 'mdast'

/** True if a fence's meta string contains the `cell` token (e.g. ` ```python cell `). */
export function isCellFence(node: Code): boolean {
  const tokens = (node.meta ?? '').split(/\s+/).filter(Boolean)
  return tokens.includes('cell')
}

/** Only `python cell` fences are supported in MVP; throws for any other language. */
export function assertPythonCellFence(node: Code): void {
  if (node.lang !== 'python') {
    throw new Error(
      `strides: only \`\`\`python cell\`\`\` fences are supported, got \`\`\`${node.lang ?? ''} cell\`\`\`. ` +
        `Use a plain \`\`\`${node.lang ?? ''}\`\`\` fence for static (non-executed) code in other languages.`,
    )
  }
}
