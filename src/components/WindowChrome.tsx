import { PanelToggle } from './PanelToggle'
import { cn } from '../lib/cn'

/**
 * WindowChrome — the sidebar toggle, anchored to the WINDOW (not the
 * collapsing sidebar) so its position is stable, but its VISIBILITY rides
 * with the sidebar: it fades out when the sidebar collapses and fades back
 * in when the sidebar is pinned or peeked. This is what kills the "lonely
 * toggle floating in empty space" look when collapsed.
 *
 * The traffic lights are real macOS lights drawn by the OS at
 * `trafficLightPosition` (see tauri.conf.json); this toggle is tuned to sit
 * just to their right and vertically centered with them.
 */
export function WindowChrome({ visible }: { visible: boolean }) {
  // top-[16px] vertically centers the 24px toggle against the OS lights;
  // left-[82px] parks it just right of the three lights (which start at
  // trafficLightPosition x:18). Nudge these if the alignment is off.
  return (
    <div
      className={cn(
        'absolute top-[16px] left-[82px] z-30',
        'transition-opacity duration-[var(--motion-mid)] ease-out',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
    >
      <PanelToggle />
    </div>
  )
}
