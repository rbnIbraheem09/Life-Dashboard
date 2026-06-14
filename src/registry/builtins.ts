import type { PageDef } from '../types'
import { PULLUPS_DEF } from './pullups'
import { WATER_DEF } from './water'
import { READING_DEF } from './reading'

export const BUILTIN_DEFS: Record<string, PageDef> = {
  pullups: PULLUPS_DEF,
  water: WATER_DEF,
  reading: READING_DEF,
}
export const BUILTIN_ORDER = ['pullups', 'water', 'reading']
