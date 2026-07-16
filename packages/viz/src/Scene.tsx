'use client'

import { Children, isValidElement, useEffect, useState, type KeyboardEvent, type ReactElement, type ReactNode } from 'react'
import { LayoutGroup } from 'motion/react'

export interface StepProps {
  caption?: string
  children: ReactNode
}

/** Marker component: Scene reads a Step's children/caption directly, it renders nothing on its own. */
export function Step({ children }: StepProps) {
  return <>{children}</>
}

export interface SceneProps {
  children: ReactNode
  /** Advance to the next step every autoPlayMs while playing; omit to disable play/pause. */
  autoPlayMs?: number
}

export function Scene({ children, autoPlayMs }: SceneProps) {
  const steps = Children.toArray(children).filter((child): child is ReactElement<StepProps> => isValidElement(child))
  const stepCount = steps.length

  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)

  const goTo = (next: number) => {
    if (stepCount === 0) return
    setIndex(((next % stepCount) + stepCount) % stepCount)
  }

  const stopPlaying = () => setPlaying(false)
  const next = () => {
    stopPlaying()
    goTo(index + 1)
  }
  const prev = () => {
    stopPlaying()
    goTo(index - 1)
  }

  useEffect(() => {
    if (!playing || !autoPlayMs || stepCount === 0) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % stepCount), autoPlayMs)
    return () => clearInterval(timer)
  }, [playing, autoPlayMs, stepCount])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      next()
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      prev()
    }
  }

  if (stepCount === 0) return null

  const currentStep = steps[index]
  const caption = currentStep.props.caption

  return (
    <div className="strides-scene" tabIndex={0} onKeyDown={handleKeyDown}>
      <LayoutGroup>
        <div className="strides-scene-stage">{currentStep}</div>
      </LayoutGroup>

      {caption ? <p className="strides-scene-caption">{caption}</p> : null}

      <div className="strides-scene-controls">
        <button type="button" onClick={prev} aria-label="Previous step" className="strides-scene-button">
          ‹
        </button>

        <div className="strides-scene-dots">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              className={i === index ? 'strides-scene-dot strides-scene-dot--active' : 'strides-scene-dot'}
              aria-label={`Go to step ${i + 1}`}
              onClick={() => {
                stopPlaying()
                goTo(i)
              }}
            />
          ))}
        </div>

        <button type="button" onClick={next} aria-label="Next step" className="strides-scene-button">
          ›
        </button>

        {autoPlayMs ? (
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause' : 'Play'}
            className="strides-scene-button"
          >
            {playing ? '⏸' : '▶'}
          </button>
        ) : null}
      </div>
    </div>
  )
}
