import { useEffect, useState } from 'react'
import { Activity, ArrowUpRight, Cpu, FileCheck2, Radio, ShieldCheck, X, Zap } from 'lucide-react'
import { useStore, select, submitReport, PIPELINE } from '../sim'
import { SECTOR_COLOR, compact, type Facility } from '../data'
import { Bar, Btn, Dot, Gauge, Hash, Num, Panel, Pill, Spark, clock } from '../ui'

const KIND_ICON = { stack: Radio, fuel: Zap, power: Activity, flow: Cpu } as const

function statusOf(f: Facility) {
  const r = f.actualIntensity / f.targetIntensity
  if (r > 1.02) return { tone: 'bad' as const, col: '#ff4d5e', text: 'Over target' }
  if (r > 0.995) return { tone: 'warn' as const, col: '#ffc24b', text: 'At threshold' }
  return { tone: 'ok' as const, col: '#2fe0a4', text: 'Surplus' }
}

function FacilityCard({ f, onOpen, active }: { f: Facility; onOpen: () => void; active: boolean }) {
  const st = statusOf(f)
  const sc = SECTOR_COLOR[f.sector]
  const pct = f.emitted / f.cap
  return (
    <button
      onClick={onOpen}
      className={`group relative overflow-hidden rounded-lg border bg-panel/70 p-3.5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-verdant/40 hover:shadow-[0_14px_40px_-22px_rgba(47,224,164,.6)]
        ${active ? 'border-verdant/60 shadow-[0_0_0_1px_rgba(47,224,164,.35)]' : 'border-line'}`}
    >
      <span className="absolute inset-x-0 top-0 h-px opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${sc}, transparent)` }} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-display text-[13.5px] font-semibold tracking-tight">{f.name}</div>
          <div className="mt-0.5 truncate font-mono text-[10px] text-dim">{f.id} · {f.state}</div>
        </div>
        <Gauge pct={pct} size={54} label={(pct * 100).toFixed(0) + '%'} />
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        <Pill tone="mute" className="!border-transparent !bg-transparent !px-0" >
          <span className="h-1.5 w-1.5 rounded-[2px]" style={{ background: sc }} />{f.sector}
        </Pill>
      </div>

      <div className="mt-2.5 flex items-end justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-[.14em] text-dim">Emitted YTD</div>
          <div className="font-mono text-[15px] font-semibold text-text">
            <Num value={f.emitted / 1e6} d={2} suffix=" Mt" />
          </div>
        </div>
        <Spark data={f.series} color={st.col} w={92} h={30} />
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2.5">
        <Pill tone={st.tone}><Dot tone={st.col} />{st.text}</Pill>
        <span className="font-mono text-[10px] text-dim tnum">
          {f.actualIntensity.toFixed(2)} / {f.targetIntensity.toFixed(2)}
        </span>
      </div>
      <ArrowUpRight size={13} className="absolute right-3 top-1/2 -translate-y-1/2 translate-x-3 text-verdant opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
    </button>
  )
}

