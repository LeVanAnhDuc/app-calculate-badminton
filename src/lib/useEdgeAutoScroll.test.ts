import { renderHook } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { useEdgeAutoScroll } from './useEdgeAutoScroll'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubRaf() {
  let tick: FrameRequestCallback = () => {}
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    tick = cb
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  return () => tick(0)
}

test('scrolls up when the pointer is near the top edge while active', () => {
  const scrollBy = vi.fn()
  vi.stubGlobal('scrollBy', scrollBy)
  const runTick = stubRaf()

  renderHook(() => useEdgeAutoScroll(true))
  // jsdom lacks a PointerEvent constructor; MouseEvent carries clientY fine
  window.dispatchEvent(new MouseEvent('pointermove', { clientY: 10 }))
  runTick()

  expect(scrollBy).toHaveBeenCalled()
  expect(scrollBy.mock.calls[0][1]).toBeLessThan(0)
})

test('does not scroll when the pointer is mid-screen', () => {
  const scrollBy = vi.fn()
  vi.stubGlobal('scrollBy', scrollBy)
  const runTick = stubRaf()

  renderHook(() => useEdgeAutoScroll(true))
  window.dispatchEvent(new MouseEvent('pointermove', { clientY: window.innerHeight / 2 }))
  runTick()

  expect(scrollBy).not.toHaveBeenCalled()
})

test('does nothing while inactive', () => {
  const scrollBy = vi.fn()
  vi.stubGlobal('scrollBy', scrollBy)
  const runTick = stubRaf()

  renderHook(() => useEdgeAutoScroll(false))
  window.dispatchEvent(new MouseEvent('pointermove', { clientY: 10 }))
  runTick()

  expect(scrollBy).not.toHaveBeenCalled()
})
