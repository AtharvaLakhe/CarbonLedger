import { useEffect, useRef, useState } from 'react'
import {
  useStore, connect, disconnect, setRole, setView, setLive, markBooted,
  askRegistry, clearAsk, type Role, type View,
} from './sim'
import LiveOps from './views/LiveOps'
import Registry from './views/Registry'
import Market, { Vault } from './views/Market'
import Compliance, { VerifyQueue } from './views/Compliance'
import { Btn, Dot, Hash, Num, Rule, Tag, TX_TONE, clock } from './ui'

const ROLES: { id: Role; label: string; desk: string; blurb: string }[] = [
  { id: 'industry', label: 'Industry', desk: 'Bharat Steel Ltd', blurb: 'File MRV reports, hold and trade certificates' },
  { id: 'verifier', label: 'Verifier', desk: 'Bharat Assessment Services', blurb: 'Accredited verifier — approve or reject reports' },
  { id: 'regulator', label: 'Regulator', desk: 'Bureau of Energy Efficiency', blurb: 'Supervise the scheme, audit every record' },
]

const MENUS: Record<Role, { id: View; label: string; hint: string }[]> = {
  industry: [
    { id: 'ops', label: 'Live operations', hint: 'Telemetry from every device' },
    { id: 'vault', label: 'Certificate vault', hint: 'Your CCC holdings' },
    { id: 'market', label: 'Exchange', hint: 'Buy and sell certificates' },
    { id: 'registry', label: 'Registry', hint: 'The chain itself' },
  ],
  verifier: [
    { id: 'verify', label: 'Verification queue', hint: 'Reports awaiting a decision' },
    { id: 'ops', label: 'Facility telemetry', hint: 'Evidence behind the numbers' },
    { id: 'registry', label: 'Registry', hint: 'The chain itself' },
  ],
  regulator: [
    { id: 'compliance', label: 'Scheme oversight', hint: 'Every obligated entity' },
    { id: 'market', label: 'Market surveillance', hint: 'Price and settlement tape' },
    { id: 'registry', label: 'Registry audit', hint: 'Tamper-evidence proof' },
    { id: 'ops', label: 'Facility telemetry', hint: 'Source data' },
  ],
}

const TITLES: Record<View, { h: string; s: string }> = {
  ops: { h: 'Live operations', s: 'Continuous emissions monitoring across every obligated facility' },
  registry: { h: 'Registry', s: 'The immutable record of issuance, transfer, retirement and attestation' },
  market: { h: 'Exchange', s: 'Certificate spot market with on-chain settlement' },
  compliance: { h: 'Scheme oversight', s: 'CCTS compliance position across all obligated entities' },
  verify: { h: 'Verification queue', s: 'Accredited verifier decisions written straight to the chain' },
  vault: { h: 'Certificate vault', s: 'Serialised certificates held by your organisation' },
}

// ── boot sequence ────────────────────────────────────────────
const BOOT = [
  'Opening channel to registry node',
  'Recomputing SHA-256 from genesis',
  'Reconciling obligated-entity roster',
  'Subscribing to device telemetry',
  'Attaching verification co-pilot',
]

