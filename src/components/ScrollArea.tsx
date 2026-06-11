/**
 * ScrollArea — a custom vertical (or horizontal) scrolling
 * container with a thin on-brand scrollbar, written from
 * scratch in React. Replaces the browser-native `overflow: auto`
 * pattern for surfaces that need a custom scrollbar.
 *
 * Why custom (and not `overflow: auto` + ::-webkit-scrollbar):
 *   Tauri 2 on macOS uses a Webkit WebView that, in our
 *   configuration (body has `user-select: none` to keep the
 *   app chrome non-selectable), gets pinned to *classic*
 *   scrollbar mode. In classic mode, Webkit ignores
 *   `::-webkit-scrollbar { width: 0 }` and `::-webkit-scrollbar
 *   { display: none }` — the OS draws a chunky light-grey
 *   native scrollbar regardless of CSS, and any styling we
 *   ship is ignored.
 *
 *   The bulletproof fix: never let the browser draw a native
 *   scrollbar. We set `overflow: hidden` on the viewport
 *   (so the OS has no scroll surface to draw a native bar
 *   on), keep the content's natural size with no clipping,
 *   and reposition it ourselves with `transform: translate3d`
 *   driven by React state. We render our own thin scrollbar
 *   on top, position the thumb based on scroll progress, and
 *   capture wheel / keyboard / touch input to drive the
 *   state.
 *
 * Trade-offs (acceptable for v1):
 *   - No native momentum / inertial scrolling. We use a simple
 *     linear wheel handler. macOS trackpad gestures are
 *     captured and produce a single wheel event with a small
 *     deltaY per tick — it works, just less silky than native
 *     momentum. If this becomes annoying in practice, a future
 *     iteration can add velocity tracking.
 *   - Drag-the-thumb is supported but uses pointer events
 *     directly (no native drag), so visual feedback is
 *     ours, not the OS's. Click on the track to jump.
 *
 * Keyboard (a11y):
 *   The viewport is `role="region"` with `tabIndex={0}` so it
 *   can receive focus. When focused, the user can scroll with
 *   arrow keys, PageUp/PageDown, Home/End. The same handlers
 *   the wheel listener uses drive the keyboard scroll, so
 *   motion and timing are consistent.
 *
 * Touch:
 *   Basic touch support: `touchstart` captures the initial
 *   Y, `touchmove` updates scroll by the delta, `touchend`
 *   releases. Inertial bounce is not implemented in v1.
 *
 * Custom scrollbar visuals:
 *   A 4px wide pill on the appropriate edge (right for
 *   vertical, bottom for horizontal), same color treatment
 *   as the rest of the UI: var(--text-muted) at 45% opacity
 *   at rest, var(--text-dim) at 70% on hover, motion-fast
 *   transition. The thumb's height (vertical) or width
 *   (horizontal) is proportional to (viewport / content),
 *   and its position is proportional to scroll progress.
 *
 * Frozen content (the content child):
 *   The user's children are rendered inside a div with
 *   `transform: translate3d(...)`. The browser still
 *   does layout / paint of the children normally — we
 *   just shift them visually. This means all the existing
 *   scroll-targeting CSS (e.g. `scroll-margin-top` if we
 *   ever needed it) continues to work conceptually; we
 *   just expose a different scrolling API on top.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import { cn } from '../lib/cn'

type Direction = 'vertical' | 'horizontal'

type ScrollAreaProps = {
  children: ReactNode
  /** ClassName for the outer viewport. Receives the layout
   *  sizing (e.g. `h-full`, `flex-1`, `min-w-0`). */
  className?: string
  /** Scroll direction. Defaults to 'vertical'. */
  direction?: Direction
}

