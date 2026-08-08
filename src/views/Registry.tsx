import { useEffect, useRef, useState } from 'react'
import { useStore, tamper, revalidate, forge, type Block } from '../sim'
import { Btn, Dot, Empty, Frame, Hash, Rule, Tag, TX_TONE, clock, timeAgo } from '../ui'

function BlockCard({ b, open, onClick }: { b: Block; open: boolean; onClick: () => void }) {
  const bad = !b.valid
  return (
    <button onClick={onClick}
      className={`frame a-block w-[196px] shrink-0 border bg-panel/40 p-3.5 text-left transition-colors duration-300
        ${bad ? 'frame-bad border-breach/50' : open ? 'frame-lit border-signal/50' : 'border-rule'}
        ${b.tampered ? 'a-shake' : ''}`}>
      <span className="fx" />

      <div className="flex items-center justify-between">
        <span className={`font-mono text-[13px] ${bad ? 'text-breach' : 'text-bone'}`}>#{b.index}</span>
        <Tag tone={bad ? 'bad' : 'ok'}>{bad ? (b.tampered ? 'rewritten' : 'orphaned') : 'sealed'}</Tag>
      </div>

      <div className="mt-3.5">
        <div className="eyebrow">Hash</div>
        <Hash value={b.hash} len={18} className={`mt-1 block text-[10.5px] ${bad ? 'text-breach line-through' : 'text-signal'}`} />
      </div>
      <div className="mt-2.5">
        <div className="eyebrow">Prev</div>
        <span className={`mt-1 block font-mono text-[10.5px] ${bad ? 'text-breach/60' : 'text-faint'}`}>{b.prevHash.slice(0, 18)}</span>
      </div>

      <Rule className="my-3" />
      <div className="flex items-center justify-between font-mono text-[9px] text-faint">
        <span>{b.txs.length} tx</span>
        <span>nonce {b.nonce}</span>
        <span>{clock(b.ts)}</span>
      </div>

      <span className={`pointer-events-none absolute -right-[13px] top-1/2 h-px w-[13px] ${bad ? 'bg-breach' : 'bg-rule2'}`} />
    </button>
  )
}

