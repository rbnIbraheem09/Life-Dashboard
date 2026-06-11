import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../lib/cn'

type Direction = 'vertical' | 'horizontal'

type ScrollAreaProps = {
  children: ReactNode
  /** ClassName for the outer (clipping) container — carries layout sizing. */
  className?: string
  /** ClassName for the inner content wrapper. Lets a caller make the
   *  content fill the viewport and center its child (e.g.
   *  `min-h-full flex flex-col` + a `my-auto` child) without the
   *  scrolled component having to know about it. */
  contentClassName?: string
  /** Scroll direction. Defaults to 'vertical'. */
  direction?: Direction
}

/**
 * ScrollArea — NATIVE scrolling with a thin custom thumb.
 *
 * The OS does the actual scrolling (overflow:auto → real trackpad
 * momentum + inertia). We only DRAW a thin thumb, positioned from the
 * element's real scrollTop/scrollLeft on the native `scroll` event. No
 * wheel hijacking, no transform — the inversion that made the old
 * version janky.
 *
 * Hiding the native bar is self-adjusting and cannot leak the grey bar:
 *   1. `.iz-noscroll` sets `::-webkit-scrollbar { display: none }`.
 *   2. We measure the bar's reserved size (offset − client). If the
 *      WebView ignored (1) and still reserves space, we widen the
 *      scroller by exactly that much; the outer `overflow:hidden`
 *      clips the native bar out of the visible region. Pure geometry.
 *
 * `overscroll-behavior: contain` stops a scroll from chaining out to
 * the document — no whole-window rubber-band.
 */
export function ScrollArea({
  children,
  className,
  contentClassName,
  direction = 'vertical',
}: ScrollAreaProps) {
  const isVertical = direction === 'vertical'
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)

  const [thumb, setThumb] = useState<{ size: number; offset: number } | null>(
    null,
  )
  const [active, setActive] = useState(false)
  const fadeTimer = useRef<number | null>(null)

  // Recompute the thumb from the scroller's real scroll metrics.
  function recompute() {
    const el = scrollerRef.current
    if (!el) return
    const client = isVertical ? el.clientHeight : el.clientWidth
    const total = isVertical ? el.scrollHeight : el.scrollWidth
    const pos = isVertical ? el.scrollTop : el.scrollLeft
    if (total <= client + 1) {
      setThumb(null)
      return
    }
    const size = Math.max(24, (client / total) * client)
    const offset = (pos / (total - client)) * (client - size)
    setThumb({ size, offset })
  }

  // If the native bar reserves space (WebView ignored display:none),
  // widen the scroller by exactly that much so the outer overflow:hidden
  // clips the bar away. Guarded so it can't loop in the ResizeObserver.
  function fitNativeBar() {
    const el = scrollerRef.current
    if (!el) return
    if (isVertical) {
      const barW = el.offsetWidth - el.clientWidth
      const next = barW > 0 ? `calc(100% + ${barW}px)` : '100%'
      if (el.style.width !== next) el.style.width = next
    } else {
      const barH = el.offsetHeight - el.clientHeight
      const next = barH > 0 ? `calc(100% + ${barH}px)` : '100%'
      if (el.style.height !== next) el.style.height = next
    }
  }

  useEffect(() => {
    const el = scrollerRef.current
    const content = contentRef.current
    if (!el || !content) return
    fitNativeBar()
    recompute()
    const ro = new ResizeObserver(() => {
      fitNativeBar()
      recompute()
    })
    ro.observe(el)
    ro.observe(content)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVertical])

  function onScroll() {
    recompute()
    setActive(true)
    if (fadeTimer.current !== null) window.clearTimeout(fadeTimer.current)
    fadeTimer.current = window.setTimeout(() => setActive(false), 700)
  }

  useEffect(() => {
    return () => {
      if (fadeTimer.current !== null) window.clearTimeout(fadeTimer.current)
    }
  }, [])

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className={cn(
          'iz-noscroll h-full w-full',
          isVertical
            ? 'overflow-y-auto overflow-x-hidden'
            : 'overflow-x-auto overflow-y-hidden',
        )}
        style={{ overscrollBehavior: 'contain' }}
      >
        <div
          ref={contentRef}
          className={contentClassName}
          style={
            isVertical ? undefined : { width: 'max-content', minWidth: '100%' }
          }
        >
          {children}
        </div>
      </div>

      {thumb && (
        <div
          className={cn(
            'absolute rounded-full pointer-events-none z-10',
            'transition-opacity duration-[var(--motion-mid)] ease-out',
            isVertical ? 'right-[3px] w-[4px]' : 'bottom-[3px] h-[4px]',
            active
              ? 'opacity-100 bg-[color-mix(in_srgb,var(--text-dim)_70%,transparent)]'
              : 'opacity-50 bg-[color-mix(in_srgb,var(--text-muted)_45%,transparent)]',
          )}
          style={
            isVertical
              ? {
                  top: 0,
                  height: `${thumb.size}px`,
                  transform: `translateY(${thumb.offset}px)`,
                }
              : {
                  left: 0,
                  width: `${thumb.size}px`,
                  transform: `translateX(${thumb.offset}px)`,
                }
          }
        />
      )}
    </div>
  )
}
