import { PanelToggle } from './PanelToggle'

/**
 * WindowChrome — the sidebar toggle, anchored to the WINDOW (not the
 * collapsing sidebar) so it is always reachable.
 *
 * The traffic lights are REAL macOS lights, drawn by the OS at
 * `trafficLightPosition` (see tauri.conf.json). They sit just to the
 * left of this toggle and can never be hidden by a collapsing panel.
 *
 * Window dragging is handled by useWindowDrag (the top strip of the
 * window) — there is no visible chrome bar here, by design.
 */
export function WindowChrome() {
  // left-[92px] parks the toggle just right of the three OS-drawn lights
  // (which start at trafficLightPosition x:18). top-[15px] vertically
  // aligns it with them. Both are fine-tuned visually in Task 5.
  return (
    <div className="absolute top-[15px] left-[92px] z-30">
      <PanelToggle />
    </div>
  )
}
