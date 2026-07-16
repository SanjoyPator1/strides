import type { MDXComponents } from 'mdx/types'
import type { PageSnapshot } from '../snapshot-types'
import { PyCell } from './PyCell'

/**
 * Binds the current page's snapshot to `PyCell` in the MDX component map.
 *
 * This is a plain function, not a React context: MDX invokes components from
 * the component map directly by name at each fence site, arbitrarily deep in
 * the tree, so the component map is the only point where per-page data (the
 * snapshot) can reach a `PyCell` instance server-side.
 */
export function SnapshotProvider(components: MDXComponents, snapshot: PageSnapshot | null): MDXComponents {
  return {
    ...components,
    PyCell: (props: { code: string; index: string }) => <PyCell {...props} snapshot={snapshot} />,
  }
}
