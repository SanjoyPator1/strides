import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

export interface ContentPage {
  /** Slug relative to contentDir, e.g. "getting-started/01-welcome". */
  slug: string
  /** MDX source with the frontmatter block stripped. */
  mdxBody: string
}

/**
 * Recursively finds every .mdx file under contentDir. Unlike @strides/theme's sidebar
 * tree, this has no notion of sections/ordering/titles — it just needs a flat list of
 * (slug, source) pairs to drive `strides snapshot`, so it's kept independent of theme.
 */
export function findContentPages(contentDir: string): ContentPage[] {
  const root = path.resolve(process.cwd(), contentDir)
  if (!fs.existsSync(root)) return []

  const pages: ContentPage[] = []

  function walk(dir: string, slugPrefix: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(entryPath, slugPrefix ? `${slugPrefix}/${entry.name}` : entry.name)
        continue
      }
      if (!entry.isFile() || !entry.name.endsWith('.mdx')) continue

      const baseName = entry.name.slice(0, -'.mdx'.length)
      const slug = slugPrefix ? `${slugPrefix}/${baseName}` : baseName
      const raw = fs.readFileSync(entryPath, 'utf8')
      const { content } = matter(raw)
      pages.push({ slug, mdxBody: content })
    }
  }

  walk(root, '')
  return pages.sort((a, b) => a.slug.localeCompare(b.slug))
}
