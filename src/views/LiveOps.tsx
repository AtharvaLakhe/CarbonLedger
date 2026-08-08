import { useEffect, useState } from 'react'
import {
  useStore, select, submitReport, PIPELINE, SECTOR_COLOR, compact, type Facility,
} from '../sim'
import { Btn, Dot, Frame, Hash, Meter, Num, Rule, Spark, Tag, clock, tone } from '../ui'

function status(f: Facility) {
  const r = f.actualIntensity / f.targetIntensity
  if (r > 1.02) return { t: 'bad' as const, c: '#e2503f', label: 'Over target' }
  if (r > 0.995) return { t: 'warn' as const, c: '#d8a83a', label: 'At threshold' }
  return { t: 'ok' as const, c: '#3ecf9a', label: 'Surplus' }
}

function Card({ f, onOpen, active, index }: { f: Facility; onOpen: () => void; active: boolean; index: number }) {
  const st = status(f)
  const pct = f.emitted / f.cap
  return (
    <button onClick={onOpen}
      className={`frame group border bg-panel/40 p-4 text-left transition-colors duration-300 hover:bg-raise/40
        ${active ? 'frame-lit border-signal/50' : 'border-rule'}`}>
      <span className="fx" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9.5px] text-faint">{String(index + 1).padStart(2, '0')}</span>
            <span className="h-[6px] w-[6px]" style={{ background: SECTOR_COLOR[f.sector] }} />
          </div>
          <div className="mt-2 truncate font-display text-[15px] font-medium tracking-[-.01em]">{f.name}</div>
          <div className="mt-1 truncate font-mono text-[10px] text-faint">{f.id} · {f.state}</div>
        </div>
        <Spark data={f.series} color={st.c} w={78} h={30} />
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Emitted YTD</div>
          <div className="mt-1.5 font-mono text-[19px] leading-none tnum">
            <Num value={f.emitted / 1e6} d={2} /><span className="ml-1 text-[11px] text-dim">Mt</span>
          </div>
        </div>
        <div className="text-right">
          <div className="eyebrow">Intensity</div>
          <div className="mt-1.5 font-mono text-[13px] tnum" style={{ color: st.c }}>
            {f.actualIntensity.toFixed(2)}<span className="text-faint"> / {f.targetIntensity.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Meter pct={pct} label={(pct * 100).toFixed(1) + '% of cap'} sub={st.label} />
      </div>

      <div className="reveal">
        <Rule className="my-3.5" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {f.sensors.map(s => (
            <div key={s.id} className="flex items-baseline justify-between gap-2 font-mono text-[10px]">
              <span className="truncate text-faint">{s.id}</span>
              <span className="tnum text-mute">{s.value.toFixed(1)} {s.unit}</span>
            </div>
          ))}
        </div>
      </div>
    </button>
  )
}