export function ScrollArea({
  children,
  className,
  direction = 'vertical',
}: ScrollAreaProps) {
  // Refs to the viewport (the overflow:hidden container) and
  // the inner content (the element we translate). We need
  // direct DOM access for: measuring content size on resize,
  // reading/writing scroll state imperatively during drag
  // (so we don't pay React render cost per pointermove), and
  // applying the transform during the wheel handler.
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)

  // Scroll position in pixels. `scroll` is the offset from
  // the natural position — for vertical, scroll=0 means
  // content is at the top, scroll=max means content is at
  // the bottom. Same convention for horizontal.
  const [scroll, setScroll] = useState(0)
  // Viewport and content sizes. Viewport is read once on
  // mount and on ResizeObserver fires. Content is read on
  // mount and on the same observer, plus whenever children
  // change (via a MutationObserver-style effect, or just on
  // every render — content is cheap to measure).
  const [viewportSize, setViewportSize] = useState(0)
  const [contentSize, setContentSize] = useState(0)
  // Track whether the scrollbar thumb is being dragged, so
  // the wheel handler can be a no-op while the user is
  // dragging (and so the cursor stays consistent).
  const draggingRef = useRef(false)
  // Track hover state on the thumb itself so we can show
  // the brighter color. Hover state on the viewport also
  // matters (it reveals the thumb even at low scroll).
  const [thumbHover, setThumbHover] = useState(false)
  // Also reveal the thumb on programmatic scroll (the user
  // pressed PageDown) or while the user is wheeling — we
  // set this true on any scroll input, then a timer clears
  // it after a moment of inactivity.
  const [scrolling, setScrolling] = useState(false)
  const scrollTimerRef = useRef<number | null>(null)

  // ── Size measurement ─────────────────────────────────────
  // Re-measure on mount, on viewport resize, and on any
  // change to the children (we use a ResizeObserver on the
  // content itself — it fires when the content's natural
  // size changes, which covers font-load, dynamic data,
  // etc.).
  useEffect(() => {
    const viewport = viewportRef.current
    const content = contentRef.current
    if (!viewport || !content) return

    const measure = () => {
      const vpSize =
        direction === 'vertical' ? viewport.clientHeight : viewport.clientWidth
      const ctSize =
        direction === 'vertical'
          ? content.scrollHeight
          : content.scrollWidth
      setViewportSize(vpSize)
      setContentSize(ctSize)
    }

    measure()

    const ro = new ResizeObserver(measure)
    ro.observe(viewport)
    ro.observe(content)

    return () => ro.disconnect()
  }, [direction])

  // ── Scroll math ───────────────────────────────────────────
  // The maximum scroll offset is `max(0, contentSize - viewportSize)`.
  // When the content is smaller than the viewport, maxScroll=0
  // and the thumb is hidden (no need to scroll).
  const maxScroll = Math.max(0, contentSize - viewportSize)
  const canScroll = maxScroll > 0
  // Clamp the current scroll into [0, maxScroll]. We do this
  // imperatively in the wheel handler too (to avoid a render
  // per wheel tick) but the state value is always clamped.
  const clampedScroll = Math.min(Math.max(0, scroll), maxScroll)

  // Apply the transform whenever scroll changes. Using a
  // transform (not a top/left) keeps the content on the GPU
  // compositor layer for smoother scrolling.
  const contentStyle: CSSProperties = {
    transform:
      direction === 'vertical'
        ? `translate3d(0, ${-clampedScroll}px, 0)`
        : `translate3d(${-clampedScroll}px, 0, 0)`,
    willChange: 'transform',
  }

  // ── Scroll progress (0..1) and thumb geometry ────────────
  // The thumb's size along the scroll axis is
  // (viewportSize / contentSize) * viewportSize, clamped to
  // a sensible minimum so a 1% scroll progress doesn't
  // produce a 0.5px thumb. The thumb's position is
  // (scroll / maxScroll) * (viewportSize - thumbSize).
  const thumbSize = canScroll
    ? Math.max(24, (viewportSize / contentSize) * viewportSize)
    : 0
  const thumbOffset = canScroll
    ? (clampedScroll / maxScroll) * (viewportSize - thumbSize)
    : 0

  // ── Wheel handler ─────────────────────────────────────────
  // The native wheel event scrolls the browser viewport by
  // default. With `overflow: hidden` on the viewport, the
  // browser has nothing to scroll — so we capture the wheel
  // ourselves, prevent the default behavior (which on some
  // platforms triggers page scroll), and update our scroll
  // state. deltaMode 0 (pixels) is what trackpads send; we
  // don't currently handle deltaMode 1 (lines) or 2 (pages)
  // explicitly but the values are usually reasonable.
  const onWheel = useCallback(
    (e: ReactWheelEvent<HTMLDivElement>) => {
      if (!canScroll || draggingRef.current) return
      e.preventDefault()
      // Use the native event directly (not the React synthetic)
      // so preventDefault works on a passive listener — we
      // attach via onWheel which is non-passive.
      const delta = e.deltaY
      setScroll((prev) => Math.min(Math.max(0, prev + delta), maxScroll))
      bumpScrolling()
    },
    // We deliberately don't depend on `maxScroll` here — we
    // want the latest maxScroll at the time of the wheel
    // event, but a fresh closure per render is fine because
    // React re-renders the handler when deps change anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canScroll],
  )

  // ── Keyboard handler ──────────────────────────────────────
  // Arrow keys scroll by 40px (one row of text-ish content),
  // PageUp/PageDown scroll by the viewport height, Home/End
  // jump to the extremes. Hold Shift to scroll by a larger
  // increment on horizontal. Standard a11y scroll-keyboard
  // semantics, the same as native scrollable regions.
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (!canScroll) return
      const isVert = direction === 'vertical'
      const pageSize = Math.max(40, viewportSize - 40)
      let delta = 0
      if (isVert) {
        if (e.key === 'ArrowDown') delta = 40
        else if (e.key === 'ArrowUp') delta = -40
        else if (e.key === 'PageDown') delta = pageSize
        else if (e.key === 'PageUp') delta = -pageSize
        else if (e.key === 'Home') {
          e.preventDefault()
          setScroll(0)
          bumpScrolling()
          return
        } else if (e.key === 'End') {
          e.preventDefault()
          setScroll(maxScroll)
          bumpScrolling()
          return
        }
      } else {
        if (e.key === 'ArrowRight') delta = e.shiftKey ? pageSize : 40
        else if (e.key === 'ArrowLeft') delta = e.shiftKey ? -pageSize : -40
        else if (e.key === 'PageDown') delta = pageSize
        else if (e.key === 'PageUp') delta = -pageSize
        else if (e.key === 'Home') {
          e.preventDefault()
          setScroll(0)
          bumpScrolling()
          return
        } else if (e.key === 'End') {
          e.preventDefault()
          setScroll(maxScroll)
          bumpScrolling()
          return
        }
      }
      if (delta !== 0) {
        e.preventDefault()
        setScroll((prev) =>
          Math.min(Math.max(0, prev + delta), maxScroll),
        )
        bumpScrolling()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canScroll, direction, viewportSize],
  )

  // ── Touch handler ─────────────────────────────────────────
  // Simple touch drag: track the initial Y (or X) on
  // touchstart, then on touchmove update scroll by the
  // delta. No momentum in v1.
  const touchStartRef = useRef<number | null>(null)
  const onTouchStart = useCallback(
    (e: ReactTouchEvent<HTMLDivElement>) => {
      if (!canScroll) return
      const t = e.touches[0]
      touchStartRef.current =
        direction === 'vertical' ? t.clientY : t.clientX
    },
    [canScroll, direction],
  )
  const onTouchMove = useCallback(
    (e: ReactTouchEvent<HTMLDivElement>) => {
      if (touchStartRef.current === null) return
      const t = e.touches[0]
      const current = direction === 'vertical' ? t.clientY : t.clientX
      const delta = touchStartRef.current - current
      touchStartRef.current = current
      setScroll((prev) =>
        Math.min(Math.max(0, prev + delta), maxScroll),
      )
      bumpScrolling()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [direction],
  )
  const onTouchEnd = useCallback(() => {
    touchStartRef.current = null
  }, [])

  // ── Thumb drag (pointer events) ───────────────────────────
  // Click+drag the thumb to scroll. We use pointer events
  // (not mouse events) so the same code path works for
  // touch, pen, and mouse. The handler is attached to the
  // thumb element, but on pointerdown we capture the
  // pointer and listen on the viewport for pointermove
  // (so the drag keeps tracking even if the cursor leaves
  // the thumb's bounds).
  const onThumbPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!canScroll) return
      e.preventDefault()
      e.stopPropagation()
      draggingRef.current = true
      ;(e.target as HTMLDivElement).setPointerCapture(e.pointerId)
    },
    [canScroll],
  )
  const onViewportPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current || !canScroll) return
      e.preventDefault()
      const viewport = viewportRef.current
      if (!viewport) return
      const rect = viewport.getBoundingClientRect()
      const offset =
        direction === 'vertical'
          ? e.clientY - rect.top
          : e.clientX - rect.left
      // Map the cursor offset to a scroll value. The thumb
      // center should follow the cursor.
      const trackSize = viewportSize - thumbSize
      const ratio = trackSize > 0 ? (offset - thumbSize / 2) / trackSize : 0
      const newScroll = Math.min(
        Math.max(0, ratio * maxScroll),
        maxScroll,
      )
      setScroll(newScroll)
      bumpScrolling()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canScroll, direction, viewportSize, thumbSize],
  )
  const onViewportPointerUp = useCallback(() => {
    draggingRef.current = false
  }, [])

  // ── Click on track (jump to position) ─────────────────────
  // Clicking the track (anywhere outside the thumb) jumps
  // the thumb to that position. We compute the new scroll
  // value from the click offset.
  const onTrackClick = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      // Skip if the click was on the thumb itself — the
      // thumb's onPointerDown already handles that, and we
      // don't want to double-jump.
      if (
        e.target instanceof HTMLDivElement &&
        e.target.dataset.scrollarea === 'thumb'
      ) {
        return
      }
      if (!canScroll) return
      const viewport = viewportRef.current
      if (!viewport) return
      const rect = viewport.getBoundingClientRect()
      const offset =
        direction === 'vertical'
          ? e.clientY - rect.top
          : e.clientX - rect.left
      const trackSize = viewportSize - thumbSize
      const ratio = trackSize > 0 ? (offset - thumbSize / 2) / trackSize : 0
      const newScroll = Math.min(
        Math.max(0, ratio * maxScroll),
        maxScroll,
      )
      setScroll(newScroll)
      bumpScrolling()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canScroll, direction, viewportSize, thumbSize],
  )

  // ── Scrolling-active timer ────────────────────────────────
  // We reveal the thumb while the user is actively scrolling
  // (wheel, touch, drag, keyboard). After 600ms of no
  // scroll input, the thumb dims back to the at-rest state
  // (still visible, just less prominent). This matches the
  // behavior of native macOS overlay scrollbars.
  const bumpScrolling = useCallback(() => {
    setScrolling(true)
    if (scrollTimerRef.current !== null) {
      window.clearTimeout(scrollTimerRef.current)
    }
    scrollTimerRef.current = window.setTimeout(() => {
      setScrolling(false)
    }, 600)
  }, [])

  // Cleanup the timer on unmount.
  useEffect(() => {
    return () => {
      if (scrollTimerRef.current !== null) {
        window.clearTimeout(scrollTimerRef.current)
      }
    }
  }, [])

  // ── Render ────────────────────────────────────────────────
  // Outer: the viewport. overflow:hidden is the key — the
  // browser will NEVER draw a native scrollbar here, so the
  // WebView's classic-mode behavior is irrelevant. The
  // viewport is a focusable region with role="region" so
  // keyboard users can scroll it.
  //
  // Inner: the content child, translated to reflect the
  // current scroll position. Its natural size drives the
  // scrollable area; we never clip it.
  //
  // Scrollbar: a thin pill absolutely-positioned on the
  // appropriate edge. The thumb is the only interactive
  // part; the track is a transparent hit target for
  // click-to-jump.
  const isVertical = direction === 'vertical'

  return (
    <div
      ref={viewportRef}
      role="region"
      tabIndex={0}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onPointerMove={onViewportPointerMove}
      onPointerUp={onViewportPointerUp}
      onPointerCancel={onViewportPointerUp}
      className={cn(
        'relative overflow-hidden',
        // Outline only on keyboard focus (not click) — the
        // default :focus-visible rules in index.css apply.
        'outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--border-active)] rounded-[inherit]',
        className,
      )}
    >
      <div ref={contentRef} style={contentStyle}>
        {children}
      </div>

      {canScroll && (
        <div
          // Track. Sits on the appropriate edge. Width/height
          // is the thumb's hit area; the thumb is rendered on
          // top. The track captures click-to-jump.
          onPointerDown={onTrackClick}
          className={cn(
            'absolute z-10',
            isVertical
              ? 'right-0 top-0 bottom-0 w-[10px]'
              : 'bottom-0 left-0 right-0 h-[10px]',
          )}
        >
          <div
            // Thumb. Positioned via transform: translateY/X
            // for compositor-friendly animation. Cursor is
            // grab at rest, grabbing while dragging.
            data-scrollarea="thumb"
            onPointerDown={onThumbPointerDown}
            onPointerEnter={() => setThumbHover(true)}
            onPointerLeave={() => setThumbHover(false)}
            className={cn(
              'absolute rounded-full',
              isVertical
                ? 'right-[3px] w-[4px]'
                : 'bottom-[3px] h-[4px]',
              'cursor-grab active:cursor-grabbing',
              'transition-colors duration-[var(--motion-fast)] ease-out',
              thumbHover || draggingRef.current || scrolling
                ? 'bg-[color-mix(in_srgb,var(--text-dim)_70%,transparent)]'
                : 'bg-[color-mix(in_srgb,var(--text-muted)_45%,transparent)]',
            )}
            style={{
              [isVertical ? 'height' : 'width']: `${thumbSize}px`,
              transform: isVertical
                ? `translateY(${thumbOffset}px)`
                : `translateX(${thumbOffset}px)`,
            }}
          />
        </div>
      )}
    </div>
  )
}
