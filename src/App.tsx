import { useEffect, useRef, useState } from 'react'
import {
  Activity, Blocks, Building2, CandlestickChart, CheckCheck, ChevronDown, Gavel,
  Landmark, Pause, Play, ScrollText, Wallet, Zap,
} from 'lucide-react'
import {
  useStore, startLoop, stopLoop, setRole, setView, setLive, type Role, type View,
} from './sim'
import LiveOps from './views/LiveOps'
import Registry from './views/Registry'
import Market, { Vault } from './views/Market'
import Compliance, { VerifyQueue } from './views/Compliance'
import { Dot, Hash, Num, Pill, TX_TONE } from './ui'

const ROLES: { id: Role; label: string; desk: string; icon: typeof Building2; tint: string; blurb: string }[] = [
  { id: 'industry', label: 'Industry', desk: 'Bharat Steel Ltd', icon: Building2, tint: '#ff7a45', blurb: 'File MRV reports, hold and trade certificates' },
  { id: 'verifier', label: 'Verifier', desk: 'Bharat Assessment Services', icon: CheckCheck, tint: '#a78bfa', blurb: 'Accredited carbon verifier — approve or reject reports' },
  { id: 'regulator', label: 'Regulator', desk: 'Bureau of Energy Efficiency', icon: Landmark, tint: '#5aa2ff', blurb: 'Supervise the scheme, audit every record' },
]

const MENUS: Record<Role, { id: View; label: string; icon: typeof Activity; hint: string }[]> = {
  industry: [
    { id: 'ops', label: 'Live operations', icon: Activity, hint: 'Telemetry from every device' },
    { id: 'vault', label: 'Certificate vault', icon: Wallet, hint: 'Your CCC holdings' },
    { id: 'market', label: 'Exchange', icon: CandlestickChart, hint: 'Buy and sell CCCs' },
    { id: 'registry', label: 'Registry', icon: Blocks, hint: 'The chain itself' },
  ],
  verifier: [
    { id: 'verify', label: 'Verification queue', icon: Gavel, hint: 'Reports awaiting a decision' },
    { id: 'ops', label: 'Facility telemetry', icon: Activity, hint: 'Evidence behind the numbers' },
    { id: 'registry', label: 'Registry', icon: Blocks, hint: 'The chain itself' },
  ],
  regulator: [
    { id: 'compliance', label: 'Scheme oversight', icon: ScrollText, hint: 'Every obligated entity' },
    { id: 'market', label: 'Market surveillance', icon: CandlestickChart, hint: 'Price and settlement tape' },
    { id: 'registry', label: 'Registry audit', icon: Blocks, hint: 'Tamper-evidence proof' },
    { id: 'ops', label: 'Facility telemetry', icon: Activity, hint: 'Source data' },
  ],
}

