import { useState, type PointerEvent } from 'react'
import { NOV_START, RELEASE_DATE, clampToNov, dayOfMonth } from '../lib/dates'

type Props = { built: number[]; posted: number[]; today: string }

const W = 340
const H = 210
const PL = 26
const PR = 30
const PT = 14
const PB = 24
const PW = W - PL - PR
const PH = H - PT - PB

const x = (day: number) => PL + ((day - 1) / 29) * PW
const y = (v: number) => PT + PH - (v / 30) * PH

function linePath(values: number[]): string {
  return values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
}

/** Cumulative days built / posted vs. one-per-day pace, Nov 1–30. */
export default function PaceChart({ built, posted, today }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const shown = today < NOV_START ? 0 : dayOfMonth(clampToNov(today))
  const b = built.slice(0, shown)
  const p = posted.slice(0, shown)
  const release = dayOfMonth(RELEASE_DATE)

  function pick(e: PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
    const vx = ((e.clientX - rect.left) / rect.width) * W
    setHover(Math.min(30, Math.max(1, Math.round(((vx - PL) / PW) * 29) + 1)))
  }

  const tip = hover === null ? null : buildTip(hover, shown, built, posted)

  return (
    <figure>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        <Legend swatch="bg-built" label="Days built" />
        <Legend swatch="bg-posted" label="Days posted" />
        <span className="inline-flex items-center gap-1.5">
          <svg width="16" height="4" aria-hidden>
            <line x1="0" y1="2" x2="16" y2="2" className="stroke-muted" strokeWidth="2" strokeDasharray="3 3" />
          </svg>
          One per day
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label={`Pace chart: ${b.at(-1) ?? 0} days built and ${p.at(-1) ?? 0} days posted through day ${shown} of 30.`}
      >
        {/* grid + y ticks */}
        {[0, 10, 20, 30].map((v) => (
          <g key={v}>
            <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} className={v === 0 ? 'stroke-axis' : 'stroke-grid'} strokeWidth="1" />
            <text x={PL - 6} y={y(v) + 3} textAnchor="end" className="fill-muted" fontSize="10" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {v}
            </text>
          </g>
        ))}
        {/* x ticks */}
        {[1, 7, 14, 21, 30].map((d) => (
          <text key={d} x={x(d)} y={H - 8} textAnchor="middle" className="fill-muted" fontSize="10">
            {d === 1 ? 'Nov 1' : d}
          </text>
        ))}

        {/* release marker */}
        <line x1={x(release)} x2={x(release)} y1={PT} y2={PT + PH} className="stroke-axis" strokeWidth="1" />
        <text x={x(release) + 4} y={PT + 8} className="fill-ink-2" fontSize="10" fontWeight="600">
          Release
        </text>

        {/* pace line */}
        <line x1={x(1)} y1={y(1)} x2={x(30)} y2={y(30)} className="stroke-muted" strokeWidth="1.5" strokeDasharray="4 4" />

        {/* series */}
        {shown > 0 && (
          <>
            <path d={linePath(p)} fill="none" className="stroke-posted" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <path d={linePath(b)} fill="none" className="stroke-built" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <EndPoint cx={x(shown)} cy={y(p[shown - 1])} color="fill-posted" />
            <EndPoint cx={x(shown)} cy={y(b[shown - 1])} color="fill-built" />
            <EndLabels day={shown} built={b[shown - 1]} posted={p[shown - 1]} />
          </>
        )}

        {/* hover */}
        {tip && hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={PT} y2={PT + PH} className="stroke-ink-2" strokeWidth="1" />
            <g transform={`translate(${Math.min(Math.max(x(hover) - 50, 2), W - 102)}, ${PT + 12})`}>
              <rect width="100" height={14 + tip.length * 13} rx="6" className="fill-surface stroke-line" strokeWidth="1" />
              {tip.map((line, i) => (
                <text key={i} x="8" y={16 + i * 13} fontSize="10" className={i === 0 ? 'fill-ink' : 'fill-ink-2'} fontWeight={i === 0 ? 600 : 400}>
                  {line}
                </text>
              ))}
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
    </figure>
  )
}

function buildTip(day: number, shown: number, built: number[], posted: number[]): string[] {
  const lines = [`Nov ${day}`]
  if (day <= shown) lines.push(`Built: ${built[day - 1]}`, `Posted: ${posted[day - 1]}`)
  lines.push(`Pace: ${day}`)
  return lines
}

function EndPoint({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return <circle cx={cx} cy={cy} r="4" className={`${color} stroke-surface`} strokeWidth="2" />
}

/** Direct labels at the line ends, nudged apart if they'd overlap. */
function EndLabels({ day, built, posted }: { day: number; built: number; posted: number }) {
  let yb = y(built)
  let yp = y(posted)
  if (Math.abs(yb - yp) < 11) {
    const mid = (yb + yp) / 2
    const up = built >= posted
    yb = mid + (up ? -6 : 6)
    yp = mid + (up ? 6 : -6)
  }
  return (
    <>
      <text x={x(day) + 7} y={yb + 3} fontSize="10" fontWeight="600" className="fill-ink">
        {built}
      </text>
      <text x={x(day) + 7} y={yp + 3} fontSize="10" fontWeight="600" className="fill-ink">
        {posted}
      </text>
    </>
  )
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${swatch}`} aria-hidden />
      {label}
    </span>
  )
}
