import { describe, it, expect } from 'vitest'
import { formatDuration } from './duration'

describe('formatDuration', () => {
  it('splits decimal hours into h + m', () => {
    expect(formatDuration(7.5, 'h')).toBe('7h 30m')
  })
  it('drops a zero minute component', () => {
    expect(formatDuration(8, 'h')).toBe('8h')
  })
  it('shows sub-hour minute values alone', () => {
    expect(formatDuration(35, 'min')).toBe('35m')
  })
  it('rolls minutes over into hours', () => {
    expect(formatDuration(95, 'min')).toBe('1h 35m')
  })
  it('keeps a zero hours value readable', () => {
    expect(formatDuration(0, 'h')).toBe('0h')
    expect(formatDuration(0, 'min')).toBe('0m')
  })
  it('rounds to the nearest minute', () => {
    expect(formatDuration(7.26, 'h')).toBe('7h 16m') // 435.6 -> 436 min
  })
})
