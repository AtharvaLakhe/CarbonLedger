import { useEffect, useRef, useState, type ReactNode } from 'react'

const HEX = '0123456789abcdef'

/** Hash digits scramble, then lock left-to-right — the visual signature of a block sealing. */
export function Hash({ value, len = 24, className = '', dur = 620 }: { value: string; len?: number; className?: string; dur?: number }) {
  const target = value.slice(0, len)
  const [shown, setShown] = useState(target)
  const prev = useRef(value)
  useEffect(() => {
    if (prev.current === value) return
    prev.current = value
    let f = 0
    const frames = Math.round(dur / 40)
    const iv = setInterval(() => {
      f++
      const locked = Math.floor((f / frames) * target.length)
      setShown(
        target.slice(0, locked) +
        Array.from({ length: target.length - locked }, () => HEX[(Math.random() * 16) | 0]).join('')
      )
      if (f >= frames) { clearInterval(iv); setShown(target) }
    }, 40)
    return () => clearInterval(iv)
  }, [value, target, dur])
  return <span className={'font-mono tabular-nums ' + className}>{shown}</span>
}

/** Number that eases to its new value instead of jumping. */
export function Num({ value, d = 0, prefix = '', suffix = '', className = '' }:
  { value: number; d?: number; prefix?: string; suffix?: string; className?: string }) {
  const [v, setV] = useState(value)
  const raf = useRef(0)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now(); const a = from.current; const b = value
    if (a === b) return
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / 520)
      const e = 1 - Math.pow(1 - p, 3)
      setV(a + (b - a) * e)
      if (p < 1) raf.current = requestAnimationFrame(step)
      else from.current = b
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [value])
  return <span className={'tnum ' + className}>{prefix}{v.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })}{suffix}</span>
}

export function Spark({ data, color = '#2fe0a4', h = 34, w = 120, fill = true, full = false }:
  { data: number[]; color?: string; h?: number; w?: number; fill?: boolean; full?: boolean }) {
  if (!data.length) return <svg width={w} height={h} />
  const min = Math.min(...data), max = Math.max(...data)
  const rng = max - min || 1
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 2 - ((v - min) / rng) * (h - 4)])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const gid = 'g' + color.replace('#', '')
  return (
    <svg width={full ? '100%' : w} height={h} viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio={full ? 'none' : undefined} className={full ? 'block' : 'overflow-visible'}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={`${d} L${w} ${h} L0 ${h} Z`} fill={`url(#${gid})`} />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.4" fill={color} className="a-glow" />
    </svg>
  )
}

/** Cap-vs-emitted arc. Over 100% it burns ember. */
export function Gauge({ pct, size = 92, label, sub }: { pct: number; size?: number; label: string; sub?: string }) {
  const sw = size < 70 ? 4.5 : 7
  const r = size / 2 - sw - 1
  const c = 2 * Math.PI * r
  const p = Math.min(pct, 1.35) / 1.35
  const over = pct > 1
  const col = over ? '#ff4d5e' : pct > 0.9 ? '#ffc24b' : '#2fe0a4'
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1d2833" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - c * p}
          style={{ transition: 'stroke-dashoffset .7s cubic-bezier(.22,1,.36,1), stroke .4s' }} />
      </svg>
      <div className="absolute text-center leading-none">
        <div className="font-mono font-semibold tnum" style={{ color: col, fontSize: size < 70 ? 10.5 : 15 }}>{label}</div>
        {sub && size >= 70 && <div className="mt-1 text-[9px] uppercase tracking-[.14em] text-dim">{sub}</div>}
      </div>
    </div>
  )
}

