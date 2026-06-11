import { PanelToggle } from './PanelToggle'

/**
 * WindowChrome — the sidebar toggle.
 *
 * It is rendered as a child of the sidebar panel (see App.tsx), so it
 * rides with the sidebar's slide AND — critically — counts as part of the
 * panel's hover region. If it were a separate sibling on top of the panel,
 * moving the cursor onto it would fire the panel's mouseleave and snap the
 * hover-peek shut before you could click it. Being a child fixes that.
 *
 * The traffic lights are real macOS lights drawn by the OS at
 * `trafficLightPosition` (see tauri.conf.json); this toggle is positioned
 * (absolute, relative to the panel's top-left = the window's top-left) to
 * sit just to their right and vertically centered with them.
 */
export function WindowChrome() {
  // top-[12px] centers the 28px toggle against the OS lights; left-[82px]
  // parks it just right of the three lights (trafficLightPosition x:18).
  // Nudge these if alignment is off — they hot-reload.
  return (
    <div className="absolute top-[12px] left-[82px] z-30">
      <PanelToggle />
    </div>
  )
}
