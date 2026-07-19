import type { ReactNode } from 'react'
import { StridesLayout } from '@strides/theme'
import config from '../strides.config'

export const metadata = {
  title: { default: config.title, template: `%s | ${config.title}` },
  description: config.description,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <StridesLayout config={config}>{children}</StridesLayout>
      </body>
    </html>
  )
}
