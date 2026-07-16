// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Scene, Step } from './Scene'

function renderScene(autoPlayMs?: number) {
  return render(
    <Scene autoPlayMs={autoPlayMs}>
      <Step caption="Step one">
        <div>content-1</div>
      </Step>
      <Step caption="Step two">
        <div>content-2</div>
      </Step>
      <Step caption="Step three">
        <div>content-3</div>
      </Step>
    </Scene>,
  )
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Scene', () => {
  it('renders the first step initially', () => {
    renderScene()
    expect(screen.getByText('Step one')).toBeTruthy()
    expect(screen.getByText('content-1')).toBeTruthy()
  })

  it('advances to the next step on "Next"', () => {
    renderScene()
    fireEvent.click(screen.getByLabelText('Next step'))
    expect(screen.getByText('Step two')).toBeTruthy()
  })

  it('wraps around: "Previous" on the first step goes to the last step', () => {
    renderScene()
    fireEvent.click(screen.getByLabelText('Previous step'))
    expect(screen.getByText('Step three')).toBeTruthy()
  })

  it('jumps to a step via its dot', () => {
    renderScene()
    fireEvent.click(screen.getByLabelText('Go to step 3'))
    expect(screen.getByText('Step three')).toBeTruthy()
  })

  it('responds to arrow keys when the scene has focus', () => {
    renderScene()
    const scene = screen.getByText('Step one').closest('.strides-scene') as HTMLElement
    fireEvent.keyDown(scene, { key: 'ArrowRight' })
    expect(screen.getByText('Step two')).toBeTruthy()
    fireEvent.keyDown(scene, { key: 'ArrowLeft' })
    expect(screen.getByText('Step one')).toBeTruthy()
  })

  it('autoplays on an interval and pauses on manual interaction', () => {
    vi.useFakeTimers()
    renderScene(1000)

    fireEvent.click(screen.getByLabelText('Play'))
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('Step two')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Next step'))
    expect(screen.getByText('Step three')).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByText('Step three')).toBeTruthy()
  })
})
