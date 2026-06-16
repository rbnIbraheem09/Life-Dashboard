// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { createElement as h, act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import MarketplacePage from './MarketplacePage'

// Mount MarketplacePage for real in jsdom to prove it renders, the offline
// fallback works (fetch rejects -> bundled catalog), and the scanner runs over
// every bundled entry to produce cards.

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  // ScrollArea (only mounts when the inspector opens) needs ResizeObserver.
  if (!('ResizeObserver' in globalThis)) {
    globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  }
  // Force the offline path so the test never touches the network.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
})

describe('MarketplacePage', () => {
  it('renders the marketplace with bundled pages when offline', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(h(MemoryRouter, null, h(MarketplacePage)))
    })
    // flush the awaited catalog load (fetch reject -> bundled fallback)
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    const text = document.body.textContent ?? ''
    expect(text).toContain('Marketplace')
    expect(text).toContain('Meditation')
    expect(text).toContain('Pushups')
    expect(text).toContain('bundled')

    await act(async () => { root.unmount() })
    container.remove()
  })
})
