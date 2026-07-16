import type { ReactNode } from 'react'
import 'katex/dist/katex.min.css'
import '../styles.css'
import type { StridesConfig } from '../config'
import { getSidebarTree } from '../content'
import { SiteChrome } from './SiteChrome'

export interface StridesLayoutProps {
  config: StridesConfig
  children: ReactNode
}

export function StridesLayout({ config, children }: StridesLayoutProps) {
  const tree = getSidebarTree(config)

  return (
    <SiteChrome title={config.title} tree={tree}>
      {children}
    </SiteChrome>
  )
}