function Pipeline({ stage }: { stage: number }) {
  return (
    <ol className="space-y-2">
      {PIPELINE.map((s, i) => {
        const done = stage > i
        const now = stage === i
        return (
          <li key={s} className="flex items-center gap-2.5">
            <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[8px] font-bold transition-all duration-400
              ${done ? 'border-verdant bg-verdant text-[#04150f]' : now ? 'border-verdant text-verdant a-ring' : 'border-line2 text-dim'}`}>
              {done ? '✓' : i + 1}
            </span>
            <span className={`text-[12px] transition-colors duration-300 ${done ? 'text-text' : now ? 'text-verdant' : 'text-dim'}`}>{s}</span>
            {now && <span className="ml-auto font-mono text-[9.5px] text-verdant">running</span>}
          </li>
        )
      })}
    </ol>
  )
}

function Drawer({ f, onClose }: { f: Facility; onClose: () => void }) {
  const reports = useStore(s => s.reports)
  const role = useStore(s => s.role)
  const rep = reports.find(r => r.facilityId === f.id)
  const pct = f.emitted / f.cap
  const st = statusOf(f)
  const [tab, setTab] = useState<'live' | 'mrv'>('live')

  useEffect(() => { if (rep?.status === 'ingesting') setTab('mrv') }, [rep?.status])
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 z-30 bg-ink/70 backdrop-blur-[3px] a-rise" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-40 flex h-full w-[min(480px,94vw)] flex-col border-l border-line bg-panel a-slideL">
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: SECTOR_COLOR[f.sector] }} />
              <h2 className="truncate font-display text-[16px] font-semibold tracking-tight">{f.name}</h2>
            </div>
            <div className="mt-0.5 font-mono text-[10.5px] text-dim">{f.operator} · {f.id}</div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-dim transition hover:bg-panel2 hover:text-text"><X size={16} /></button>
        </header>

        <nav className="flex gap-1 border-b border-line px-3 pt-2">
          {(['live', 'mrv'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`relative px-3 py-2 font-mono text-[10.5px] uppercase tracking-[.15em] transition-colors ${tab === t ? 'text-verdant' : 'text-dim hover:text-mute'}`}>
              {t === 'live' ? 'Live telemetry' : 'MRV report'}
              {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-verdant" />}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'live' ? (
            <div className="space-y-4 stagger">
              <div className="flex items-center gap-4 rounded-lg border border-line bg-panel2/60 p-3.5">
                <Gauge pct={pct} size={88} label={(pct * 100).toFixed(1) + '%'} sub="of cap" />
                <div className="flex-1 space-y-2.5">
                  <div>
                    <div className="text-[10px] uppercase tracking-[.14em] text-dim">Allowance</div>
                    <div className="font-mono text-[13px]">{compact(f.cap)} tCO2e</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[.14em] text-dim">Emitted</div>
                    <div className="font-mono text-[13px]" style={{ color: st.col }}><Num value={f.emitted} /> tCO2e</div>
                  </div>
                  <Bar pct={pct} color={st.col} />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-mono text-[10px] uppercase tracking-[.18em] text-mute">Connected devices</h3>
                  <Pill tone="ok"><Dot />{f.sensors.length} streaming</Pill>
                </div>
                <div className="space-y-1.5">
                  {f.sensors.map(s => {
                    const Icon = KIND_ICON[s.kind]
                    const dev = (s.value - s.base) / s.base
                    return (
                      <div key={s.id} className="flex items-center gap-3 rounded border border-line bg-panel2/50 px-3 py-2 transition hover:border-line2">
                        <Icon size={13} className="shrink-0 text-dim" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[12px]">{s.label}</div>
                          <div className="font-mono text-[9.5px] text-dim">{s.id}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-[13px] font-semibold tnum" style={{ color: Math.abs(dev) > 0.03 ? '#ffc24b' : '#e6edf3' }}>
                            {s.value.toFixed(1)}
                          </div>
                          <div className="font-mono text-[9.5px] text-dim">{s.unit}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-line bg-panel2/50 p-3">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[.18em] text-mute">Emissions rate · last 40 intervals</div>
                <Spark data={f.series} color={st.col} w={410} h={82} />
              </div>
            </div>
          ) : (
            <div className="space-y-4 a-rise">
              <div className="rounded-lg border border-line bg-panel2/60 p-3.5">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Compliance period', 'FY 2026-27 · Q2'],
                    ['Notified target', f.targetIntensity.toFixed(2) + ' tCO2e/t'],
                    ['Measured intensity', f.actualIntensity.toFixed(2) + ' tCO2e/t'],
                    ['Product output', compact(f.output) + ' t'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div className="text-[9.5px] uppercase tracking-[.14em] text-dim">{k}</div>
                      <div className="mt-0.5 font-mono text-[12.5px]">{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {!rep && (
                <div className="rounded-lg border border-dashed border-line2 bg-panel2/30 p-4">
                  <p className="text-[12.5px] leading-relaxed text-mute">
                    Telemetry for this period is complete. Generating the report pulls every device reading,
                    applies IPCC 2006 emission factors and anchors the result to the registry — no spreadsheet round-trip.
                  </p>
                  <Btn tone="primary" className="mt-3.5 w-full" onClick={() => submitReport(f.id)} disabled={role !== 'industry'}>
                    <FileCheck2 size={14} /> Submit MRV report
                  </Btn>
                  {role !== 'industry' && <p className="mt-2 text-center text-[11px] text-dim">Switch to the Industry desk to file a report.</p>}
                </div>
              )}

              {rep && (
                <div className="space-y-3.5">
                  <div className={`rounded-lg border p-3.5 ${rep.status === 'verified' ? 'border-verdant/40 bg-verdant/6' : rep.status === 'rejected' ? 'border-breach/40 bg-breach/6' : 'border-line bg-panel2/60'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[12px] font-semibold">{rep.id}</span>
                      <Pill tone={rep.status === 'verified' ? 'ok' : rep.status === 'rejected' ? 'bad' : rep.status === 'pending' ? 'info' : 'warn'}>
                        {rep.status}
                      </Pill>
                    </div>
                    <div className="mt-3"><Pipeline stage={rep.stage} /></div>
                    {rep.hash && (
                      <div className="mt-3 border-t border-line pt-2.5">
                        <div className="text-[9.5px] uppercase tracking-[.14em] text-dim">Anchored digest</div>
                        <Hash value={rep.hash} len={34} className="text-[11px] text-signal" />
                      </div>
                    )}
                    <div className="mt-2.5 flex items-center gap-2 text-[11px] text-dim">
                      <ShieldCheck size={12} /> Assigned to {rep.verifier}
                    </div>
                  </div>
                  {rep.status === 'pending' && (
                    <p className="text-center text-[11.5px] text-dim">Now switch to the <span className="text-violet">Verifier</span> desk to approve it.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

export default function LiveOps() {
  const facilities = useStore(s => s.facilities)
  const selected = useStore(s => s.selected)
  const chain = useStore(s => s.chain)
  const certs = useStore(s => s.certs)
  const tick = useStore(s => s.tick)
  const reports = useStore(s => s.reports)
  const f = facilities.find(x => x.id === selected)

  type Line = { key: string; ts: number; dev: string; label: string; value: string; unit: string }
  const [stream, setStream] = useState<Line[]>([])
  useEffect(() => {
    if (!facilities.length) return
    const fac = facilities[tick % facilities.length]
    const sn = fac.sensors[(tick * 3) % fac.sensors.length]
    setStream(prev => prev[0]?.key === 'k' + tick ? prev : [{
      key: 'k' + tick, ts: Date.now(), dev: sn.id,
      label: `${sn.label} · ${fac.name}`, value: sn.value.toFixed(1), unit: sn.unit,
    }, ...prev].slice(0, 40))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick])

  const totalEmitted = facilities.reduce((a, b) => a + b.emitted, 0)
  const totalCap = facilities.reduce((a, b) => a + b.cap, 0)
  const devices = facilities.reduce((a, b) => a + b.sensors.length, 0)
  const circulating = certs.filter(c => c.status !== 'retired').reduce((a, b) => a + b.qty, 0)

  const kpis = [
    { k: 'Obligated entities', v: facilities.length.toString(), s: '8 CCTS sectors', c: '#e6edf3' },
    { k: 'Devices streaming', v: devices.toString(), s: 'CEMS · SCADA · meters', c: '#5aa2ff' },
    { k: 'Emissions vs cap', v: ((totalEmitted / totalCap) * 100).toFixed(1) + '%', s: compact(totalEmitted) + ' tCO2e YTD', c: totalEmitted > totalCap ? '#ff4d5e' : '#2fe0a4' },
    { k: 'CCC in circulation', v: circulating.toLocaleString('en-IN'), s: 'issued minus retired', c: '#2fe0a4' },
    { k: 'Registry height', v: '#' + chain[chain.length - 1].index, s: chain.length + ' blocks held', c: '#a78bfa' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5 stagger">
        {kpis.map(x => (
          <div key={x.k} className="relative overflow-hidden rounded-lg border border-line bg-panel/70 p-3">
            <div className="text-[9.5px] uppercase tracking-[.15em] text-dim">{x.k}</div>
            <div className="mt-1.5 font-mono text-[21px] font-semibold leading-none tnum" style={{ color: x.c }}>{x.v}</div>
            <div className="mt-1.5 truncate text-[10.5px] text-dim">{x.s}</div>
          </div>
        ))}
      </div>

      <Panel
        title="Facility telemetry"
        right={<span className="flex items-center gap-2 font-mono text-[10px] text-dim"><Dot />live · {clock(Date.now())} IST · tick {tick}</span>}
      >
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4 stagger">
          {facilities.map(x => (
            <FacilityCard key={x.id} f={x} active={x.id === selected} onOpen={() => select(x.id)} />
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Panel title="Device ingest stream" right={<Pill tone="info"><Dot tone="#5aa2ff" />signed at source</Pill>}>
          <div className="max-h-[240px] space-y-px overflow-y-auto pr-1">
            {stream.map((s, i) => (
              <div key={s.key} className={`flex items-center gap-2.5 rounded px-2 py-[5px] font-mono text-[11px] ${i === 0 ? 'a-rise bg-panel2/60' : 'hover:bg-panel2/40'}`}>
                <span className="text-dim">{clock(s.ts)}</span>
                <span className="w-[62px] shrink-0 text-signal">{s.dev}</span>
                <span className="min-w-0 flex-1 truncate text-mute">{s.label}</span>
                <span className="tnum text-text">{s.value}</span>
                <span className="w-[38px] text-right text-dim">{s.unit}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Reporting queue" right={<Pill tone={reports.length ? 'ok' : 'mute'}>{reports.length} filed this period</Pill>}>
          {!reports.length ? (
            <div className="px-2 py-6 text-center">
              <p className="mx-auto max-w-[46ch] text-[12.5px] leading-relaxed text-dim">
                No report filed yet for FY 2026-27 · Q2. Open any facility and submit its MRV report — the platform
                assembles it from device data and anchors the result in seconds instead of a six-week audit cycle.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {reports.map(r => (
                <button key={r.id} onClick={() => select(r.facilityId)}
                  className="flex w-full items-center gap-2.5 rounded border border-line bg-panel2/40 px-3 py-2 text-left transition hover:border-verdant/40">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px]">{r.facility}</div>
                    <div className="font-mono text-[10px] text-dim">{r.id} · {r.verifier}</div>
                  </div>
                  <Pill tone={r.status === 'verified' ? 'ok' : r.status === 'rejected' ? 'bad' : r.status === 'pending' ? 'info' : 'warn'}>{r.status}</Pill>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {f && <Drawer f={f} onClose={() => select(null)} />}
    </div>
  )
}
