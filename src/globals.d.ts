import 'react'

// Tauri's `titleBarStyle: "Overlay"` window needs `-webkit-app-region` on the
// drag region. TypeScript doesn't ship this CSS property, so declare it here.
declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag'
  }
}
