import { useEffect, useRef, useState, type ReactNode } from 'react'

const HEX = '0123456789abcdef'

/** Hash digits scramble, then lock left to right — the visual signature of a block sealing. */
export function Hash({ value, len = 24, className = '', dur = 640 }: { value: string; len?: number; className?: string; dur?: number }) {
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
      setShown(target.slice(0, locked) + Array.from({ length: target.length - locked }, () => HEX[(Math.random() * 16) | 0]).join(''))
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
      const p = Math.min(1, (t - start) / 560)
      setV(a + (b - a) * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf.current = requestAnimationFrame(step)
      else from.current = b
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [value])
  return <span className={'tnum ' + className}>{prefix}{v.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })}{suffix}</span>
}

export function Spark({ data, color = '#3ecf9a', h = 34, w = 120, fill = true, full = false }:
  { data: number[]; color?: string; h?: number; w?: number; fill?: boolean; full?: boolean }) {
  if (!data.length) return <svg width={full ? '100%' : w} height={h} />
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
          <stop offset="0%" stopColor={color} stopOpacity=".22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={`${d} L${w} ${h} L0 ${h} Z`} fill={`url(#${gid})`} />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" fill={color} className="a-breathe" />
    </svg>
  )
}

export const tone = (pct: number) => (pct > 1 ? '#e2503f' : pct > 0.94 ? '#d8a83a' : '#3ecf9a')

/** Cap utilisation as a single horizontal bar with a target notch — flat, no dials. */
export function Meter({ pct, label, sub }: { pct: number; label: string; sub?: string }) {
  const c = tone(pct)
  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-mono text-[11px] tnum" style={{ color: c }}>{label}</span>
        {sub && <span className="eyebrow">{sub}</span>}
      </div>
      <div className="relative h-[3px] w-full bg-rule">
        <div className="absolute inset-y-0 left-0 origin-left"
          style={{ width: `${Math.min(100, (pct / 1.3) * 100)}%`, background: c, transition: 'width .8s cubic-bezier(.16,1,.3,1), background .4s' }} />
        <span className="absolute -top-1 h-[11px] w-px bg-mute/60" style={{ left: `${(1 / 1.3) * 100}%` }} />
      </div>
    </div>
  )
}

/** Panel with plus-mark corner registration. */
export function Frame({ title, index, right, children, className = '', pad = true, state }:
  { title?: ReactNode; index?: string; right?: ReactNode; children: ReactNode; className?: string; pad?: boolean; state?: 'lit' | 'bad' }) {
  return (
    <section className={`frame border border-rule bg-panel/60 ${state === 'lit' ? 'frame-lit' : state === 'bad' ? 'frame-bad' : ''} ${className}`}>
      <span className="fx" />
      {title && (
        <header className="flex items-center justify-between gap-4 border-b border-rule px-4 py-2.5">
          <h2 className="flex items-baseline gap-2.5">
            {index && <span className="font-mono text-[9.5px] text-faint">{index}</span>}
            <span className="eyebrow !text-mute">{title}</span>
          </h2>
          {right}
        </header>
      )}
      <div className={pad ? 'p-4' : ''}>{children}</div>
    </section>
  )
}

const TONES: Record<string, string> = {
  ok: 'border-signal/40 text-signal',
  warn: 'border-amber/40 text-amber',
  bad: 'border-breach/50 text-breach',
  info: 'border-rule2 text-mute',
  mute: 'border-rule2 text-dim',
}

export function Tag({ tone: t = 'mute', children, className = '' }: { tone?: string; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 border px-1.5 py-[3px] font-mono text-[9px] uppercase tracking-[.16em] ${TONES[t] ?? TONES.mute} ${className}`}>
      {children}
    </span>
  )
}

export function Btn({ children, onClick, tone: t = 'ghost', size = 'md', disabled, className = '', title }:
  { children: ReactNode; onClick?: () => void; tone?: 'primary' | 'ghost' | 'danger' | 'quiet'; size?: 'sm' | 'md'; disabled?: boolean; className?: string; title?: string }) {
  const base = 'group/btn relative inline-flex items-center justify-center gap-2 font-mono uppercase tracking-[.14em] transition-all duration-200 active:translate-y-px disabled:pointer-events-none disabled:opacity-30 select-none'
  const sz = size === 'sm' ? 'px-2.5 py-[5px] text-[9.5px]' : 'px-4 py-2.5 text-[10.5px]'
  const tones = {
    primary: 'bg-signal text-void hover:bg-[#5ee0b0]',
    danger: 'border border-breach/50 text-breach hover:bg-breach/10 hover:border-breach',
    ghost: 'border border-rule2 text-bone hover:border-signal hover:text-signal',
    quiet: 'text-dim hover:text-bone',
  }
  return <button title={title} disabled={disabled} onClick={onClick} className={`${base} ${sz} ${tones[t]} ${className}`}>{children}</button>
}

export function Dot({ tone: c = '#3ecf9a', pulse = true }: { tone?: string; pulse?: boolean }) {
  return (
    <span className="relative inline-grid h-[7px] w-[7px] place-items-center">
      <span className="h-[5px] w-[5px] rounded-full" style={{ background: c }} />
      {pulse && <span className="absolute h-[7px] w-[7px] rounded-full a-breathe" style={{ background: c, opacity: .35 }} />}
    </span>
  )
}

export function Rule({ className = '' }: { className?: string }) {
  return <div className={`h-px w-full bg-rule ${className}`} />
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center px-6 py-16 text-center a-fade">
      <span className="mb-5 font-mono text-[18px] leading-none text-faint">+</span>
      <div className="font-display text-[15px] font-medium tracking-tight">{title}</div>
      <p className="mt-2 max-w-[44ch] text-[12.5px] leading-relaxed text-dim">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export const TX_TONE: Record<string, string> = {
  MRV: '#8d9299', VERIFY: '#8e8fb5', ISSUE: '#3ecf9a',
  TRADE: '#d8a83a', RETIRE: '#e8603c', ATTEST: '#5c6268',
}

export const timeAgo = (ts: number) => {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (s < 60) return s + 's'
  if (s < 3600) return Math.floor(s / 60) + 'm'
  return Math.floor(s / 3600) + 'h'
}

export const clock = (ts: number) =>
  new Date(ts).toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
