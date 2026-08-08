import { useMemo } from 'react'
import { Flame, ScrollText, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react'
import { useStore, hit, retire } from '../sim'
import { SECTOR_COLOR } from '../data'
import { Btn, Dot, Empty, Hash, Num, Panel, Pill, Spark, clock } from '../ui'

function Book() {
  const orders = useStore(s => s.orders)
  const price = useStore(s => s.price)
  const role = useStore(s => s.role)
  const bids = orders.filter(o => o.side === 'bid').sort((a, b) => b.price - a.price).slice(0, 6)
  const asks = orders.filter(o => o.side === 'ask').sort((a, b) => a.price - b.price).slice(0, 6).reverse()
  const max = Math.max(...orders.map(o => o.qty), 1)
  const canTrade = role !== 'verifier'

  const Row = ({ o, side }: { o: typeof orders[number]; side: 'bid' | 'ask' }) => {
    const c = side === 'bid' ? '#2fe0a4' : '#ff4d5e'
    return (
      <div className="group relative flex items-center gap-2 rounded px-2 py-[5px] transition-colors hover:bg-panel2">
        <span className="pointer-events-none absolute inset-y-0 rounded transition-all duration-500"
          style={{ [side === 'bid' ? 'left' : 'right']: 0, width: `${(o.qty / max) * 62}%`, background: c, opacity: .11 }} />
        <span className="relative w-[62px] font-mono text-[12px] font-semibold tnum" style={{ color: c }}>{o.price}</span>
        <span className="relative w-[62px] font-mono text-[11.5px] tnum text-mute">{o.qty.toLocaleString('en-IN')}</span>
        <span className="relative min-w-0 flex-1 truncate text-[11px] text-dim">{o.org}</span>
        <Btn size="sm" tone={side === 'ask' ? 'primary' : 'ghost'} disabled={!canTrade}
          className="relative opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          onClick={() => hit(o.id)}>
          {side === 'ask' ? 'Buy' : 'Sell'}
        </Btn>
      </div>
    )
  }

  const spread = (bids[0] && asks[asks.length - 1]) ? asks[asks.length - 1].price - bids[0].price : 0

  return (
    <Panel title="Order book · CCC spot" right={<Pill tone="mute">India Carbon Exchange</Pill>}>
      <div className="mb-1 flex items-center gap-2 px-2 font-mono text-[9px] uppercase tracking-[.14em] text-dim">
        <span className="w-[62px]">Rs/tCO2e</span><span className="w-[62px]">Qty</span><span className="flex-1">Counterparty</span>
      </div>
      <div className="space-y-px">{asks.map(o => <Row key={o.id} o={o} side="ask" />)}</div>
      <div className="my-2 flex items-center justify-between rounded border border-line bg-panel2/60 px-2.5 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[.14em] text-dim">Spread</span>
        <span className="font-mono text-[11.5px] text-warn tnum">Rs {spread}</span>
        <span className="font-mono text-[15px] font-semibold text-text tnum"><Num value={price} prefix="Rs " /></span>
      </div>
      <div className="space-y-px">{bids.map(o => <Row key={o.id} o={o} side="bid" />)}</div>
      {!canTrade && <p className="mt-2.5 text-center text-[11px] text-dim">Verifiers cannot hold or trade CCCs — switch desks to transact.</p>}
    </Panel>
  )
}

function Tape() {
  const trades = useStore(s => s.trades)
  return (
    <Panel title="Settlement tape" right={<Pill tone="ok"><Dot />T+0 on-chain</Pill>}>
      <div className="max-h-[260px] space-y-px overflow-y-auto pr-1">
        {trades.map((t, i) => (
          <div key={t.id} className={`flex items-center gap-2 rounded px-2 py-[5px] text-[11.5px] ${t.mine ? 'bg-verdant/10 a-rise' : i === 0 ? 'a-rise' : ''}`}>
            <span className="font-mono text-[9.5px] text-dim">{clock(t.ts)}</span>
            <span className="font-mono text-[12px] font-semibold tnum" style={{ color: t.mine ? '#2fe0a4' : '#e6edf3' }}>Rs {t.price}</span>
            <span className="font-mono text-[11px] tnum text-mute">{t.qty.toLocaleString('en-IN')}</span>
            <span className="min-w-0 flex-1 truncate text-right text-[10.5px] text-dim">{t.seller} → {t.buyer}</span>
            {t.mine && <Pill tone="ok">yours</Pill>}
          </div>
        ))}
      </div>
    </Panel>
  )
}

export default function Market() {
  const price = useStore(s => s.price)
  const series = useStore(s => s.priceSeries)
  const trades = useStore(s => s.trades)
  const orders = useStore(s => s.orders)

  const chg = useMemo(() => ((price - series[0]) / series[0]) * 100, [price, series])
  const up = chg >= 0
  const vol = trades.reduce((a, b) => a + b.qty, 0)
  const depthBid = orders.filter(o => o.side === 'bid').reduce((a, b) => a + b.qty, 0)
  const depthAsk = orders.filter(o => o.side === 'ask').reduce((a, b) => a + b.qty, 0)

  return (
    <div className="space-y-4">
      <Panel pad={false}>
        <div className="flex flex-wrap items-end justify-between gap-6 p-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[.16em] text-dim">
              <Dot />Carbon Credit Certificate · spot · Rs per tCO2e
            </div>
            <div className="mt-1.5 flex items-end gap-3">
              <span className="font-display text-[40px] font-semibold leading-none tracking-tight tnum">
                <Num value={price} prefix="Rs " />
              </span>
              <span className={`mb-1 flex items-center gap-1 font-mono text-[13px] font-semibold ${up ? 'text-verdant' : 'text-breach'}`}>
                {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{up ? '+' : ''}{chg.toFixed(2)}%
              </span>
            </div>
            <div className="mt-2 flex gap-5 font-mono text-[11px] text-dim">
              <span>Session volume <span className="text-mute">{vol.toLocaleString('en-IN')} CCC</span></span>
              <span>Bid depth <span className="text-verdant">{depthBid.toLocaleString('en-IN')}</span></span>
              <span>Ask depth <span className="text-breach">{depthAsk.toLocaleString('en-IN')}</span></span>
            </div>
          </div>
          <div className="min-w-[280px] flex-1">
            <Spark data={series} color={up ? '#2fe0a4' : '#ff4d5e'} w={620} h={92} full />
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Book />
        <Tape />
      </div>
    </div>
  )
}

export function Vault() {
  const certs = useStore(s => s.certs)
  const role = useStore(s => s.role)
  const price = useStore(s => s.price)
  const active = certs.filter(c => c.status === 'active')
  const held = active.reduce((a, b) => a + b.qty, 0)
  const retired = certs.filter(c => c.status === 'retired').reduce((a, b) => a + b.qty, 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 stagger">
        {[
          { k: 'Certificates held', v: active.length.toString(), s: 'active serials', c: '#e6edf3' },
          { k: 'CCC balance', v: held.toLocaleString('en-IN'), s: 'tradable tCO2e', c: '#2fe0a4' },
          { k: 'Mark to market', v: 'Rs ' + ((held * price) / 1e7).toFixed(2) + ' Cr', s: 'at Rs ' + price + '/tCO2e', c: '#ffc24b' },
          { k: 'Retired', v: retired.toLocaleString('en-IN'), s: 'permanently burned', c: '#ff7a45' },
        ].map(x => (
          <div key={x.k} className="rounded-lg border border-line bg-panel/70 p-3">
            <div className="text-[9.5px] uppercase tracking-[.15em] text-dim">{x.k}</div>
            <div className="mt-1.5 font-mono text-[20px] font-semibold leading-none tnum" style={{ color: x.c }}>{x.v}</div>
            <div className="mt-1.5 text-[10.5px] text-dim">{x.s}</div>
          </div>
        ))}
      </div>

      <Panel title="Carbon Credit Certificates" right={<Pill tone="violet">registry-native · non-fungible serial</Pill>}>
        {!certs.length ? (
          <Empty icon={<ScrollText size={20} />} title="No certificates yet"
            body="Certificates are minted when a verifier approves an MRV report that beat its notified intensity target. File a report from the Industry desk to mint the first one." />
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 stagger">
            {certs.map(c => (
              <article key={c.id}
                className={`a-flip relative overflow-hidden rounded-lg border p-3.5 transition-all duration-300
                  ${c.status === 'retired' ? 'border-line bg-panel/40 opacity-60' : 'border-line bg-panel/80 hover:-translate-y-0.5 hover:border-verdant/45'}`}>
                <span className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${SECTOR_COLOR[c.sector] ?? '#2fe0a4'},transparent)` }} />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono text-[12px] font-semibold tracking-tight">{c.serial}</div>
                    <div className="mt-0.5 text-[11px] text-dim">{c.org}</div>
                  </div>
                  <Pill tone={c.status === 'retired' ? 'ember' : 'ok'}>{c.status}</Pill>
                </div>

                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <div className="text-[9.5px] uppercase tracking-[.14em] text-dim">Quantity</div>
                    <div className="font-mono text-[19px] font-semibold leading-none text-verdant tnum">{c.qty.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9.5px] uppercase tracking-[.14em] text-dim">Vintage</div>
                    <div className="font-mono text-[12px]">{c.vintage}</div>
                  </div>
                </div>

                <div className="mt-3 border-t border-line pt-2.5">
                  <div className="text-[9px] uppercase tracking-[.14em] text-dim">Issuance tx</div>
                  <Hash value={c.txId} len={14} className="text-[10.5px] text-signal" />
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10.5px] text-dim"><ShieldCheck size={11} className="text-verdant" />{c.sector}</span>
                  {c.status === 'active' && (
                    <Btn size="sm" tone="ghost" className="ml-auto" disabled={role === 'verifier'} onClick={() => retire(c.id)}>
                      <Flame size={12} /> Retire
                    </Btn>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
