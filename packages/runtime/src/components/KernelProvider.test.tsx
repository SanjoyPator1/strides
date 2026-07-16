// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { KernelProvider, useKernel } from './KernelProvider'

function StatusProbe() {
  const kernel = useKernel()
  return <div data-testid="status">{kernel?.status ?? 'no-provider'}</div>
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('KernelProvider', () => {
  it('propagates a successful health check to consumers (checking -> ready)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response)

    render(
      <KernelProvider gatewayUrl="http://127.0.0.1:1234">
        <StatusProbe />
      </KernelProvider>,
    )

    expect(screen.getByTestId('status').textContent).toBe('checking')

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByTestId('status').textContent).toBe('ready')
  })

  it('propagates a failed health check to consumers (checking -> unavailable)', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'))

    render(
      <KernelProvider gatewayUrl="http://127.0.0.1:1234">
        <StatusProbe />
      </KernelProvider>,
    )

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByTestId('status').textContent).toBe('unavailable')
  })

  it('is null for a consumer outside any KernelProvider (published mode)', () => {
    render(<StatusProbe />)
    expect(screen.getByTestId('status').textContent).toBe('no-provider')
  })
})
