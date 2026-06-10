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
      <PlaceholderCard eyebrow="Pullup Challenge" title="100 reps / day" />
      <PlaceholderCard eyebrow="Today's Sets" title="Set logging" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PlaceholderCard eyebrow="Stats" title="Streak & averages" />
        <PlaceholderCard
          eyebrow="Activity · 2026"
          title="Yearly grid"
          className="lg:col-span-2"
        />
      </div>
    </div>
  )
}
