type Props = {
  challenge: string
}

export function ComingSoon({ challenge }: Props) {
  return (
    <div className="max-w-[1180px] mx-auto px-9 py-16 flex flex-col items-center justify-center text-center">
      <span className="iz-label" style={{ color: 'var(--accent-1)' }}>
        {challenge.toUpperCase()}
      </span>
      <h1 className="iz-display text-3xl text-[var(--text)] mt-4 mb-2">
        Coming soon
      </h1>
      <p className="text-[14px] text-[var(--text-dim)] max-w-[420px]">
        Water tracking arrives in a future phase. For now, head back to the{' '}
        pullup challenge.
      </p>
    </div>
  )
}
