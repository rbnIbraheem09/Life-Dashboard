import { usePages } from '../store/pages'
import { HeroCounter } from './HeroCounter'
import { EntryLog } from './EntryLog'
import { StatRow } from './StatRow'
import { ActivityHeatmap } from './ActivityHeatmap'
import { TrendChart } from './TrendChart'
import type { BlockDef } from '../types'

export function PageRenderer({ pageId }: { pageId: string }) {
  const def = usePages((s) => s.data.pages[pageId]?.def)
  if (!def) return null

  const has = (t: BlockDef['type']) => def.blocks.some((b) => b.type === t)
  const trend = def.blocks.find((b): b is Extract<BlockDef, { type: 'trend' }> => b.type === 'trend')

  return (
    <div className="max-w-[1180px] mx-auto px-9 py-9 flex flex-col gap-6">
      {has('hero') && <HeroCounter pageId={pageId} />}
      {has('entryLog') && <EntryLog pageId={pageId} />}
      {(has('statRow') || has('heatmap')) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {has('statRow') && <StatRow pageId={pageId} />}
          {has('heatmap') && (
            <div className="lg:col-span-2">
              <ActivityHeatmap pageId={pageId} />
            </div>
          )}
        </div>
      )}
      {trend && <TrendChart pageId={pageId} metric={trend.metric} />}
    </div>
  )
}
