import { visit } from 'unist-util-visit'
import type { Root, Code } from 'mdast'
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx'
import { assertPythonCellFence, isCellFence } from './cell-fence'

/**
 * Transforms ` ```python cell ` fences into `<PyCell code={...} index={...} />`.
 * Cell index is assigned in document order, 0-based, counting only cell fences.
 * Errors on `cell` fences whose language isn't `python` (only python is supported in MVP).
 */
export function remarkCellPlugin() {
  return (tree: Root) => {
    let cellIndex = 0

    visit(tree, 'code', (node: Code, index, parent) => {
      if (!isCellFence(node)) return
      assertPythonCellFence(node)

      if (!parent || typeof index !== 'number') return

      const element: MdxJsxFlowElement = {
        type: 'mdxJsxFlowElement',
        name: 'PyCell',
        attributes: [
          { type: 'mdxJsxAttribute', name: 'code', value: node.value },
          { type: 'mdxJsxAttribute', name: 'index', value: String(cellIndex) },
        ],
        children: [],
      }

      cellIndex += 1
      parent.children[index] = element
    })
  }
}