function Pipeline({ stage }: { stage: number }) {
  return (
    <ol className="space-y-2.5">
      {PIPELINE.map((s, i) => {
        const done = stage > i
        const now = stage === i
        return (
          <li key={s} className={`flex items-center gap-3 font-mono text-[11px] transition-colors duration-300
            ${done ? 'text-mute' : now ? 'text-signal' : 'text-faint'}`}>
            <span className="w-5 text-[9.5px] text-faint">{String(i + 1).padStart(2, '0')}</span>
            <span className="flex-1">{s}</span>
            <span>{done ? 'ok' : now ? <span className="a-caret">_</span> : '—'}</span>
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
  const [tab, setTab] = useState<'live' | 'mrv'>('live')
  const pct = f.emitted / f.cap
  const st = status(f)

  useEffect(() => { if (rep?.status === 'ingesting') setTab('mrv') }, [rep?.status])
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 z-30 bg-void/80 a-fade" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-40 flex h-full w-[min(500px,95vw)] flex-col border-l border-rule bg-panel a-slideL">
        <header className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-[6px] w-[6px]" style={{ background: SECTOR_COLOR[f.sector] }} />
              <span className="eyebrow">{f.sector}</span>
            </div>
            <h2 className="truncate font-display text-[19px] font-medium tracking-[-.02em]">{f.name}</h2>
            <div className="mt-1 font-mono text-[10.5px] text-faint">{f.operator} · {f.id}</div>
          </div>
          <button onClick={onClose} className="font-mono text-[15px] text-dim transition hover:text-bone">×</button>
        </header>

        <nav className="flex gap-6 border-b border-rule px-5">
          {(['live', 'mrv'] as const).map(x => (
            <button key={x} onClick={() => setTab(x)}
              className={`relative py-3 font-mono text-[10px] uppercase tracking-[.18em] transition-colors ${tab === x ? 'text-signal' : 'text-faint hover:text-mute'}`}>
              {x === 'live' ? 'Live telemetry' : 'MRV report'}
              {tab === x && <span className="absolute inset-x-0 -bottom-px h-px bg-signal" />}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'live' ? (
            <div className="space-y-7 stagger">
              <div>
                <div className="mb-4 flex items-end justify-between">
                  <div>
                    <div className="eyebrow">Emitted against allowance</div>
                    <div className="mt-2 font-mono text-[26px] leading-none tnum" style={{ color: st.c }}>
                      <Num value={f.emitted} />
                    </div>
                    <div className="mt-1.5 font-mono text-[11px] text-faint">of {compact(f.cap)} tCO2e</div>
                  </div>
                  <Spark data={f.series} color={st.c} w={150} h={48} />
                </div>
                <Meter pct={pct} label={(pct * 100).toFixed(1) + '%'} sub={st.label} />
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="eyebrow">Connected devices</span>
                  <Tag tone="ok"><Dot />{f.sensors.length} streaming</Tag>
                </div>
                <div>
                  {f.sensors.map(s => {
                    const dev = Math.abs(s.value - s.base) / s.base
                    return (
                      <div key={s.id} className="flex items-center gap-4 border-b border-rule py-2.5 last:border-0">
                        <span className="w-[62px] shrink-0 font-mono text-[10px] text-faint">{s.id}</span>
                        <span className="min-w-0 flex-1 truncate text-[12px] text-mute">{s.label}</span>
                        <span className="font-mono text-[13px] tnum" style={{ color: dev > 0.045 ? '#d8a83a' : '#ece9e3' }}>
                          {s.value.toFixed(1)}
                        </span>
                        <span className="w-9 text-right font-mono text-[9.5px] text-faint">{s.unit}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 a-fade">
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                {[
                  ['Compliance period', 'FY 2026-27 · Q2'],
                  ['Notified target', f.targetIntensity.toFixed(2) + ' tCO2e/t'],
                  ['Measured intensity', f.actualIntensity.toFixed(2) + ' tCO2e/t'],
                  ['Product output', compact(f.output) + ' t'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="eyebrow">{k}</div>
                    <div className="mt-1.5 font-mono text-[14px]">{v}</div>
                  </div>
                ))}
              </div>

              {!rep && (
                <div className="border-t border-rule pt-5">
                  <p className="text-[12.5px] leading-relaxed text-dim">
                    Telemetry for this period is complete. Generating the report pulls every device reading, applies
                    IPCC 2006 emission factors and anchors the result to the registry — no spreadsheet round-trip.
                  </p>
                  <Btn tone="primary" className="mt-5 w-full" onClick={() => submitReport(f.id)} disabled={role !== 'industry'}>
                    Submit MRV report
                  </Btn>
                  {role !== 'industry' && <p className="mt-2.5 text-center text-[11px] text-faint">Switch to the Industry desk to file a report.</p>}
                </div>
              )}

              {rep && (
                <div className="border-t border-rule pt-5">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-mono text-[13px]">{rep.id}</span>
                    <Tag tone={rep.status === 'verified' ? 'ok' : rep.status === 'rejected' ? 'bad' : rep.status === 'pending' ? 'info' : 'warn'}>
                      {rep.status}
                    </Tag>
                  </div>
                  <Pipeline stage={rep.stage} />
                  {rep.hash && (
                    <div className="mt-5 border-t border-rule pt-3.5">
                      <div className="eyebrow">Anchored digest</div>
                      <Hash value={rep.hash} len={34} className="mt-1.5 block text-[11.5px] text-signal" />
                    </div>
                  )}
                  <div className="mt-3.5 font-mono text-[10.5px] text-faint">assigned to {rep.verifier}</div>
                  {rep.status === 'pending' && (
                    <p className="mt-5 text-center text-[11.5px] text-dim">
                      Now switch to the <span className="text-signal">Verifier</span> desk to review it.
                    </p>
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
  const height = useStore(s => s.chainHeight)
  const certs = useStore(s => s.certs)
  const stream = useStore(s => s.stream)
  const reports = useStore(s => s.reports)
  const f = facilities.find(x => x.id === selected)

  const emitted = facilities.reduce((a, b) => a + b.emitted, 0)
  const cap = facilities.reduce((a, b) => a + b.cap, 0)
  const devices = facilities.reduce((a, b) => a + b.sensors.length, 0)
  const circulating = certs.filter(c => c.status !== 'retired').reduce((a, b) => a + b.qty, 0)

  const kpis = [
    { k: 'Obligated entities', v: String(facilities.length), s: 'across 8 CCTS sectors', c: '#ece9e3' },
    { k: 'Devices streaming', v: String(devices), s: 'CEMS · SCADA · meters', c: '#ece9e3' },
    { k: 'Emissions vs cap', v: cap ? ((emitted / cap) * 100).toFixed(1) + '%' : '—', s: compact(emitted) + ' tCO2e YTD', c: tone(emitted / (cap || 1)) },
    { k: 'CCC in circulation', v: circulating.toLocaleString('en-IN'), s: 'issued minus retired', c: '#3ecf9a' },
    { k: 'Registry height', v: '#' + height, s: 'blocks sealed', c: '#ece9e3' },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 border border-rule md:grid-cols-5">
        {kpis.map((x, i) => (
          <div key={x.k} className={`p-4 ${i ? 'md:border-l' : ''} border-rule ${i < 4 ? 'max-md:border-b' : ''} ${i % 2 && i < 4 ? 'max-md:border-l' : ''}`}>
            <div className="eyebrow">{x.k}</div>
            <div className="mt-2.5 font-mono text-[24px] leading-none tnum" style={{ color: x.c }}>{x.v}</div>
            <div className="mt-2 truncate text-[10.5px] text-faint">{x.s}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="eyebrow">Facility telemetry — hover a card to expand its devices</span>
          <span className="flex items-center gap-2 eyebrow"><Dot />live · {clock(Date.now())} IST</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 stagger">
          {facilities.map((x, i) => (
            <Card key={x.id} f={x} index={i} active={x.id === selected} onOpen={() => select(x.id)} />
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <Frame title="Device ingest stream" index="01" right={<Tag tone="info"><Dot tone="#8d9299" />signed at source</Tag>} pad={false}>
          <div className="max-h-[250px] overflow-y-auto">
            {stream.map((s, i) => (
              <div key={s.key} className={`flex items-center gap-4 border-b border-rule px-4 py-2 font-mono text-[10.5px] last:border-0 ${i === 0 ? 'a-fade bg-raise/50' : ''}`}>
                <span className="text-faint">{clock(s.ts)}</span>
                <span className="w-[58px] shrink-0 text-mute">{s.dev}</span>
                <span className="min-w-0 flex-1 truncate text-dim">{s.label}</span>
                <span className="tnum text-bone">{s.value}</span>
                <span className="w-9 text-right text-faint">{s.unit}</span>
              </div>
            ))}
            {!stream.length && <div className="px-4 py-10 text-center font-mono text-[11px] text-faint">waiting for the first batch…</div>}
          </div>
        </Frame>

        <Frame title="Reporting queue" index="02" right={<Tag tone={reports.length ? 'ok' : 'mute'}>{reports.length} filed</Tag>} pad={false}>
          {!reports.length ? (
            <div className="px-6 py-10 text-center">
              <p className="mx-auto max-w-[46ch] text-[12.5px] leading-relaxed text-dim">
                No report filed yet for FY 2026-27 · Q2. Open any facility and submit its MRV report — the platform
                assembles it from device data and anchors the result in seconds instead of a six-week audit cycle.
              </p>
            </div>
          ) : (
            <div>
              {reports.map(r => (
                <button key={r.id} onClick={() => select(r.facilityId)}
                  className="flex w-full items-center gap-4 border-b border-rule px-4 py-3 text-left transition-colors last:border-0 hover:bg-raise/50">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px]">{r.facility}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-faint">{r.id} · {r.verifier}</div>
                  </div>
                  <Tag tone={r.status === 'verified' ? 'ok' : r.status === 'rejected' ? 'bad' : r.status === 'pending' ? 'info' : 'warn'}>{r.status}</Tag>
                </button>
              ))}
            </div>
          )}
        </Frame>
      </div>

      {f && <Drawer f={f} onClose={() => select(null)} />}
    </div>
  )
}
