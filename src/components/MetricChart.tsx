import { useState, type PointerEvent } from 'react'
import { NOV_END, NOV_START, dayOfMonth, formatShort } from '../lib/dates'
import type { MetricLog, Tiers } from '../lib/types'

type Props = { label: string; logs: MetricLog[]; tiers: Tiers }

const W = 340
const H = 180
const PL = 36
const PR = 58
const PT = 12
const PB = 24
const PW = W - PL - PR
const PH = H - PT - PB

const x = (day: number) => PL + ((day - 1) / 29) * PW

function niceTicks(max: number): number[] {
  const raw = max / 4
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag
  const top = Math.ceil(max / step) * step
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}k`
  return String(n)
}

/** One metric's logged values across November with dashed floor/target/stretch lines. */
export default function MetricChart({ label, logs, tiers }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const points = logs.filter((l) => l.date >= NOV_START && l.date <= NOV_END)
  const tierLines: [string, number][] = []
  if (tiers.stretch !== null) tierLines.push(['Stretch', tiers.stretch])
  if (tiers.target !== null) tierLines.push(['Target', tiers.target])
  if (tiers.floor !== null) tierLines.push(['Floor', tiers.floor])

  if (points.length === 0 && tierLines.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">Set tiers or log a number to see the chart.</p>
  }

  const max = Math.max(4, ...points.map((p) => p.value), ...tierLines.map((t) => t[1]))
  const ticks = niceTicks(max * 1.05)
  const top = ticks[ticks.length - 1]
  const y = (v: number) => PT + PH - (v / top) * PH

  // Tier labels sit at the right edge; push apart any that would overlap.
  const labelYs: number[] = []
  for (const [, v] of tierLines) {
    const prev = labelYs[labelYs.length - 1]
    labelYs.push(prev !== undefined && y(v) - prev < 11 ? prev + 11 : y(v))
  }

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(dayOfMonth(p.date)).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const hovered = hover === null ? null : points[hover]

  function pick(e: PointerEvent<SVGRectElement>) {
    if (points.length === 0) return
    const rect = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
    const vx = ((e.clientX - rect.left) / rect.width) * W
    let best = 0
    points.forEach((p, i) => {
      if (Math.abs(x(dayOfMonth(p.date)) - vx) < Math.abs(x(dayOfMonth(points[best].date)) - vx)) best = i
    })
    setHover(best)
  }

  const last = points[points.length - 1]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full touch-none select-none"
      role="img"
      aria-label={`${label}: ${last ? `latest ${last.value} on ${formatShort(last.date)}` : 'no values logged yet'}.`}
    >
      {ticks.map((v) => (
        <g key={v}>
          <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} className={v === 0 ? 'stroke-axis' : 'stroke-grid'} strokeWidth="1" />
          <text x={PL - 6} y={y(v) + 3} textAnchor="end" fontSize="10" className="fill-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {compact(v)}
          </text>
        </g>
      ))}
      {[1, 7, 14, 21, 30].map((d) => (
        <text key={d} x={x(d)} y={H - 8} textAnchor="middle" fontSize="10" className="fill-muted">
          {d === 1 ? 'Nov 1' : d}
        </text>
      ))}

      {tierLines.map(([name, v], i) => (
        <g key={name}>
          <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} className="stroke-muted" strokeWidth="1" strokeDasharray="4 4" />
          <text x={W - PR + 6} y={labelYs[i] + 3} fontSize="10" className="fill-ink-2">
            {name} {compact(v)}
          </text>
        </g>
      ))}

      {points.length > 0 && (
        <path d={path} fill="none" className="stroke-built" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      )}
      {points.map((p) => (
        <circle key={p.date} cx={x(dayOfMonth(p.date))} cy={y(p.value)} r="4" className="fill-built stroke-surface" strokeWidth="2" />
      ))}

      {hovered && (
        <g pointerEvents="none">
          <line x1={x(dayOfMonth(hovered.date))} x2={x(dayOfMonth(hovered.date))} y1={PT} y2={PT + PH} className="stroke-ink-2" strokeWidth="1" />
          <g transform={`translate(${Math.min(Math.max(x(dayOfMonth(hovered.date)) - 45, 2), W - 92)}, ${PT + 4})`}>
            <rect width="90" height="36" rx="6" className="fill-surface stroke-line" strokeWidth="1" />
            <text x="8" y="15" fontSize="10" fontWeight="600" className="fill-ink">
              {formatShort(hovered.date)}
            </text>
            <text x="8" y="28" fontSize="10" className="fill-ink-2">
              {label}: {hovered.value.toLocaleString()}
            </text>
          </g>
        </g>
      )}
      <rect
        x={PL}
        y={PT}
        width={PW}
        height={PH}
        fill="transparent"
        onPointerDown={pick}
        onPointerMove={pick}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
      />
    </svg>
  )
}