export function Panel({ title, right, children, className = '', pad = true }:
  { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`rounded-lg border border-line bg-panel/70 backdrop-blur-sm hairline ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-3.5 py-2.5">
          <h2 className="font-mono text-[10.5px] font-semibold uppercase tracking-[.18em] text-mute">{title}</h2>
          {right}
        </header>
      )}
      <div className={pad ? 'p-3.5' : ''}>{children}</div>
    </section>
  )
}

const TONES: Record<string, string> = {
  ok: 'border-verdant/35 bg-verdant/10 text-verdant',
  warn: 'border-warn/35 bg-warn/10 text-warn',
  bad: 'border-breach/40 bg-breach/10 text-breach',
  info: 'border-signal/35 bg-signal/10 text-signal',
  mute: 'border-line2 bg-panel2 text-mute',
  ember: 'border-ember/35 bg-ember/10 text-ember',
  violet: 'border-violet/35 bg-violet/10 text-violet',
}

export function Pill({ tone = 'mute', children, className = '' }: { tone?: keyof typeof TONES | string; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[.13em] ${TONES[tone] ?? TONES.mute} ${className}`}>
      {children}
    </span>
  )
}

export function Btn({ children, onClick, tone = 'ghost', size = 'md', disabled, className = '', title }:
  { children: ReactNode; onClick?: () => void; tone?: 'primary' | 'ghost' | 'danger' | 'quiet'; size?: 'sm' | 'md'; disabled?: boolean; className?: string; title?: string }) {
  const base = 'relative inline-flex items-center justify-center gap-1.5 rounded font-medium transition-all duration-200 active:scale-[.97] disabled:pointer-events-none disabled:opacity-35 select-none'
  const sz = size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-2 text-[12.5px]'
  const tones = {
    primary: 'bg-verdant text-[#04150f] hover:bg-[#57eab6] shadow-[0_0_0_1px_rgba(47,224,164,.35),0_6px_22px_-8px_rgba(47,224,164,.55)]',
    danger: 'border border-breach/45 bg-breach/12 text-breach hover:bg-breach/22',
    ghost: 'border border-line2 bg-panel2 text-text hover:border-verdant/45 hover:bg-verdant/8 hover:text-verdant',
    quiet: 'text-mute hover:text-text hover:bg-panel2',
  }
  return (
    <button title={title} disabled={disabled} onClick={onClick} className={`${base} ${sz} ${tones[tone]} ${className}`}>{children}</button>
  )
}

export function Bar({ pct, color = '#2fe0a4', h = 4 }: { pct: number; color?: string; h?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-full bg-line" style={{ height: h }}>
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct * 100)}%`, background: color, transition: 'width .7s cubic-bezier(.22,1,.36,1), background .4s' }} />
    </div>
  )
}

export function Dot({ tone = '#2fe0a4', pulse = true }: { tone?: string; pulse?: boolean }) {
  return (
    <span className="relative inline-grid h-2 w-2 place-items-center">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
      {pulse && <span className="absolute h-2 w-2 rounded-full a-glow" style={{ background: tone, opacity: .4 }} />}
    </span>
  )
}

export function Empty({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center px-6 py-14 text-center a-rise">
      <div className="mb-3.5 grid h-12 w-12 place-items-center rounded-lg border border-line bg-panel2 text-dim">{icon}</div>
      <div className="font-display text-[15px] font-semibold text-text">{title}</div>
      <p className="mt-1.5 max-w-[42ch] text-[12.5px] leading-relaxed text-dim">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export const TX_TONE: Record<string, { c: string; label: string }> = {
  MRV: { c: '#5aa2ff', label: 'MRV' },
  VERIFY: { c: '#a78bfa', label: 'VERIFY' },
  ISSUE: { c: '#2fe0a4', label: 'ISSUE' },
  TRADE: { c: '#ffc24b', label: 'TRADE' },
  RETIRE: { c: '#ff7a45', label: 'RETIRE' },
  ATTEST: { c: '#7b8fa3', label: 'ATTEST' },
}

export const timeAgo = (ts: number) => {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (s < 60) return s + 's ago'
  if (s < 3600) return Math.floor(s / 60) + 'm ago'
  return Math.floor(s / 3600) + 'h ago'
}

export const clock = (ts: number) =>
  new Date(ts).toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
