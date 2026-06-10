import { HeroChallengeCard } from '../components/HeroChallengeCard'
import { TodaysSetsCard } from '../components/TodaysSetsCard'
import { StatsCard } from '../components/StatsCard'
import { ActivityGrid } from '../components/ActivityGrid'

export default function PullupPage() {
  return (
    <div className="max-w-[1180px] mx-auto px-9 py-9 flex flex-col gap-6">
      <HeroChallengeCard />
      <TodaysSetsCard />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StatsCard />
        <div className="lg:col-span-2">
          <ActivityGrid />
        </div>
      </div>
    </div>
  )
}
