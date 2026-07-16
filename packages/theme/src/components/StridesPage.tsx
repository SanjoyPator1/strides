import { notFound, redirect } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote-client/rsc'
import type { MDXComponents } from 'next-mdx-remote-client/rsc'
import remarkGfm from 'remark-gfm'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypePrettyCode from 'rehype-pretty-code'
import { remarkCellPlugin, loadPageSnapshot, SnapshotProvider, KernelProvider, KernelStatusBar } from '@strides/runtime'
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

  const snapshot = loadPageSnapshot(slug, config)
  const mdxComponents = SnapshotProvider(components, snapshot)
  const gatewayUrl = process.env.NEXT_PUBLIC_STRIDES_KERNEL_URL

  const article = (
    <article className="strides-page">
      <h1>{page.frontmatter.title}</h1>
      {gatewayUrl ? <KernelStatusBar /> : null}
      <MDXRemote
        source={page.content}
        components={mdxComponents}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm, remarkFrontmatter, remarkMath, remarkCellPlugin],
            rehypePlugins: [
              rehypeKatex,
              [rehypePrettyCode, { theme: { light: 'github-light', dark: 'github-dark' }, keepBackground: false }],
            ],
          },
        }}
      />
    </article>
  )

  return gatewayUrl ? <KernelProvider gatewayUrl={gatewayUrl}>{article}</KernelProvider> : article
}
