import { useEffect, useRef } from 'react'

const EDGE_PX = 60
const MAX_SPEED_PX = 12

/**
 * While `active`, scrolls the window when the pointer approaches the
 * top/bottom viewport edge — lets a drag-reorder keep moving through a
 * list taller than the screen. Speed ramps from 0 at 60px to max at the
 * very edge.
 */
export function useEdgeAutoScroll(active: boolean) {
  const pointerY = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return
    const onPointerMove = (e: PointerEvent) => {
      pointerY.current = e.clientY
    }
    window.addEventListener('pointermove', onPointerMove)

    let raf = requestAnimationFrame(function tick() {
      const y = pointerY.current
      if (y !== null) {
        if (y < EDGE_PX) {
          window.scrollBy(0, -MAX_SPEED_PX * (1 - y / EDGE_PX))
        } else if (y > window.innerHeight - EDGE_PX) {
          window.scrollBy(0, MAX_SPEED_PX * (1 - (window.innerHeight - y) / EDGE_PX))
        }
      }
      raf = requestAnimationFrame(tick)
    })

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      cancelAnimationFrame(raf)
      pointerY.current = null
    }
  }, [active])
}