function RoleSwitch() {
  const role = useStore(s => s.role)
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const cur = ROLES.find(r => r.id === role)!

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={box} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 rounded-lg border border-line2 bg-panel2 px-3 py-1.5 transition-all duration-200 hover:border-verdant/40">
        <span className="grid h-6 w-6 place-items-center rounded" style={{ background: cur.tint + '22', color: cur.tint }}>
          <cur.icon size={13} />
        </span>
        <span className="text-left leading-tight">
          <span className="block font-mono text-[9px] uppercase tracking-[.15em] text-dim">{cur.label} desk</span>
          <span className="block text-[12px] font-medium">{cur.desk}</span>
        </span>
        <ChevronDown size={13} className={`text-dim transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[300px] overflow-hidden rounded-lg border border-line2 bg-panel shadow-[0_28px_60px_-24px_rgba(0,0,0,.9)] a-rise">
          <div className="border-b border-line px-3 py-2 font-mono text-[9.5px] uppercase tracking-[.16em] text-dim">Switch desk</div>
          <div className="stagger p-1.5">
            {ROLES.map(r => (
              <button key={r.id} onClick={() => { setRole(r.id); setOpen(false) }}
                className={`flex w-full items-start gap-2.5 rounded px-2.5 py-2 text-left transition-colors ${r.id === role ? 'bg-panel2' : 'hover:bg-panel2'}`}>
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded" style={{ background: r.tint + '1e', color: r.tint }}>
                  <r.icon size={14} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[12.5px] font-medium">
                    {r.desk}{r.id === role && <Dot tone={r.tint} />}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-dim">{r.blurb}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Always-on dock: the chain forging in real time, on every screen. */
function ForgeDock() {
  const chain = useStore(s => s.chain)
  const mempool = useStore(s => s.mempool)
  const forging = useStore(s => s.forging)
  const integrity = useStore(s => s.integrity)
  const last = chain[chain.length - 1]
  const recent = chain.slice(-9)

  return (
    <footer className={`relative z-20 flex items-center gap-4 border-t px-4 py-2 transition-colors duration-500
      ${integrity === 'broken' ? 'border-breach/40 bg-breach/6' : 'border-line bg-panel/80'} backdrop-blur`}>
      <div className="flex shrink-0 items-center gap-2">
        <Dot tone={integrity === 'broken' ? '#ff4d5e' : '#2fe0a4'} />
        <span className="font-mono text-[10px] uppercase tracking-[.16em] text-dim">Chain</span>
        <span className="font-mono text-[12px] font-semibold">#{last.index}</span>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
        {recent.map(b => (
          <div key={b.index} className="a-block flex shrink-0 items-center gap-1.5">
            <div className={`rounded border px-1.5 py-1 font-mono text-[9px] leading-tight
              ${b.valid ? 'border-line2 bg-panel2 text-mute' : 'border-breach/60 bg-breach/12 text-breach'}`}>
              <div className="font-bold">#{b.index}</div>
              <div className="opacity-70">{b.hash.slice(0, 6)}</div>
            </div>
            <span className={`h-px w-2 ${b.valid ? 'bg-line2' : 'bg-breach/60'}`} />
          </div>
        ))}
        <div className={`sweep relative shrink-0 overflow-hidden rounded border border-dashed px-2 py-1 font-mono text-[9px]
          ${forging ? 'border-verdant/60 text-verdant' : 'border-line2 text-dim'}`}>
          {forging ? 'sealing…' : `${mempool.length} pending`}
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-2 md:flex">
        <span className="font-mono text-[9.5px] uppercase tracking-[.14em] text-dim">head</span>
        <Hash value={last.hash} len={22} className={`text-[10.5px] ${integrity === 'broken' ? 'text-breach' : 'text-verdant'}`} />
      </div>
    </footer>
  )
}

function Toasts() {
  const toasts = useStore(s => s.toasts)
  const tone = { ok: '#2fe0a4', warn: '#ffc24b', bad: '#ff4d5e', info: '#5aa2ff' }
  return (
    <div className="pointer-events-none fixed bottom-16 right-4 z-50 flex w-[330px] flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className="a-slideL overflow-hidden rounded-lg border border-line2 bg-panel/95 p-3 shadow-[0_20px_50px_-20px_rgba(0,0,0,.9)] backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone[t.kind] }} />
            <span className="text-[12.5px] font-semibold" style={{ color: tone[t.kind] }}>{t.title}</span>
          </div>
          <p className="mt-1 text-[11.5px] leading-snug text-mute">{t.body}</p>
        </div>
      ))}
    </div>
  )
}

function Ticker() {
  const chain = useStore(s => s.chain)
  const items = [...chain].reverse().flatMap(b => b.txs).slice(0, 12)
  const row = items.length ? [...items, ...items] : []
  return (
    <div className="relative overflow-hidden border-y border-line bg-ink/60 py-1.5">
      <div className="a-ticker flex w-max gap-8 whitespace-nowrap">
        {row.map((t, i) => (
          <span key={t.id + i} className="flex items-center gap-2 font-mono text-[10.5px]">
            <span className="font-bold tracking-[.1em]" style={{ color: TX_TONE[t.kind].c }}>{t.kind}</span>
            <span className="text-dim">{t.note}</span>
            {t.qty > 0 && <span className="text-mute">{t.qty.toLocaleString('en-IN')} tCO2e</span>}
          </span>
        ))}
      </div>
      <span className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-ink to-transparent" />
      <span className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink to-transparent" />
    </div>
  )
}

const TITLES: Record<View, { h: string; s: string }> = {
  ops: { h: 'Live operations', s: 'Continuous emissions monitoring across every obligated facility' },
  registry: { h: 'Registry', s: 'The immutable record of issuance, transfer, retirement and attestation' },
  market: { h: 'Exchange', s: 'Carbon Credit Certificate spot market with on-chain settlement' },
  compliance: { h: 'Scheme oversight', s: 'CCTS compliance position across all obligated entities' },
  verify: { h: 'Verification queue', s: 'Accredited carbon verifier decisions written straight to the chain' },
  vault: { h: 'Certificate vault', s: 'Serialised CCCs held by your organisation' },
}

export default function App() {
  const role = useStore(s => s.role)
  const view = useStore(s => s.view)
  const live = useStore(s => s.live)
  const price = useStore(s => s.price)
  const menu = MENUS[role]

  useEffect(() => { startLoop(); return stopLoop }, [])

  const Body = { ops: LiveOps, registry: Registry, market: Market, compliance: Compliance, verify: VerifyQueue, vault: Vault }[view]
  const t = TITLES[view]

  return (
    <div className="flex h-full flex-col bg-ink">
      <header className="relative z-30 flex items-center gap-4 border-b border-line bg-panel/60 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <span className="relative grid h-8 w-8 place-items-center rounded-lg border border-verdant/40 bg-verdant/10">
            <Zap size={15} className="text-verdant" />
            <span className="absolute inset-0 rounded-lg a-glow" style={{ boxShadow: '0 0 18px rgba(47,224,164,.45)' }} />
          </span>
          <div className="leading-tight">
            <div className="font-display text-[15px] font-bold tracking-tight">CarbonLedger</div>
            <div className="font-mono text-[9px] uppercase tracking-[.18em] text-dim">CCTS MRV &amp; credit exchange</div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-lg border border-line bg-panel2/60 px-3 py-1.5 sm:flex">
            <span className="font-mono text-[9px] uppercase tracking-[.15em] text-dim">CCC spot</span>
            <span className="font-mono text-[13px] font-semibold text-verdant tnum"><Num value={price} prefix="Rs " /></span>
          </div>
          <button onClick={() => setLive(!live)}
            className="flex items-center gap-1.5 rounded-lg border border-line2 bg-panel2 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[.14em] text-mute transition hover:border-verdant/40 hover:text-verdant">
            {live ? <Pause size={12} /> : <Play size={12} />}{live ? 'Live' : 'Paused'}
          </button>
          <RoleSwitch />
        </div>
      </header>

      <Ticker />

      <div className="flex min-h-0 flex-1">
        <nav className="hidden w-[214px] shrink-0 flex-col gap-1 border-r border-line bg-panel/40 p-2.5 lg:flex">
          <div className="px-2 pb-1.5 font-mono text-[9px] uppercase tracking-[.18em] text-dim">{role} workspace</div>
          <div key={role} className="stagger flex flex-col gap-1">
            {menu.map(m => {
              const on = view === m.id
              return (
                <button key={m.id} onClick={() => setView(m.id)}
                  className={`group relative flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all duration-200
                    ${on ? 'bg-verdant/10 text-text' : 'text-mute hover:bg-panel2 hover:text-text'}`}>
                  {on && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-verdant" />}
                  <m.icon size={14} className={`mt-0.5 shrink-0 transition-colors ${on ? 'text-verdant' : 'text-dim group-hover:text-mute'}`} />
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-medium">{m.label}</span>
                    <span className="block truncate text-[10px] text-dim">{m.hint}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-auto rounded-lg border border-line bg-panel2/40 p-2.5">
            <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[.15em] text-dim">
              <Dot tone={live ? '#2fe0a4' : '#7b8fa3'} pulse={live} />{live ? 'ingesting' : 'ingest paused'}
            </div>
            <p className="mt-1.5 text-[10.5px] leading-snug text-dim">
              Devices push signed telemetry every 1.1 s. Batches are hashed and anchored automatically.
            </p>
          </div>
        </nav>

        <main className="schematic min-w-0 flex-1 overflow-y-auto">
          <div className="schematic-fade min-h-full p-4">
            <div key={view} className="a-rise">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="font-display text-[24px] font-semibold tracking-tight">{t.h}</h1>
                  <p className="mt-0.5 text-[12.5px] text-dim">{t.s}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 lg:hidden">
                  {menu.map(m => (
                    <button key={m.id} onClick={() => setView(m.id)}
                      className={`rounded border px-2.5 py-1 text-[11px] ${view === m.id ? 'border-verdant/50 bg-verdant/10 text-verdant' : 'border-line text-mute'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
                <Pill tone="mute">India CCTS · compliance year FY 2026-27</Pill>
              </div>
              <Body />
            </div>
          </div>
        </main>
      </div>

      <ForgeDock />
      <Toasts />
    </div>
  )
}
