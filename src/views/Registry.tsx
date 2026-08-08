import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Boxes, Link2, Link2Off, RotateCcw, ShieldAlert, ShieldCheck, Hammer } from 'lucide-react'
import { useStore, tamper, revalidate, forge } from '../sim'
import { Btn, Dot, Empty, Hash, Panel, Pill, TX_TONE, clock, timeAgo } from '../ui'
import type { Block } from '../chain'

function BlockCard({ b, open, onClick }: { b: Block; open: boolean; onClick: () => void }) {
  const bad = !b.valid
  const isTampered = b.tampered
  return (
    <button
      onClick={onClick}
      className={`a-block group relative w-[188px] shrink-0 rounded-lg border p-3 text-left transition-all duration-300
        ${bad ? 'border-breach/60 bg-breach/8' : open ? 'border-verdant/60 bg-verdant/6' : 'border-line bg-panel/80 hover:border-verdant/40'}
        ${isTampered ? 'a-shake' : ''}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div className="flex items-center justify-between">
        <span className={`font-mono text-[13px] font-bold ${bad ? 'text-breach' : 'text-text'}`}>#{b.index}</span>
        {bad
          ? <Pill tone="bad"><Link2Off size={9} />{isTampered ? 'rewritten' : 'orphaned'}</Pill>
          : <Pill tone="ok"><Link2 size={9} />sealed</Pill>}
      </div>

      <div className="mt-2">
        <div className="text-[9px] uppercase tracking-[.14em] text-dim">Block hash</div>
        <Hash value={b.hash} len={18} className={`text-[10.5px] ${bad ? 'text-breach line-through' : 'text-verdant'}`} />
      </div>
      <div className="mt-1.5">
        <div className="text-[9px] uppercase tracking-[.14em] text-dim">Prev</div>
        <span className={`font-mono text-[10.5px] ${bad ? 'text-breach/70' : 'text-dim'}`}>{b.prevHash.slice(0, 18)}</span>
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2 font-mono text-[9.5px] text-dim">
        <span>{b.txs.length} tx</span>
        <span>nonce {b.nonce}</span>
        <span>{clock(b.ts)}</span>
      </div>

      <span className={`pointer-events-none absolute -right-[13px] top-1/2 z-10 h-px w-[13px] ${bad ? 'bg-breach' : 'bg-line2'}`} />
    </button>
  )
}

export default function Registry() {
  const chain = useStore(s => s.chain)
  const mempool = useStore(s => s.mempool)
  const forging = useStore(s => s.forging)
  const integrity = useStore(s => s.integrity)
  const [open, setOpen] = useState<number | null>(null)
  const strip = useRef<HTMLDivElement>(null)

  const badAt = chain.findIndex(b => !b.valid)

  useEffect(() => {
    const el = strip.current
    if (!el) return
    if (integrity === 'broken' && badAt >= 0) {
      el.scrollTo({ left: Math.max(0, badAt * 204 - 120), behavior: 'smooth' })
    } else {
      el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' })
    }
  }, [chain.length, integrity, badAt])

  const sel = chain.find(b => b.index === open)
  const firstBad = chain.find(b => !b.valid)
  const orphaned = chain.filter(b => !b.valid).length
  const target = chain[Math.max(1, Math.floor(chain.length / 2))]

  const feed = [...chain].reverse().flatMap(b => b.txs.map(t => ({ ...t, block: b.index, ok: b.valid }))).slice(0, 24)

  return (
    <div className="space-y-4">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-all duration-500
          ${integrity === 'broken' ? 'border-breach/55 bg-breach/10' : 'border-verdant/30 bg-verdant/6'}`}
      >
        <div className="flex items-center gap-3">
          <span className={`grid h-9 w-9 place-items-center rounded-lg border ${integrity === 'broken' ? 'border-breach/50 bg-breach/15 text-breach a-shake' : 'border-verdant/40 bg-verdant/12 text-verdant'}`}>
            {integrity === 'broken' ? <ShieldAlert size={17} /> : <ShieldCheck size={17} />}
          </span>
          <div>
            <div className="font-display text-[14px] font-semibold">
              {integrity === 'broken'
                ? `Chain integrity failed at block #${firstBad?.index}`
                : 'Chain integrity verified across all blocks'}
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-dim">
              {integrity === 'broken'
                ? `${orphaned} block${orphaned > 1 ? 's' : ''} orphaned · recorded digests no longer match recomputed SHA-256`
                : `SHA-256 · proof-of-work difficulty 00 · ${chain.length} blocks recomputed from genesis`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {integrity === 'sealed'
            ? <Btn tone="danger" onClick={() => tamper(target.index)} title="Simulate a registry operator editing a settled record">
                <Hammer size={13} /> Tamper with block #{target.index}
              </Btn>
            : <Btn tone="primary" onClick={revalidate}><RotateCcw size={13} /> Re-validate chain</Btn>}
        </div>
      </div>

      <Panel
        title="Ledger"
        pad={false}
        right={
          <div className="flex items-center gap-2">
            <Pill tone={forging ? 'ok' : 'mute'}>{forging ? 'forging block' : 'idle'}</Pill>
            <Pill tone="info">{mempool.length} in mempool</Pill>
            <Btn size="sm" tone="quiet" onClick={forge} disabled={!mempool.length || forging}>Force seal</Btn>
          </div>
        }
      >
        <div ref={strip} className="flex gap-4 overflow-x-auto px-3.5 py-4">
          {chain.map(b => (
            <BlockCard key={b.index} b={b} open={open === b.index} onClick={() => setOpen(open === b.index ? null : b.index)} />
          ))}
          {(forging || mempool.length > 0) && (
            <div className="sweep relative flex w-[188px] shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-dashed border-verdant/40 bg-verdant/4 p-3">
              <Boxes size={18} className={`text-verdant ${forging ? 'a-spin' : ''}`} />
              <div className="font-mono text-[10.5px] text-verdant">{forging ? 'mining nonce…' : `${mempool.length} tx pending`}</div>
              <div className="font-mono text-[9px] text-dim">next #{chain[chain.length - 1].index + 1}</div>
            </div>
          )}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
        <Panel title={sel ? `Block #${sel.index} contents` : 'Block contents'}>
          {!sel ? (
            <Empty icon={<Boxes size={20} />} title="Pick a block" body="Every block above holds the MRV reports, verifications, issuances and trades that were sealed together. Select one to read its transactions." />
          ) : (
            <div className="space-y-3 a-rise" key={sel.index}>
              <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-line bg-panel2/50 p-3">
                {[
                  ['Merkle root', sel.merkle.slice(0, 26)],
                  ['Nonce', String(sel.nonce)],
                  ['Sealed at', clock(sel.ts)],
                  ['Transactions', String(sel.txs.length)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-[9.5px] uppercase tracking-[.14em] text-dim">{k}</div>
                    <div className="mt-0.5 font-mono text-[11.5px]">{v}</div>
                  </div>
                ))}
              </div>
              {!sel.valid && (
                <div className="flex items-start gap-2 rounded-lg border border-breach/45 bg-breach/10 p-3 text-[12px] text-breach">
                  <AlertTriangle size={14} className="mt-px shrink-0" />
                  <span>Recomputing SHA-256 over this block gives a different digest than the one recorded. Any node re-deriving the chain rejects it and everything built on top.</span>
                </div>
              )}
              <div className="space-y-1.5">
                {sel.txs.map(t => (
                  <div key={t.id} className="rounded border border-line bg-panel2/40 p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[.12em]"
                        style={{ background: TX_TONE[t.kind].c + '1f', color: TX_TONE[t.kind].c }}>{t.kind}</span>
                      <span className="font-mono text-[10.5px] text-dim">{t.id}</span>
                      {t.qty > 0 && <span className="ml-auto font-mono text-[11px] text-text">{t.qty.toLocaleString('en-IN')} tCO2e</span>}
                    </div>
                    <div className="mt-1.5 text-[12px] leading-snug text-mute">{t.note}</div>
                    <div className="mt-1 font-mono text-[10px] text-dim">{t.from} → {t.to}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Transaction feed" right={<Pill tone="mute"><Dot tone="#5aa2ff" />streaming</Pill>}>
          <div className="max-h-[430px] space-y-1 overflow-y-auto pr-1">
            {feed.map(t => (
              <div key={t.id} className={`flex items-center gap-2.5 rounded px-2 py-1.5 transition-colors ${t.ok ? 'hover:bg-panel2' : 'bg-breach/8'}`}>
                <span className="w-1 self-stretch rounded-full" style={{ background: TX_TONE[t.kind].c, opacity: t.ok ? .9 : .3 }} />
                <span className="w-[52px] shrink-0 font-mono text-[9px] font-bold tracking-[.1em]" style={{ color: TX_TONE[t.kind].c }}>{t.kind}</span>
                <span className={`min-w-0 flex-1 truncate text-[11.5px] ${t.ok ? 'text-mute' : 'text-breach line-through'}`}>{t.note}</span>
                <span className="shrink-0 font-mono text-[9.5px] text-dim">#{t.block} · {timeAgo(t.ts)}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