export default function Registry() {
  const chain = useStore(s => s.chain)
  const mempool = useStore(s => s.mempool)
  const forging = useStore(s => s.forging)
  const integrity = useStore(s => s.integrity)
  const length = useStore(s => s.chainLength)
  const [open, setOpen] = useState<number | null>(null)
  const strip = useRef<HTMLDivElement>(null)

  const badAt = chain.findIndex(b => !b.valid)

  useEffect(() => {
    const el = strip.current
    if (!el) return
    if (integrity === 'broken' && badAt >= 0) el.scrollTo({ left: Math.max(0, badAt * 212 - 130), behavior: 'smooth' })
    else el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' })
  }, [chain.length, integrity, badAt])

  const sel = chain.find(b => b.index === open)
  const firstBad = chain.find(b => !b.valid)
  const orphaned = chain.filter(b => !b.valid).length
  const feed = [...chain].reverse().flatMap(b => b.txs.map(t => ({ ...t, block: b.index, ok: b.valid }))).slice(0, 26)

  if (!chain.length) return <Empty title="Waiting for the registry node" body="The chain has not streamed in yet. If this persists, the registry node is not running." />

  return (
    <div className="space-y-5">
      <div className={`frame flex flex-wrap items-center justify-between gap-5 border px-5 py-4 transition-colors duration-500
        ${integrity === 'broken' ? 'frame-bad border-breach/50' : 'frame-lit border-signal/30'}`}>
        <span className="fx" />
        <div>
          <div className={`font-display text-[17px] font-medium tracking-[-.02em] ${integrity === 'broken' ? 'text-breach a-shake' : ''}`}>
            {integrity === 'broken'
              ? `Chain integrity failed at block #${firstBad?.index}`
              : 'Chain integrity verified across all blocks'}
          </div>
          <div className="mt-1.5 font-mono text-[11px] text-dim">
            {integrity === 'broken'
              ? `${orphaned} block${orphaned > 1 ? 's' : ''} orphaned · recorded digests no longer match recomputed SHA-256`
              : `SHA-256 · proof-of-work difficulty 00 · ${length} blocks recomputed from genesis`}
          </div>
        </div>
        {integrity === 'sealed'
          ? <Btn tone="danger" onClick={() => tamper()} title="Simulate a registry operator editing a settled record">Tamper with a settled block</Btn>
          : <Btn tone="primary" onClick={() => revalidate()}>Re-validate chain</Btn>}
      </div>

      <Frame title="Ledger" index="01" pad={false}
        right={
          <div className="flex items-center gap-2.5">
            <Tag tone={forging ? 'ok' : 'mute'}>{forging ? 'forging' : 'idle'}</Tag>
            <Tag tone="info">{mempool} in mempool</Tag>
            <Btn size="sm" tone="quiet" onClick={() => forge()} disabled={!mempool || forging}>Force seal</Btn>
          </div>
        }>
        <div ref={strip} className="flex gap-4 overflow-x-auto px-4 py-5">
          {chain.map(b => (
            <BlockCard key={b.index} b={b} open={open === b.index} onClick={() => setOpen(open === b.index ? null : b.index)} />
          ))}
          {(forging || mempool > 0) && (
            <div className="sweep relative flex w-[196px] shrink-0 flex-col justify-center gap-2 overflow-hidden border border-dashed border-signal/40 p-3.5">
              <div className="font-mono text-[11px] text-signal">{forging ? 'mining nonce…' : `${mempool} tx pending`}</div>
              <div className="font-mono text-[9.5px] text-faint">next #{chain[chain.length - 1].index + 1}</div>
            </div>
          )}
        </div>
      </Frame>

      <div className="grid gap-3 lg:grid-cols-[1.05fr_1fr]">
        <Frame title={sel ? `Block #${sel.index}` : 'Block contents'} index="02">
          {!sel ? (
            <Empty title="Pick a block"
              body="Every block above holds the MRV reports, verifications, issuances and trades that were sealed together. Select one to read its transactions." />
          ) : (
            <div className="space-y-4 a-fade" key={sel.index}>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {[
                  ['Merkle root', sel.merkle.slice(0, 26)],
                  ['Nonce', String(sel.nonce)],
                  ['Sealed at', clock(sel.ts)],
                  ['Transactions', String(sel.txs.length)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="eyebrow">{k}</div>
                    <div className="mt-1.5 font-mono text-[12px]">{v}</div>
                  </div>
                ))}
              </div>

              {!sel.valid && (
                <p className="border-l-2 border-breach pl-3.5 text-[12px] leading-relaxed text-breach">
                  Recomputing SHA-256 over this block gives a different digest than the one recorded. Any node
                  re-deriving the chain rejects it and everything built on top.
                </p>
              )}

              <div className="border-t border-rule">
                {sel.txs.map(t => (
                  <div key={t.id} className="border-b border-rule py-3 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[9px] uppercase tracking-[.16em]" style={{ color: TX_TONE[t.kind] }}>{t.kind}</span>
                      <span className="font-mono text-[10px] text-faint">{t.id}</span>
                      {t.qty > 0 && <span className="ml-auto font-mono text-[11.5px] tnum">{t.qty.toLocaleString('en-IN')} tCO2e</span>}
                    </div>
                    <div className="mt-1.5 text-[12.5px] leading-snug text-mute">{t.note}</div>
                    <div className="mt-1 font-mono text-[10px] text-faint">{t.from} → {t.to}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Frame>

        <Frame title="Transaction feed" index="03" right={<Tag tone="info"><Dot tone="#8d9299" />streaming</Tag>} pad={false}>
          <div className="max-h-[460px] overflow-y-auto">
            {feed.map(t => (
              <div key={t.id} className={`flex items-center gap-3 border-b border-rule px-4 py-2 last:border-0 ${t.ok ? '' : 'bg-breach/[.05]'}`}>
                <span className="w-[52px] shrink-0 font-mono text-[9px] uppercase tracking-[.14em]" style={{ color: t.ok ? TX_TONE[t.kind] : '#e2503f' }}>{t.kind}</span>
                <span className={`min-w-0 flex-1 truncate text-[11.5px] ${t.ok ? 'text-dim' : 'text-breach line-through'}`}>{t.note}</span>
                <span className="shrink-0 font-mono text-[9.5px] text-faint">#{t.block} · {timeAgo(t.ts)}</span>
              </div>
            ))}
          </div>
        </Frame>
      </div>
    </div>
  )
}
