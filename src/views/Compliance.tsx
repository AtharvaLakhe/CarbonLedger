import { useState } from 'react'
import { Check, ClipboardCheck, Inbox, MapPin, X } from 'lucide-react'
import { useStore, decideReport, select, setView } from '../sim'
import { SECTOR_COLOR, VERIFIERS, compact } from '../data'
import { Bar, Btn, Dot, Empty, Hash, Num, Panel, Pill, Spark, timeAgo } from '../ui'

// Schematic outline of India in the same 0-100 space the facility pins use.
const INDIA = 'M34 9 L44 13 L51 11 L57 20 L65 22 L74 20 L79 26 L73 30 L69 35 L63 33 L65 42 L60 52 L54 62 L49 74 L44 89 L38 76 L34 62 L28 50 L21 44 L15 39 L21 33 L27 29 L25 21 Z'

export function VerifyQueue() {
  const reports = useStore(s => s.reports)
  const facilities = useStore(s => s.facilities)
  const pending = reports.filter(r => r.status === 'pending' || r.status === 'ingesting')
  const done = reports.filter(r => r.status === 'verified' || r.status === 'rejected')

  return (
    <div className="space-y-4">
    <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
      <Panel title="Awaiting verification" right={<Pill tone={pending.length ? 'info' : 'mute'}>{pending.length} in queue</Pill>}>
        {!pending.length ? (
          <Empty icon={<Inbox size={20} />} title="Queue is clear"
            body="Reports land here the moment a facility anchors one. Open the Industry desk, pick a facility and submit an MRV report to see it arrive."
            action={<Btn tone="ghost" onClick={() => { setView('ops') }}>Go to Industry desk</Btn>} />
        ) : (
          <div className="space-y-2.5 stagger">
            {pending.map(r => {
              const f = facilities.find(x => x.id === r.facilityId)!
              const beat = f.targetIntensity - f.actualIntensity
              const busy = r.status === 'ingesting'
              return (
                <article key={r.id} className="rounded-lg border border-line bg-panel2/50 p-3.5 transition hover:border-line2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-display text-[14px] font-semibold tracking-tight">{r.facility}</div>
                      <div className="mt-0.5 font-mono text-[10.5px] text-dim">{r.id} · {r.period} · {timeAgo(r.submittedAt)}</div>
                    </div>
                    <Pill tone={busy ? 'warn' : 'info'}>{busy ? 'ingesting' : 'ready to review'}</Pill>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-3 rounded border border-line bg-panel/60 p-2.5">
                    {[
                      ['Reported', compact(r.tCO2e) + ' tCO2e', '#e6edf3'],
                      ['Intensity', r.intensity.toFixed(2), beat >= 0 ? '#2fe0a4' : '#ff4d5e'],
                      ['Target', r.target.toFixed(2), '#7b8fa3'],
                    ].map(([k, v, c]) => (
                      <div key={k}>
                        <div className="text-[9px] uppercase tracking-[.14em] text-dim">{k}</div>
                        <div className="mt-0.5 font-mono text-[13px] font-semibold" style={{ color: c }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {r.hash && (
                    <div className="mt-2.5">
                      <span className="text-[9px] uppercase tracking-[.14em] text-dim">Anchored digest </span>
                      <Hash value={r.hash} len={30} className="text-[10.5px] text-signal" />
                    </div>
                  )}

                  <p className="mt-2.5 text-[11.5px] leading-relaxed text-dim">
                    {beat >= 0
                      ? `Beat the notified target by ${beat.toFixed(2)} tCO2e/t. Approving mints ${Math.round(beat * f.output / 1000).toLocaleString('en-IN')} CCC to ${f.operator}.`
                      : `Missed the notified target by ${Math.abs(beat).toFixed(2)} tCO2e/t. Approving records a shortfall that must be met by surrendering CCCs.`}
                  </p>

                  <div className="mt-3 flex gap-2">
                    <Btn tone="primary" size="sm" disabled={busy} onClick={() => decideReport(r.id, true)}><Check size={13} /> Approve &amp; issue</Btn>
                    <Btn tone="danger" size="sm" disabled={busy} onClick={() => decideReport(r.id, false)}><X size={13} /> Reject</Btn>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </Panel>

      <Panel title="Decision log" right={<Pill tone="mute">{done.length} closed</Pill>}>
        {!done.length ? (
          <Empty icon={<ClipboardCheck size={20} />} title="Nothing decided yet" body="Approvals and rejections are written straight to the registry — this log mirrors what the chain holds." />
        ) : (
          <div className="space-y-1.5">
            {done.map(r => (
              <div key={r.id} className="flex items-center gap-2.5 rounded border border-line bg-panel2/40 px-3 py-2 a-rise">
                <span className={`grid h-5 w-5 place-items-center rounded-full ${r.status === 'verified' ? 'bg-verdant/15 text-verdant' : 'bg-breach/15 text-breach'}`}>
                  {r.status === 'verified' ? <Check size={11} /> : <X size={11} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px]">{r.facility}</div>
                  <div className="font-mono text-[10px] text-dim">{r.id} · {r.verifier}</div>
                </div>
                <Pill tone={r.status === 'verified' ? 'ok' : 'bad'}>{r.status}</Pill>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>

    <Panel title="Accreditation &amp; scope" right={<Pill tone="violet">BEE-empanelled carbon verifiers</Pill>}>
      <div className="grid gap-2.5 md:grid-cols-3">
        {VERIFIERS.map(v => (
          <div key={v.id} className="rounded-lg border border-line bg-panel2/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-medium">{v.name}</span>
              <Pill tone="mute">{v.id}</Pill>
            </div>
            <div className="mt-1.5 text-[11px] text-dim">{v.scope}</div>
            <div className="mt-2 font-mono text-[10px] text-dim">{v.accred}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-dim">
        Every decision is signed by the accredited verifier and written to the registry as a VERIFY transaction.
        Nobody — including the regulator — can alter it afterwards without breaking the chain.
      </p>
    </Panel>
    </div>
  )
}

export default function Compliance() {
  const facilities = useStore(s => s.facilities)
  const chain = useStore(s => s.chain)
  const certs = useStore(s => s.certs)
  const [hover, setHover] = useState<string | null>(null)

  const sectors = Object.entries(
    facilities.reduce<Record<string, { em: number; cap: number; n: number }>>((a, f) => {
      a[f.sector] ??= { em: 0, cap: 0, n: 0 }
      a[f.sector].em += f.emitted; a[f.sector].cap += f.cap; a[f.sector].n++
      return a
    }, {})
  ).sort((a, b) => b[1].em - a[1].em)

  const breaching = facilities.filter(f => f.actualIntensity > f.targetIntensity)
  const totalTx = chain.reduce((a, b) => a + b.txs.length, 0)
  const hovered = facilities.find(f => f.id === hover)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 stagger">
        {[
          { k: 'Entities in breach', v: `${breaching.length} / ${facilities.length}`, c: breaching.length ? '#ff4d5e' : '#2fe0a4', s: 'above notified intensity' },
          { k: 'Registry transactions', v: totalTx.toString(), c: '#5aa2ff', s: 'immutable, auditable' },
          { k: 'Certificates issued', v: certs.length.toString(), c: '#2fe0a4', s: certs.filter(c => c.status === 'retired').length + ' retired' },
          { k: 'Audit effort saved', v: '~94%', c: '#a78bfa', s: 'vs. manual document review' },
        ].map(x => (
          <div key={x.k} className="rounded-lg border border-line bg-panel/70 p-3">
            <div className="text-[9.5px] uppercase tracking-[.15em] text-dim">{x.k}</div>
            <div className="mt-1.5 font-mono text-[21px] font-semibold leading-none tnum" style={{ color: x.c }}>{x.v}</div>
            <div className="mt-1.5 text-[10.5px] text-dim">{x.s}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel title="Obligated entities · national view" right={<Pill tone="mute"><MapPin size={9} />{facilities.length} sites</Pill>}>
          <div className="schematic relative h-[330px] overflow-hidden rounded-lg border border-line bg-ink/60">
            <div className="schematic-fade absolute inset-0" />
            <div className="relative mx-auto h-full" style={{ aspectRatio: '5 / 6' }}>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d={INDIA} fill="#2fe0a4" fillOpacity=".045" stroke="#2fe0a4" strokeOpacity=".28" strokeWidth=".45" strokeLinejoin="round" />
              {facilities.map((f, i) => facilities.slice(i + 1).map(g => (
                <line key={f.id + g.id} x1={f.lng} y1={f.lat} x2={g.lng} y2={g.lat}
                  stroke="#5aa2ff" strokeWidth=".12" opacity=".14" className="a-flow" />
              )))}
            </svg>
            {facilities.map(f => {
              const over = f.actualIntensity > f.targetIntensity
              const c = over ? '#ff4d5e' : '#2fe0a4'
              const size = 8 + Math.min(18, f.emitted / 1.6e6)
              return (
                <button key={f.id}
                  onMouseEnter={() => setHover(f.id)} onMouseLeave={() => setHover(null)}
                  onClick={() => { select(f.id); setView('ops') }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform duration-300 hover:scale-125"
                  style={{ left: `${f.lng}%`, top: `${f.lat}%`, width: size, height: size, background: c + '33', border: `1.5px solid ${c}` }}>
                  <span className="absolute inset-0 rounded-full a-glow" style={{ boxShadow: `0 0 14px ${c}` }} />
                </button>
              )
            })}
            {hovered && (
              <div className="pointer-events-none absolute z-10 max-w-[220px] rounded border border-line2 bg-panel px-2.5 py-1.5 shadow-xl a-rise"
                style={{ left: `min(${hovered.lng}%, calc(100% - 230px))`, top: `calc(${hovered.lat}% + 18px)` }}>
                <div className="text-[12px] font-semibold">{hovered.name}</div>
                <div className="font-mono text-[10px] text-dim">{hovered.state} · {hovered.sector}</div>
                <div className="mt-1 font-mono text-[10.5px]" style={{ color: hovered.actualIntensity > hovered.targetIntensity ? '#ff4d5e' : '#2fe0a4' }}>
                  {hovered.actualIntensity.toFixed(2)} vs {hovered.targetIntensity.toFixed(2)} tCO2e/t
                </div>
              </div>
            )}
            </div>
            <div className="absolute bottom-2.5 left-3 flex gap-3 font-mono text-[9.5px] text-dim">
              <span className="flex items-center gap-1.5"><Dot tone="#2fe0a4" pulse={false} />meeting target</span>
              <span className="flex items-center gap-1.5"><Dot tone="#ff4d5e" pulse={false} />in breach</span>
            </div>
          </div>
        </Panel>

        <Panel title="Sector rollup">
          <div className="space-y-2.5">
            {sectors.map(([name, v]) => {
              const pct = v.em / v.cap
              return (
                <div key={name}>
                  <div className="mb-1 flex items-center justify-between text-[11.5px]">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-[2px]" style={{ background: SECTOR_COLOR[name] }} />{name}
                    </span>
                    <span className="font-mono text-[11px] tnum" style={{ color: pct > 1 ? '#ff4d5e' : '#7b8fa3' }}>
                      {(pct * 100).toFixed(1)}% of cap
                    </span>
                  </div>
                  <Bar pct={pct} color={pct > 1 ? '#ff4d5e' : SECTOR_COLOR[name]} h={5} />
                </div>
              )
            })}
          </div>
        </Panel>
      </div>

      <Panel title="Compliance ledger" pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-line font-mono text-[9.5px] uppercase tracking-[.14em] text-dim">
                {['Facility', 'Sector', 'State', 'Emitted', 'Cap', 'Intensity', 'Trend', 'Status'].map(h => (
                  <th key={h} className="px-3.5 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facilities.map(f => {
                const over = f.actualIntensity > f.targetIntensity
                return (
                  <tr key={f.id} onClick={() => { select(f.id); setView('ops') }}
                    className="cursor-pointer border-b border-line/60 transition-colors hover:bg-panel2">
                    <td className="px-3.5 py-2.5">
                      <div className="font-medium">{f.name}</div>
                      <div className="font-mono text-[10px] text-dim">{f.id}</div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="flex items-center gap-1.5 text-mute"><span className="h-1.5 w-1.5 rounded-[2px]" style={{ background: SECTOR_COLOR[f.sector] }} />{f.sector}</span>
                    </td>
                    <td className="px-3.5 py-2.5 text-mute">{f.state}</td>
                    <td className="px-3.5 py-2.5 font-mono tnum"><Num value={f.emitted / 1e6} d={2} suffix=" Mt" /></td>
                    <td className="px-3.5 py-2.5 font-mono tnum text-dim">{(f.cap / 1e6).toFixed(2)} Mt</td>
                    <td className="px-3.5 py-2.5 font-mono tnum" style={{ color: over ? '#ff4d5e' : '#2fe0a4' }}>
                      {f.actualIntensity.toFixed(2)} <span className="text-dim">/ {f.targetIntensity.toFixed(2)}</span>
                    </td>
                    <td className="px-3.5 py-1"><Spark data={f.series} color={over ? '#ff4d5e' : '#2fe0a4'} w={70} h={24} fill={false} /></td>
                    <td className="px-3.5 py-2.5">
                      <Pill tone={over ? 'bad' : 'ok'}>{over ? 'shortfall' : 'compliant'}</Pill>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