function Boot() {
  const connected = useStore(s => s.connected)
  const height = useStore(s => s.chainHeight)
  const chain = useStore(s => s.chain)
  const [step, setStep] = useState(0)
  const [out, setOut] = useState(false)

  useEffect(() => {
    if (step >= BOOT.length) return
    const t = setTimeout(() => setStep(s => s + 1), step === 0 ? 420 : 300)
    return () => clearTimeout(t)
  }, [step])

  useEffect(() => {
    if (step >= BOOT.length && connected) {
      const t = setTimeout(() => { setOut(true); setTimeout(markBooted, 620) }, 520)
      return () => clearTimeout(t)
    }
  }, [step, connected])

  const head = chain[chain.length - 1]?.hash ?? ''

  return (
    <div className={`grid-bg fixed inset-0 z-[100] grid place-items-center bg-void transition-all duration-700 ${out ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
      <div className="vignette absolute inset-0" />
      <div className="relative w-[min(560px,88vw)]">
        <div className="mb-10 text-center">
          <div className="eyebrow mb-4">India Carbon Credit Trading Scheme</div>
          <h1 className="font-display text-[40px] font-semibold leading-none tracking-[-.03em]">CarbonLedger</h1>
          <p className="mt-3 text-[12.5px] text-dim">Please stand by — the registry is being verified.</p>
        </div>

        <div className="frame border border-rule bg-panel/50 p-5">
          <span className="fx" />
          <ol className="space-y-2.5">
            {BOOT.map((b, i) => {
              const done = step > i
              const now = step === i
              return (
                <li key={b} className={`flex items-center gap-3 font-mono text-[11px] transition-colors duration-300 ${done ? 'text-mute' : now ? 'text-signal' : 'text-faint'}`}>
                  <span className="w-6 text-[9.5px] text-faint">{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex-1">{b}</span>
                  <span>{done ? 'ok' : now ? <span className="a-caret">_</span> : '—'}</span>
                </li>
              )
            })}
          </ol>
          <Rule className="my-4" />
          <div className="flex items-center justify-between font-mono text-[10px]">
            <span className="text-faint">CHAIN HEAD</span>
            <span className={connected ? 'text-signal' : 'text-faint'}>
              {connected ? <>#{height} · <Hash value={head} len={16} /></> : 'awaiting node…'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ask the registry ─────────────────────────────────────────
const SUGGESTIONS = [
  'Which entity has the largest shortfall?',
  'How much would covering every shortfall cost at spot?',
  'Is the registry intact right now?',
]

function Ask({ onClose }: { onClose: () => void }) {
  const ask = useStore(s => s.ask)
  const [q, setQ] = useState('')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { input.current?.focus() }, [])
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const run = (text: string) => { if (text.trim()) askRegistry(text.trim()) }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-void/80 a-fade" onClick={onClose} />
      <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[14vh]">
        <div className="frame w-[min(680px,94vw)] border border-rule2 bg-panel a-rise">
          <span className="fx" />
          <form onSubmit={e => { e.preventDefault(); run(q) }} className="flex items-center gap-3 border-b border-rule px-4 py-3.5">
            <span className="font-mono text-[13px] text-signal">›</span>
            <input ref={input} value={q} onChange={e => setQ(e.target.value)}
              placeholder="Ask the registry anything about the live scheme"
              className="flex-1 bg-transparent text-[14px] text-bone placeholder:text-faint focus:outline-none" />
            <Btn size="sm" tone="ghost" onClick={() => run(q)} disabled={ask.busy || !q.trim()}>
              {ask.busy ? 'Thinking' : 'Ask'}
            </Btn>
          </form>

          <div className="p-4">
            {!ask.answer && !ask.busy && (
              <div className="space-y-1.5">
                <div className="eyebrow mb-2.5">Try</div>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => { setQ(s); run(s) }}
                    className="block w-full border border-transparent px-2.5 py-2 text-left text-[12.5px] text-mute transition hover:border-rule hover:text-bone">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {ask.busy && (
              <div className="sweep relative overflow-hidden border border-rule px-4 py-6 text-center font-mono text-[11px] text-dim">
                querying the registry
              </div>
            )}

            {ask.answer && !ask.busy && (
              <div className="a-rise">
                <p className="text-[14px] leading-relaxed text-bone">{ask.answer.answer}</p>
                {ask.answer.citations?.length > 0 && (
                  <ul className="mt-4 space-y-1.5 border-t border-rule pt-3.5">
                    {ask.answer.citations.map(c => (
                      <li key={c} className="flex gap-2.5 font-mono text-[10.5px] text-dim">
                        <span className="text-faint">+</span>{c}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <Tag tone={ask.answer.source === 'groq' ? 'ok' : 'warn'}>
                    {ask.answer.source === 'groq' ? `groq · ${ask.answer.model}` : 'offline fallback'}
                  </Tag>
                  <Btn size="sm" tone="quiet" onClick={() => { clearAsk(); setQ('') }}>Clear</Btn>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── chrome ───────────────────────────────────────────────────
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
        className="group flex items-center gap-3 border border-rule2 px-3 py-1.5 transition-colors hover:border-signal">
        <span className="text-left leading-tight">
          <span className="eyebrow block">{cur.label} desk</span>
          <span className="block text-[12px] font-medium">{cur.desk}</span>
        </span>
        <span className={`font-mono text-[11px] text-dim transition-transform duration-300 ${open ? 'rotate-45' : ''}`}>+</span>
      </button>

      {open && (
        <div className="frame absolute right-0 z-50 mt-2 w-[320px] border border-rule2 bg-panel a-rise">
          <span className="fx" />
          <div className="border-b border-rule px-3.5 py-2 eyebrow">Switch desk</div>
          <div className="stagger p-1.5">
            {ROLES.map((r, i) => (
              <button key={r.id} onClick={() => { setRole(r.id); setOpen(false) }}
                className={`flex w-full items-start gap-3 px-2.5 py-2.5 text-left transition-colors ${r.id === role ? 'bg-raise' : 'hover:bg-raise'}`}>
                <span className="mt-[3px] font-mono text-[9.5px] text-faint">{String(i + 1).padStart(2, '0')}</span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-[12.5px] font-medium">
                    {r.desk}{r.id === role && <Dot />}
                  </span>
                  <span className="mt-1 block text-[11px] leading-snug text-dim">{r.blurb}</span>
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
  const connected = useStore(s => s.connected)
  const last = chain[chain.length - 1]
  if (!last) return null

  return (
    <footer className={`relative z-20 flex items-center gap-5 border-t px-4 py-2 transition-colors duration-500
      ${integrity === 'broken' ? 'border-breach/40 bg-breach/[.04]' : 'border-rule bg-panel/70'}`}>
      <div className="flex shrink-0 items-center gap-2.5">
        <Dot tone={!connected ? '#5c6268' : integrity === 'broken' ? '#e2503f' : '#3ecf9a'} pulse={connected} />
        <span className="eyebrow">Chain</span>
        <span className="font-mono text-[12px] font-medium">#{last.index}</span>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
        {chain.slice(-10).map(b => (
          <div key={b.index} className="a-block flex shrink-0 items-center gap-1">
            <div className={`border px-1.5 py-[3px] font-mono text-[8.5px] leading-tight
              ${b.valid ? 'border-rule text-dim' : 'border-breach/60 text-breach'}`}>
              <div>#{b.index}</div>
              <div className="opacity-60">{b.hash.slice(0, 6)}</div>
            </div>
            <span className={`h-px w-1.5 ${b.valid ? 'bg-rule2' : 'bg-breach/60'}`} />
          </div>
        ))}
        <div className={`sweep relative shrink-0 overflow-hidden border border-dashed px-2 py-1 font-mono text-[8.5px]
          ${forging ? 'border-signal/60 text-signal' : 'border-rule text-faint'}`}>
          {forging ? 'sealing' : `${mempool} pending`}
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-2.5 md:flex">
        <span className="eyebrow">head</span>
        <Hash value={last.hash} len={22} className={`text-[10px] ${integrity === 'broken' ? 'text-breach' : 'text-signal'}`} />
      </div>
    </footer>
  )
}

function Toasts() {
  const toasts = useStore(s => s.toasts)
  const c = { ok: '#3ecf9a', warn: '#d8a83a', bad: '#e2503f', info: '#8d9299' }
  return (
    <div className="pointer-events-none fixed bottom-14 right-4 z-50 flex w-[340px] flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className="frame a-slideL border border-rule2 bg-panel/95 p-3.5 backdrop-blur">
          <span className="fx" />
          <div className="flex items-center gap-2.5">
            <span className="h-[5px] w-[5px] rounded-full" style={{ background: c[t.kind] }} />
            <span className="font-mono text-[10px] uppercase tracking-[.16em]" style={{ color: c[t.kind] }}>{t.title}</span>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-snug text-mute">{t.body}</p>
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
    <div className="relative overflow-hidden border-b border-rule py-1.5">
      <div className="a-ticker flex w-max gap-10 whitespace-nowrap">
        {row.map((t, i) => (
          <span key={t.id + i} className="flex items-center gap-2.5 font-mono text-[10px]">
            <span className="uppercase tracking-[.16em]" style={{ color: TX_TONE[t.kind] }}>{t.kind}</span>
            <span className="text-faint">{t.note}</span>
          </span>
        ))}
      </div>
      <span className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-void to-transparent" />
      <span className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-void to-transparent" />
    </div>
  )
}

export default function App() {
  const role = useStore(s => s.role)
  const view = useStore(s => s.view)
  const live = useStore(s => s.live)
  const price = useStore(s => s.price)
  const booted = useStore(s => s.booted)
  const connected = useStore(s => s.connected)
  const [ask, setAsk] = useState(false)
  const menu = MENUS[role]

  useEffect(() => { connect(); return disconnect }, [])
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setAsk(a => !a) }
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [])

  const Body = { ops: LiveOps, registry: Registry, market: Market, compliance: Compliance, verify: VerifyQueue, vault: Vault }[view]
  const t = TITLES[view]

  return (
    <div className="flex h-full flex-col bg-void">
      {!booted && <Boot />}

      <header className="relative z-30 flex items-center gap-5 border-b border-rule px-4 py-3">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-[15px] font-semibold tracking-[-.02em]">CarbonLedger</span>
          <span className="eyebrow hidden sm:block">CCTS MRV &amp; credit exchange</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button onClick={() => setAsk(true)}
            className="hidden items-center gap-3 border border-rule px-3 py-1.5 text-[11.5px] text-dim transition-colors hover:border-signal hover:text-bone md:flex">
            <span className="font-mono text-signal">›</span> Ask the registry
            <span className="font-mono text-[9.5px] text-faint">⌘K</span>
          </button>

          <div className="hidden items-baseline gap-2.5 border border-rule px-3 py-1.5 sm:flex">
            <span className="eyebrow">CCC spot</span>
            <span className="font-mono text-[13px] text-signal tnum"><Num value={price} prefix="₹" /></span>
          </div>

          <button onClick={() => setLive(!live)}
            className="border border-rule px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[.18em] text-dim transition-colors hover:border-signal hover:text-signal">
            {live ? 'live' : 'paused'}
          </button>

          <RoleSwitch />
        </div>
      </header>

      <Ticker />

      <div className="flex min-h-0 flex-1">
        <nav className="hidden w-[228px] shrink-0 flex-col border-r border-rule p-3 lg:flex">
          <div className="eyebrow px-2 pb-3">{role} workspace</div>
          <div key={role} className="stagger flex flex-col">
            {menu.map((m, i) => {
              const on = view === m.id
              return (
                <button key={m.id} onClick={() => setView(m.id)}
                  className={`group relative flex items-start gap-3 border-l px-3 py-2.5 text-left transition-all duration-200
                    ${on ? 'border-signal bg-raise/60' : 'border-transparent hover:border-rule2 hover:bg-raise/30'}`}>
                  <span className={`mt-[3px] font-mono text-[9.5px] ${on ? 'text-signal' : 'text-faint'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0">
                    <span className={`block truncate text-[12.5px] ${on ? 'text-bone' : 'text-mute group-hover:text-bone'}`}>{m.label}</span>
                    <span className="block truncate text-[10.5px] text-faint">{m.hint}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-auto border-t border-rule pt-3">
            <div className="flex items-center gap-2 eyebrow">
              <Dot tone={connected && live ? '#3ecf9a' : '#5c6268'} pulse={connected && live} />
              {!connected ? 'node offline' : live ? 'ingesting' : 'ingest paused'}
            </div>
            <p className="mt-2 px-0.5 text-[10.5px] leading-relaxed text-faint">
              Devices push signed telemetry every 1.1 s. The registry node hashes each batch and anchors it automatically.
            </p>
          </div>
        </nav>

        <main className="grid-bg min-w-0 flex-1 overflow-y-auto">
          <div className="vignette min-h-full px-5 py-6">
            <div key={view} className="a-rise">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="eyebrow mb-2">{clock(Date.now())} IST · India CCTS · FY 2026-27</div>
                  <h1 className="font-display text-[30px] font-semibold leading-none tracking-[-.03em]">{t.h}</h1>
                  <p className="mt-2.5 max-w-[62ch] text-[13px] leading-relaxed text-dim">{t.s}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 lg:hidden">
                  {menu.map(m => (
                    <button key={m.id} onClick={() => setView(m.id)}
                      className={`border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.14em] ${view === m.id ? 'border-signal text-signal' : 'border-rule text-dim'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <Body />
            </div>
          </div>
        </main>
      </div>

      <ForgeDock />
      <Toasts />
      {ask && <Ask onClose={() => setAsk(false)} />}
    </div>
  )
}
