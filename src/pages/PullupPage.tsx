import { HeroChallengeCard } from '../components/HeroChallengeCard'
import { TodaysSetsCard } from '../components/TodaysSetsCard'
import { ActivityGrid } from '../components/ActivityGrid'

function PlaceholderCard({
  eyebrow,
  title,
  className,
}: {
  eyebrow: string
  title: string
  className?: string
}) {
  return (
    <div
      className={
        'border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] px-7 py-6 ' +
        (className ?? '')
      }
    >
      <span className="iz-label">{eyebrow}</span>
      <h2 className="iz-display text-xl text-[var(--text)] mt-2">{title}</h2>
    </div>
  )
}

export default function PullupPage() {
  return (
    <div className="max-w-[1180px] mx-auto px-9 py-9 flex flex-col gap-6">
      <HeroChallengeCard />
      <TodaysSetsCard />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PlaceholderCard eyebrow="Stats" title="Streak & averages" />
        <div className="lg:col-span-2">
          <ActivityGrid />
        </div>
      </div>
    </div>
  )
}
