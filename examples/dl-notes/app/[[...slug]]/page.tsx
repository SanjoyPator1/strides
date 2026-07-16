import { StridesPage, getContentSlugs, loadPage } from '@strides/theme'
import config from '../../strides.config'

export async function generateStaticParams() {
  return getContentSlugs(config).map((slug) => ({ slug: slug.split('/') }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>
}) {
  const { slug } = await params
  const page = slug ? loadPage(slug.join('/'), config) : null
  if (!page) return {}

  return {
    title: page.frontmatter.title,
    description: page.frontmatter.description ?? config.description,
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>
}) {
  const { slug } = await params
  return <StridesPage slug={slug?.join('/')} config={config} />
}
