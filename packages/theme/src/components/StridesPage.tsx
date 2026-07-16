import { notFound, redirect } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote-client/rsc'
import type { MDXComponents } from 'next-mdx-remote-client/rsc'
import remarkGfm from 'remark-gfm'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypePrettyCode from 'rehype-pretty-code'
import type { StridesConfig } from '../config'
import { getContentSlugs, loadPage } from '../content'

export interface StridesPageProps {
  /** Page slug, e.g. "getting-started/01-welcome". Undefined for the site root. */
  slug?: string
  config: StridesConfig
  /** MDX component map. Empty until viz components are registered (Phase 3). */
  components?: MDXComponents
}

export async function StridesPage({ slug, config, components = {} }: StridesPageProps) {
  if (slug === undefined) {
    const firstSlug = getContentSlugs(config)[0]
    if (!firstSlug) notFound()
    redirect(`/${firstSlug}`)
  }

  const page = loadPage(slug, config)
  if (!page) notFound()

  return (
    <article className="strides-page">
      <h1>{page.frontmatter.title}</h1>
      <MDXRemote
        source={page.content}
        components={components}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm, remarkFrontmatter, remarkMath],
            rehypePlugins: [
              rehypeKatex,
              [rehypePrettyCode, { theme: { light: 'github-light', dark: 'github-dark' }, keepBackground: false }],
            ],
          },
        }}
      />
    </article>
  )
}
