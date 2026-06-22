// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useUpdater } from './updater'

// Outside the Tauri desktop shell (no __TAURI_INTERNALS__), the updater must
// never touch IPC: check() resolves to 'unsupported' and install() is a no-op.
describe('updater store (browser / no desktop shell)', () => {
  beforeEach(() => {
    useUpdater.setState({ status: 'idle', error: null, newVersion: null, progress: 0, dismissed: false })
  })

  it('reports unsupported instead of throwing when not in Tauri', async () => {
    expect('__TAURI_INTERNALS__' in window).toBe(false)
    await useUpdater.getState().check()
    expect(useUpdater.getState().status).toBe('unsupported')
  })

  it('install() is a safe no-op with no pending update', async () => {
    await useUpdater.getState().install()
    // status unchanged from idle; nothing thrown
    expect(useUpdater.getState().status).toBe('idle')
  })

  it('dismiss() flips the banner flag', () => {
    useUpdater.getState().dismiss()
    expect(useUpdater.getState().dismissed).toBe(true)
  })
})
