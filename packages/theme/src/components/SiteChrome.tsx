'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeProvider } from 'next-themes'
import type { SidebarTree } from '../content'
import { ThemeToggle } from './ThemeToggle'

export interface SiteChromeProps {
  title: string
  tree: SidebarTree
  children: ReactNode
}

export function SiteChrome({ title, tree, children }: SiteChromeProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="strides-shell">
        <header className="strides-header">
          <button
            type="button"
            className="strides-sidebar-toggle"
            aria-label="Toggle sidebar"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            ☰
          </button>
          <span className="strides-title">{title}</span>
          <ThemeToggle />
        </header>
        <div className="strides-body">
          <nav className={sidebarOpen ? 'strides-sidebar strides-sidebar--open' : 'strides-sidebar'}>
            {tree.map((section) => (
              <div key={section.slug} className="strides-sidebar-section">
                <div className="strides-sidebar-section-title">{section.title}</div>
                <ul>
                  {section.pages.map((page) => {
                    const href = `/${page.slug}`
                    const isActive = pathname === href
                    return (
                      <li key={page.slug}>
                        <Link
                          href={href}
                          className={
                            isActive
                              ? 'strides-sidebar-link strides-sidebar-link--active'
                              : 'strides-sidebar-link'
                          }
                          aria-current={isActive ? 'page' : undefined}
                          onClick={() => setSidebarOpen(false)}
                        >
                          {page.title}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>
          <main className="strides-content">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  )
}
