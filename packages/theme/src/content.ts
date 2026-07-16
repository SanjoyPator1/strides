import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import type { StridesConfig } from './config'

export interface PageMeta {
  /** Full slug, e.g. "getting-started/01-welcome". Includes numeric prefixes. */
  slug: string
  title: string
  order: number
}

export interface SectionMeta {
  /** Section folder name, e.g. "getting-started". */
  slug: string
  title: string
  order: number
  pages: PageMeta[]
}

export type SidebarTree = SectionMeta[]

export interface LoadedPage {
  slug: string
  frontmatter: {
    title: string
    description?: string
  }
  /** MDX source with the frontmatter block already stripped. */
  content: string
}

const NUMERIC_PREFIX_RE = /^(\d+)-(.+)$/

/** Splits a "01-my-page" style name into its sort order and the remaining name. */
export function parseOrderPrefix(name: string): { order: number; rest: string } {
  const match = NUMERIC_PREFIX_RE.exec(name)
  if (match) {
    return { order: Number(match[1]), rest: match[2] }
  }
  return { order: Number.POSITIVE_INFINITY, rest: name }
}

/** "my-cool-page" -> "My Cool Page" */
export function kebabToTitleCase(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** Default title for a file/folder name: strip numeric prefix, kebab -> Title Case. */
export function deriveTitle(name: string): string {
  return kebabToTitleCase(parseOrderPrefix(name).rest)
}

interface Orderable {
  order: number
  sortKey: string
}

/** Numeric-prefix-first, then alphabetical by the remaining name. */
export function compareOrderable(a: Orderable, b: Orderable): number {
  if (a.order !== b.order) return a.order - b.order
  return a.sortKey.localeCompare(b.sortKey)
}

function contentRoot(config: StridesConfig): string {
  return path.resolve(process.cwd(), config.contentDir ?? 'content')
}

export function getSidebarTree(config: StridesConfig): SidebarTree {
  const root = contentRoot(config)
  if (!fs.existsSync(root)) return []

  const sections = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((dir): SectionMeta & { sortKey: string } => {
      const { order, rest } = parseOrderPrefix(dir.name)
      const sectionPath = path.join(root, dir.name)

      const pages = fs
        .readdirSync(sectionPath, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.mdx'))
        .map((file): PageMeta & { sortKey: string } => {
          const baseName = file.name.slice(0, -'.mdx'.length)
          const { order: pageOrder, rest: pageRest } = parseOrderPrefix(baseName)
          const raw = fs.readFileSync(path.join(sectionPath, file.name), 'utf8')
          const { data } = matter(raw)
          const title = typeof data.title === 'string' ? data.title : kebabToTitleCase(pageRest)
          return { slug: `${dir.name}/${baseName}`, title, order: pageOrder, sortKey: pageRest }
        })
        .sort(compareOrderable)
        .map(({ sortKey: _sortKey, ...page }) => page)

      return { slug: dir.name, title: deriveTitle(dir.name), order, pages, sortKey: rest }
    })
    .sort(compareOrderable)
    .map(({ sortKey: _sortKey, ...section }) => section)

  return sections
}

export function getContentSlugs(config: StridesConfig): string[] {
  return getSidebarTree(config).flatMap((section) => section.pages.map((page) => page.slug))
}

export function loadPage(slug: string, config: StridesConfig): LoadedPage | null {
  const root = contentRoot(config)
  const filePath = path.resolve(root, `${slug}.mdx`)

  if (!filePath.startsWith(root + path.sep) || !fs.existsSync(filePath)) {
    return null
  }

  const raw = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(raw)
  const baseName = path.basename(slug)

  return {
    slug,
    frontmatter: {
      title: typeof data.title === 'string' ? data.title : deriveTitle(baseName),
      description: typeof data.description === 'string' ? data.description : undefined,
    },
    content,
  }
}
