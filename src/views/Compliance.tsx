import { useState } from 'react'
import {
  useStore, decideReport, select, setView, runAudit, runBrief,
  SECTOR_COLOR, VERIFIERS, compact, type Audit, type Brief,
} from '../sim'
import { Btn, Dot, Empty, Frame, Hash, Meter, Num, Rule, Spark, Tag, timeAgo, tone } from '../ui'

// Schematic outline of India in the same 0-100 space the facility pins use.
const INDIA = 'M34 9 L44 13 L51 11 L57 20 L65 22 L74 20 L79 26 L73 30 L69 35 L63 33 L65 42 L60 52 L54 62 L49 74 L44 89 L38 76 L34 62 L28 50 L21 44 L15 39 L21 33 L27 29 L25 21 Z'

const SEV: Record<string, string> = { info: '#8d9299', warn: '#d8a83a', risk: '#e2503f' }
const LEVEL: Record<string, string> = { low: '#8d9299', medium: '#d8a83a', high: '#e2503f' }

// ── verification co-pilot ────────────────────────────────────
function CoPilot({ reportId }: { reportId: string }) {
  const audit = useStore(s => s.ai[reportId]) as Audit | undefined
  const busy = useStore(s => s.aiBusy[reportId])

  if (busy) {
    return (
      <div className="sweep relative mt-4 overflow-hidden border border-signal/30 px-4 py-5">
        <div className="font-mono text-[11px] text-signal">verification co-pilot reading device streams<span className="a-caret">_</span></div>
        <div className="mt-1.5 text-[11px] text-faint">Cross-checking reported intensity against every connected meter.</div>
      </div>
    )
  }

  if (!audit) {
    return (
      <div className="mt-4 flex items-center justify-between gap-4 border border-dashed border-rule2 px-4 py-3">
        <p className="text-[11.5px] leading-snug text-faint">
          Run the co-pilot to cross-check this submission against live device data before you decide.
        </p>
        <Btn size="sm" tone="ghost" onClick={() => runAudit(reportId)}>Run co-pilot</Btn>
      </div>
    )
  }

  const rec = audit.recommendation
  const recColor = rec === 'approve' ? '#3ecf9a' : rec === 'reject' ? '#e2503f' : '#d8a83a'

  return (
    <div className="frame mt-4 border border-rule bg-void/50 a-rise" style={{ borderColor: recColor + '55' }}>
      <span className="fx" />
      <div className="flex items-center justify-between gap-4 border-b border-rule px-4 py-2.5">
        <span className="eyebrow">Verification co-pilot</span>
        <div className="flex items-center gap-2.5">
          <Tag tone={audit.source === 'groq' ? 'ok' : 'warn'}>{audit.source === 'groq' ? 'groq' : 'offline'}</Tag>
          <span className="font-mono text-[10px] uppercase tracking-[.18em]" style={{ color: recColor }}>
            {rec} · {audit.confidence}%
          </span>
        </div>
      </div>

      <div className="p-4">
        <p className="text-[13.5px] leading-relaxed text-bone">{audit.headline}</p>

        <div className="mt-4 space-y-2.5">
          {audit.findings?.map(f => (
            <div key={f.label} className="flex gap-3">
              <span className="mt-[5px] h-[5px] w-[5px] shrink-0" style={{ background: SEV[f.severity] ?? '#8d9299' }} />
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[.14em]" style={{ color: SEV[f.severity] ?? '#8d9299' }}>{f.label}</div>
                <div className="mt-0.5 text-[12px] leading-snug text-dim">{f.detail}</div>
              </div>
            </div>
          ))}
        </div>

        {audit.deviceChecks?.length > 0 && (
          <>
            <Rule className="my-4" />
            <div className="eyebrow mb-2.5">Device cross-check</div>
            <div className="grid gap-x-5 gap-y-1.5 sm:grid-cols-2">
              {audit.deviceChecks.map(d => (
                <div key={d.device} className="flex items-baseline gap-2.5 font-mono text-[10.5px]">
                  <span className="text-faint">{d.device}</span>
                  <span style={{ color: d.verdict === 'anomalous' ? '#d8a83a' : '#3ecf9a' }}>{d.verdict}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <Rule className="my-4" />
        <p className="text-[12px] leading-snug text-mute">{audit.creditImpact}</p>
      </div>
    </div>
  )
}

export function VerifyQueue() {
  const reports = useStore(s => s.reports)
  const facilities = useStore(s => s.facilities)
  const pending = reports.filter(r => r.status === 'pending' || r.status === 'ingesting')
  const done = reports.filter(r => r.status === 'verified' || r.status === 'rejected')

  return (
    <div className="space-y-5">
      <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
        <Frame title="Awaiting verification" index="01" right={<Tag tone={pending.length ? 'ok' : 'mute'}>{pending.length} in queue</Tag>}>
          {!pending.length ? (
            <Empty title="Queue is clear"
              body="Reports land here the moment a facility anchors one. Open the Industry desk, pick a facility and submit an MRV report to see it arrive."
              action={<Btn tone="ghost" onClick={() => setView('ops')}>Go to Industry desk</Btn>} />
          ) : (
            <div className="space-y-5 stagger">
              {pending.map(r => {
                const f = facilities.find(x => x.id === r.facilityId)
                const beat = f ? f.targetIntensity - f.actualIntensity : 0
                const qty = f ? Math.round(Math.abs(beat) * f.output / 1000) : 0
                const busy = r.status === 'ingesting'
                return (
                  <article key={r.id} className="frame border border-rule bg-panel/40 p-4">
                    <span className="fx" />
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-display text-[16px] font-medium tracking-[-.02em]">{r.facility}</div>
                        <div className="mt-1 font-mono text-[10.5px] text-faint">{r.id} · {r.period} · {timeAgo(r.submittedAt)} ago</div>
                      </div>
                      <Tag tone={busy ? 'warn' : 'info'}>{busy ? 'ingesting' : 'ready to review'}</Tag>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-4 border-y border-rule py-3.5">
                      {[
                        ['Reported', compact(r.tCO2e) + ' tCO2e', '#ece9e3'],
                        ['Intensity', r.intensity.toFixed(2), beat >= 0 ? '#3ecf9a' : '#e2503f'],
                        ['Target', r.target.toFixed(2), '#5c6268'],
                      ].map(([k, v, c]) => (
                        <div key={k}>
                          <div className="eyebrow">{k}</div>
                          <div className="mt-1.5 font-mono text-[14px]" style={{ color: c }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {r.hash && (
                      <div className="mt-3.5 flex items-baseline gap-2.5">
                        <span className="eyebrow">Anchored digest</span>
                        <Hash value={r.hash} len={30} className="text-[10.5px] text-mute" />
                      </div>
                    )}

                    <p className="mt-3.5 text-[12px] leading-relaxed text-dim">
                      {beat >= 0
                        ? `Beat the notified target by ${beat.toFixed(2)} tCO2e/t. Approving mints ${qty.toLocaleString('en-IN')} CCC to ${r.operator}.`
                        : `Missed the notified target by ${Math.abs(beat).toFixed(2)} tCO2e/t. Approving records a shortfall that must be met by surrendering certificates.`}
                    </p>

                    {!busy && <CoPilot reportId={r.id} />}

                    <div className="mt-5 flex gap-2.5">
                      <Btn tone="primary" size="sm" disabled={busy} onClick={() => decideReport(r.id, true)}>Approve &amp; issue</Btn>
                      <Btn tone="danger" size="sm" disabled={busy} onClick={() => decideReport(r.id, false)}>Reject</Btn>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </Frame>

        <Frame title="Decision log" index="02" right={<Tag tone="mute">{done.length} closed</Tag>} pad={false}>
          {!done.length ? (
            <Empty title="Nothing decided yet" body="Approvals and rejections are written straight to the registry — this log mirrors what the chain holds." />
          ) : (
            <div>
              {done.map(r => (
                <div key={r.id} className="flex items-center gap-3.5 border-b border-rule px-4 py-3 last:border-0 a-fade">
                  <span className="font-mono text-[11px]" style={{ color: r.status === 'verified' ? '#3ecf9a' : '#e2503f' }}>
                    {r.status === 'verified' ? '✓' : '×'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px]">{r.facility}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-faint">{r.id} · {r.verifier}</div>
                  </div>
                  <Tag tone={r.status === 'verified' ? 'ok' : 'bad'}>{r.status}</Tag>
                </div>
              ))}
            </div>
          )}
        </Frame>
      </div>

      <Frame title="Accreditation &amp; scope" index="03" right={<Tag tone="info">BEE-empanelled verifiers</Tag>}>
        <div className="grid gap-x-8 gap-y-5 md:grid-cols-3">
          {VERIFIERS.map((v, i) => (
            <div key={v.id} className={i ? 'md:border-l md:border-rule md:pl-8' : ''}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-medium">{v.name}</span>
                <span className="font-mono text-[9.5px] text-faint">{v.id}</span>
              </div>
              <div className="mt-1.5 text-[11px] text-dim">{v.scope}</div>
              <div className="mt-2 font-mono text-[10px] text-faint">{v.accred}</div>
            </div>
          ))}
        </div>
        <Rule className="my-4" />
        <p className="text-[11.5px] leading-relaxed text-faint">
          The co-pilot advises; the accredited verifier decides. Every decision is written to the registry as a VERIFY
          transaction that nobody — including the regulator — can alter afterwards without breaking the chain.
        </p>
      </Frame>
    </div>
  )
}

// ── regulator ────────────────────────────────────────────────
function SchemeBrief() {
  const brief = useStore(s => s.ai.brief) as Brief | undefined
  const busy = useStore(s => s.aiBusy.brief)

  return (
    <Frame title="Supervisory brief" index="02"
      right={
        <div className="flex items-center gap-2.5">
          {brief && <Tag tone={brief.source === 'groq' ? 'ok' : 'warn'}>{brief.source === 'groq' ? 'groq' : 'offline'}</Tag>}
          <Btn size="sm" tone="quiet" onClick={() => runBrief()} disabled={busy}>{busy ? 'Writing' : brief ? 'Refresh' : 'Generate'}</Btn>
        </div>
      }>
      {busy && (
        <div className="sweep relative overflow-hidden border border-signal/30 px-4 py-8 text-center font-mono text-[11px] text-signal">
          reading the live compliance position<span className="a-caret">_</span>
        </div>
      )}

      {!busy && !brief && (
        <Empty title="No brief generated yet"
          body="The brief reads the live position of every obligated entity, the registry's integrity and the state of the market, then writes the day's supervisory summary."
          action={<Btn tone="ghost" onClick={() => runBrief()}>Generate brief</Btn>} />
      )}

      {!busy && brief && (
        <div className="a-rise">
          <p className="font-display text-[17px] font-medium leading-snug tracking-[-.02em]">{brief.headline}</p>
          <div className="mt-5 space-y-4">
            {brief.risks?.map((r, i) => (
              <div key={r.title} className="flex gap-4">
                <span className="mt-[3px] font-mono text-[9.5px] text-faint">{String(i + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[12.5px] font-medium">{r.title}</span>
                    <span className="font-mono text-[9px] uppercase tracking-[.16em]" style={{ color: LEVEL[r.level] ?? '#8d9299' }}>{r.level}</span>
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-dim">{r.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <Rule className="my-4" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="eyebrow">Market</div>
              <p className="mt-1.5 text-[11.5px] leading-snug text-mute">{brief.marketNote}</p>
            </div>
            <div>
              <div className="eyebrow">Integrity</div>
              <p className="mt-1.5 text-[11.5px] leading-snug text-mute">{brief.integrityNote}</p>
            </div>
          </div>
        </div>
      )}
    </Frame>
  )
}

export default function Compliance() {
  const facilities = useStore(s => s.facilities)
  const height = useStore(s => s.chainHeight)
  const chain = useStore(s => s.chain)
  const certs = useStore(s => s.certs)
  const integrity = useStore(s => s.integrity)
  const [hover, setHover] = useState<string | null>(null)

  const sectors = Object.entries(
    facilities.reduce<Record<string, { em: number; cap: number }>>((a, f) => {
      a[f.sector] ??= { em: 0, cap: 0 }
      a[f.sector].em += f.emitted; a[f.sector].cap += f.cap
      return a
    }, {})
  ).sort((a, b) => b[1].em - a[1].em)

  const breaching = facilities.filter(f => f.actualIntensity > f.targetIntensity)
  const totalTx = chain.reduce((a, b) => a + b.txs.length, 0)
  const hovered = facilities.find(f => f.id === hover)

  const kpis = [
    { k: 'Entities in breach', v: `${breaching.length} / ${facilities.length}`, c: breaching.length ? '#e2503f' : '#3ecf9a', s: 'above notified intensity' },
    { k: 'Registry height', v: '#' + height, c: '#ece9e3', s: `${totalTx} transactions in window` },
    { k: 'Certificates issued', v: String(certs.length), c: '#3ecf9a', s: certs.filter(c => c.status === 'retired').length + ' retired' },
    { k: 'Chain integrity', v: integrity === 'sealed' ? 'Sealed' : 'Broken', c: integrity === 'sealed' ? '#3ecf9a' : '#e2503f', s: 'recomputed from genesis' },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 border border-rule md:grid-cols-4">
        {kpis.map((x, i) => (
          <div key={x.k} className={`p-4 ${i ? 'md:border-l' : ''} border-rule ${i < 2 ? 'max-md:border-b' : ''} ${i % 2 ? 'max-md:border-l' : ''}`}>
            <div className="eyebrow">{x.k}</div>
            <div className="mt-2.5 font-mono text-[24px] leading-none tnum" style={{ color: x.c }}>{x.v}</div>
            <div className="mt-2 text-[10.5px] text-faint">{x.s}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1.15fr]">
        <Frame title="Obligated entities · national view" index="01" right={<Tag tone="mute">{facilities.length} sites</Tag>}>
          <div className="grid-bg relative h-[340px] overflow-hidden border border-rule">
            <div className="relative mx-auto h-full" style={{ aspectRatio: '5 / 6' }}>
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d={INDIA} fill="#3ecf9a" fillOpacity=".035" stroke="#3ecf9a" strokeOpacity=".22" strokeWidth=".4" strokeLinejoin="round" />
                {facilities.map((f, i) => facilities.slice(i + 1).map(g => (
                  <line key={f.id + g.id} x1={f.lng} y1={f.lat} x2={g.lng} y2={g.lat}
                    stroke="#ece9e3" strokeWidth=".1" opacity=".1" className="a-flow" />
                )))}
              </svg>
              {facilities.map(f => {
                const over = f.actualIntensity > f.targetIntensity
                const c = over ? '#e2503f' : '#3ecf9a'
                const size = 8 + Math.min(16, f.emitted / 1.7e6)
                return (
                  <button key={f.id}
                    onMouseEnter={() => setHover(f.id)} onMouseLeave={() => setHover(null)}
                    onClick={() => { select(f.id); setView('ops') }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform duration-300 hover:scale-125"
                    style={{ left: `${f.lng}%`, top: `${f.lat}%`, width: size, height: size, background: c + '2e', border: `1px solid ${c}` }}>
                    <span className="absolute inset-0 rounded-full a-breathe" style={{ boxShadow: `0 0 12px ${c}` }} />
                  </button>
                )
              })}
              {hovered && (
                <div className="pointer-events-none absolute z-10 max-w-[230px] border border-rule2 bg-panel px-3 py-2 a-fade"
                  style={{ left: `min(${hovered.lng}%, calc(100% - 240px))`, top: `calc(${hovered.lat}% + 16px)` }}>
                  <div className="text-[12px] font-medium">{hovered.name}</div>
                  <div className="mt-0.5 font-mono text-[10px] text-faint">{hovered.state} · {hovered.sector}</div>
                  <div className="mt-1.5 font-mono text-[10.5px]" style={{ color: hovered.actualIntensity > hovered.targetIntensity ? '#e2503f' : '#3ecf9a' }}>
                    {hovered.actualIntensity.toFixed(2)} vs {hovered.targetIntensity.toFixed(2)} tCO2e/t
                  </div>
                </div>
              )}
            </div>
            <div className="absolute bottom-3 left-3.5 flex gap-4 eyebrow">
              <span className="flex items-center gap-2"><Dot tone="#3ecf9a" pulse={false} />meeting target</span>
              <span className="flex items-center gap-2"><Dot tone="#e2503f" pulse={false} />in breach</span>
            </div>
          </div>

          <Rule className="my-4" />
          <div className="eyebrow mb-3">Sector rollup</div>
          <div className="space-y-3">
            {sectors.map(([name, v]) => (
              <div key={name}>
                <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
                  <span className="flex items-center gap-2">
                    <span className="h-[6px] w-[6px]" style={{ background: SECTOR_COLOR[name] }} />{name}
                  </span>
                  <span className="font-mono text-[10.5px] tnum" style={{ color: tone(v.em / v.cap) }}>
                    {((v.em / v.cap) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-px w-full bg-rule">
                  <div className="h-px" style={{ width: `${Math.min(100, (v.em / v.cap / 1.3) * 100)}%`, background: tone(v.em / v.cap), transition: 'width .8s cubic-bezier(.16,1,.3,1)' }} />
                </div>
              </div>
            ))}
          </div>
        </Frame>

        <SchemeBrief />
      </div>

      <Frame title="Compliance ledger" index="03" pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-rule">
                {['Facility', 'Sector', 'State', 'Emitted', 'Cap use', 'Intensity', 'Trend', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 eyebrow font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facilities.map(f => {
                const over = f.actualIntensity > f.targetIntensity
                return (
                  <tr key={f.id} onClick={() => { select(f.id); setView('ops') }}
                    className="cursor-pointer border-b border-rule transition-colors last:border-0 hover:bg-raise/50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{f.name}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-faint">{f.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 text-dim">
                        <span className="h-[6px] w-[6px]" style={{ background: SECTOR_COLOR[f.sector] }} />{f.sector}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-dim">{f.state}</td>
                    <td className="px-4 py-3 font-mono tnum"><Num value={f.emitted / 1e6} d={2} suffix=" Mt" /></td>
                    <td className="w-[130px] px-4 py-3"><Meter pct={f.emitted / f.cap} label={((f.emitted / f.cap) * 100).toFixed(0) + '%'} /></td>
                    <td className="px-4 py-3 font-mono tnum" style={{ color: over ? '#e2503f' : '#3ecf9a' }}>
                      {f.actualIntensity.toFixed(2)} <span className="text-faint">/ {f.targetIntensity.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-2"><Spark data={f.series} color={over ? '#e2503f' : '#3ecf9a'} w={64} h={22} fill={false} /></td>
                    <td className="px-4 py-3"><Tag tone={over ? 'bad' : 'ok'}>{over ? 'shortfall' : 'compliant'}</Tag></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Frame>
    </div>
  )
}
