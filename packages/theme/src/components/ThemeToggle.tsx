'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <button type="button" className="strides-theme-toggle" aria-label="Toggle theme" />
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      className="strides-theme-toggle"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? '🌙' : '☀️'}
    </button>
  )
}
