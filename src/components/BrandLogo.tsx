import { useId } from 'react'

/** Значок атома в стиле НИЯУ МИФИ (три эллипса + ядро), как в public/mephi-atom-watermark.svg */
export function BrandLogo({ size = 36 }: { size?: number }) {
  const gid = useId().replace(/:/g, '')
  const gradId = `mephi-atom-grad-${gid}`
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#005bab" />
          <stop offset="100%" stopColor="#00b5e2" />
        </linearGradient>
      </defs>
      <g stroke={`url(#${gradId})`} strokeWidth="2.8" strokeLinecap="round">
        <ellipse cx="100" cy="100" rx="72" ry="30" />
        <ellipse cx="100" cy="100" rx="72" ry="30" transform="rotate(60 100 100)" />
        <ellipse cx="100" cy="100" rx="72" ry="30" transform="rotate(-60 100 100)" />
      </g>
      <circle cx="100" cy="100" r="9" fill={`url(#${gradId})`} />
    </svg>
  )
}
