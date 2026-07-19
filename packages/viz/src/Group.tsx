'use client'

import type { ReactNode } from 'react'

export interface GroupProps {
  children: ReactNode
  label?: string
  /** Background color for the region; defaults to the theme's neutral surface color. */
  color?: string
  className?: string
  /** Shows a brace + "× N" annotation beside the group — e.g. a block stacked N times. */
  repeat?: number
}

/** A colored background region clustering related nodes — the pastel panels behind a group of boxes. */
export function Group({ children, label, color, className, repeat }: GroupProps) {
  const body = (
    <div className={className ? `strides-node-group ${className}` : 'strides-node-group'} style={{ background: color }}>
      {label ? <div className="strides-node-group-label">{label}</div> : null}
      <div className="strides-node-group-content">{children}</div>
    </div>
  )

  if (repeat === undefined) return body

  return (
    <div className="strides-node-group-repeat-wrap">
      <div className="strides-node-group-repeat" aria-hidden="true">
        <span className="strides-node-group-repeat-brace">{'{'}</span>
        <span className="strides-node-group-repeat-label">× {repeat}</span>
      </div>
      {body}
    </div>
  )
}
