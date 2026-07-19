'use client'

import { createContext, useContext, useId, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useAnchorRef, Arrow } from './Arrow'
import { Group } from './Group'

interface DetailRailContextValue {
  rail: HTMLDivElement | null
  setRail: (el: HTMLDivElement | null) => void
}

const DetailRailContext = createContext<DetailRailContextValue | null>(null)

export interface DetailRailProviderProps {
  children: ReactNode
}

/**
 * Establishes a shared drop target for every `<Detail>` inside it — place one `<DetailRail>`
 * next to your diagram (e.g. as a flex sibling) and every `<Detail>`'s expanded panel, no
 * matter how deeply nested its trigger is, portals its content there instead of expanding
 * in place.
 */
export function DetailRailProvider({ children }: DetailRailProviderProps) {
  const [rail, setRail] = useState<HTMLDivElement | null>(null)
  const value = useMemo(() => ({ rail, setRail }), [rail])
  return <DetailRailContext.Provider value={value}>{children}</DetailRailContext.Provider>
}

export interface DetailRailProps {
  className?: string
}

/** The drop target itself. Renders empty (zero-height) until a `<Detail>` expands into it. */
export function DetailRail({ className }: DetailRailProps) {
  const ctx = useContext(DetailRailContext)
  return <div ref={ctx?.setRail} className={className ? `strides-detail-rail ${className}` : 'strides-detail-rail'} />
}

export interface DetailProps {
  /** The node shown inline in the main diagram — clicking it toggles the detail panel. */
  summary: ReactNode
  /** Label shown above the detail content, once expanded. */
  label?: string
  color?: string
  /** The detail diagram/content, only rendered while expanded. */
  children: ReactNode
}

/**
 * A clickable node that reveals a connected detail diagram on demand — the "zoom into this
 * box" interaction from architecture references, made interactive instead of always-shown.
 * Needs a `<DetailRailProvider>`/`<DetailRail>` pair nearby to expand *beside* the main
 * diagram; without one, it falls back to expanding directly below its trigger.
 */
export function Detail({ summary, label, color, children }: DetailProps) {
  const [expanded, setExpanded] = useState(false)
  const id = useId().replace(/:/g, '')
  const triggerName = `detail-trigger-${id}`
  const panelName = `detail-panel-${id}`
  const triggerRef = useAnchorRef(triggerName)
  const panelRef = useAnchorRef(panelName)
  const rail = useContext(DetailRailContext)?.rail ?? null

  const panel = (
    <motion.div
      key={panelName}
      ref={panelRef}
      className="strides-detail-panel"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.15 }}
    >
      <Group label={label} color={color}>
        {children}
      </Group>
    </motion.div>
  )

  // AnimatePresence clones its direct children to track enter/exit, which breaks if that
  // child is a portal (not a plain element) — so the portal wraps the whole
  // <AnimatePresence>, rather than the other way around, and stays mounted consistently
  // across renders so its exit animation actually gets a chance to run.
  const presence = <AnimatePresence>{expanded ? panel : null}</AnimatePresence>

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={expanded ? 'strides-detail-trigger strides-detail-trigger--open' : 'strides-detail-trigger'}
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        {summary}
        <span className="strides-detail-caret" aria-hidden="true">
          {expanded ? '−' : '+'}
        </span>
      </button>
      {rail ? createPortal(presence, rail) : presence}
      {expanded ? <Arrow from={triggerName} to={panelName} path="straight" dashed /> : null}
    </>
  )
}
