import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { visit } from 'unist-util-visit'
import type { Root, Code } from 'mdast'
import { assertPythonCellFence, isCellFence } from './cell-fence'

/** Extracts `python cell` fence sources from an MDX body, in document order. Node-only. */
export function extractCells(mdxBody: string): string[] {
  const tree = unified().use(remarkParse).parse(mdxBody) as Root
  const cells: string[] = []

  visit(tree, 'code', (node: Code) => {
    if (!isCellFence(node)) return
    assertPythonCellFence(node)
    cells.push(node.value)
  })

  return cells
}
