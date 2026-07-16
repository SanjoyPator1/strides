'use client'

import { useEffect, useRef, useState } from 'react'
import { animate } from 'motion/react'

/** Tweens a displayed number toward `value` whenever it changes; snaps on first render. */
export function useAnimatedNumber(value: number, duration = 0.35): number {
  const [display, setDisplay] = useState(value)
  const previous = useRef(value)

  useEffect(() => {
    const from = previous.current
    previous.current = value
    if (from === value) return

    const controls = animate(from, value, {
      duration,
      onUpdate: (latest: number) => setDisplay(latest),
    })
    return () => controls.stop()
  }, [value, duration])

  return display
}
