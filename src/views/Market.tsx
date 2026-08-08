import { useMemo } from 'react'
import { useStore, hit, retire, SECTOR_COLOR } from '../sim'
import { Btn, Dot, Empty, Frame, Hash, Num, Rule, Spark, Tag, clock } from '../ui'

function Book() {
  const orders = useStore(s => s.orders)
  const price = useStore(s => s.price)
  const role = useStore(s => s.role)
  const bids = orders.filter(o => o.side === 'bid').sort((a, b) => b.price - a.price).slice(0, 6)
  const asks = orders.filter(o => o.side === 'ask').sort((a, b) => a.price - b.price).slice(0, 6).reverse()
  const max = Math.max(...orders.map(o => o.qty), 1)
  const canTrade = role !== 'verifier'

  const Row = ({ o, side }: { o: typeof orders[number]; side: 'bid' | 'ask' }) => {
    const c = side === 'bid' ? '#3ecf9a' : '#e2503f'
    return (
      <div className="group relative flex items-center gap-3 px-4 py-[7px] transition-colors hover:bg-raise/60">
        <span className="pointer-events-none absolute inset-y-0 transition-all duration-500"
          style={{ [side === 'bid' ? 'left' : 'right']: 0, width: `${(o.qty / max) * 58}%`, background: c, opacity: .08 }} />
        <span className="relative w-[58px] font-mono text-[12px] tnum" style={{ color: c }}>{o.price}</span>
        <span className="relative w-[58px] font-mono text-[11px] tnum text-mute">{o.qty.toLocaleString('en-IN')}</span>
        <span className="relative min-w-0 flex-1 truncate text-[11px] text-faint">{o.org}</span>
        <Btn size="sm" tone={side === 'ask' ? 'primary' : 'ghost'} disabled={!canTrade}
          className="relative opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          onClick={() => hit(o.id)}>
          {side === 'ask' ? 'Buy' : 'Sell'}
        </Btn>
      </div>
    )
  }

  const spread = bids[0] && asks[asks.length - 1] ? asks[asks.length - 1].price - bids[0].price : 0

  return (
    <Frame title="Order book · CCC spot" index="01" right={<Tag tone="mute">India Carbon Exchange</Tag>} pad={false}>
      <div className="flex items-center gap-3 border-b border-rule px-4 py-2 eyebrow">
        <span className="w-[58px]">₹/tCO2e</span><span className="w-[58px]">Qty</span><span className="flex-1">Counterparty</span>
      </div>
      {asks.map(o => <Row key={o.id} o={o} side="ask" />)}
      <div className="flex items-center justify-between border-y border-rule bg-raise/40 px-4 py-2.5">
        <span className="eyebrow">Spread ₹{spread}</span>
        <span className="font-mono text-[15px] tnum"><Num value={price} prefix="₹" /></span>
      </div>
      {bids.map(o => <Row key={o.id} o={o} side="bid" />)}
      {!canTrade && <p className="border-t border-rule px-4 py-3 text-center text-[11px] text-faint">Verifiers cannot hold or trade certificates — switch desks to transact.</p>}
    </Frame>
  )
}

function Tape() {
  const trades = useStore(s => s.trades)
  return (
    <Frame title="Settlement tape" index="02" right={<Tag tone="ok"><Dot />T+0 on-chain</Tag>} pad={false}>
      <div className="max-h-[300px] overflow-y-auto">
        {trades.map((t, i) => (
          <div key={t.id} className={`flex items-center gap-3 border-b border-rule px-4 py-2 text-[11.5px] last:border-0 ${t.mine ? 'bg-signal/[.07] a-fade' : i === 0 ? 'a-fade' : ''}`}>
            <span className="font-mono text-[9.5px] text-faint">{clock(t.ts)}</span>
            <span className="font-mono text-[12px] tnum" style={{ color: t.mine ? '#3ecf9a' : '#ece9e3' }}>₹{t.price}</span>
            <span className="font-mono text-[11px] tnum text-dim">{t.qty.toLocaleString('en-IN')}</span>
            <span className="min-w-0 flex-1 truncate text-right text-[10.5px] text-faint">{t.seller} → {t.buyer}</span>
            {t.mine && <Tag tone="ok">yours</Tag>}
          </div>
        ))}
      </div>
    </Frame>
  )
}

export default function Market() {
  const price = useStore(s => s.price)
  const series = useStore(s => s.priceSeries)
  const trades = useStore(s => s.trades)
  const orders = useStore(s => s.orders)

  const chg = useMemo(() => (series.length ? ((price - series[0]) / series[0]) * 100 : 0), [price, series])
  const up = chg >= 0
  const vol = trades.reduce((a, b) => a + b.qty, 0)
  const depthBid = orders.filter(o => o.side === 'bid').reduce((a, b) => a + b.qty, 0)
  const depthAsk = orders.filter(o => o.side === 'ask').reduce((a, b) => a + b.qty, 0)

  return (
    <div className="space-y-5">
      <div className="frame border border-rule bg-panel/40">
        <span className="fx" />
        <div className="flex flex-wrap items-end justify-between gap-8 p-5">
          <div>
            <div className="flex items-center gap-2.5 eyebrow"><Dot />Certificate spot · ₹ per tCO2e</div>
            <div className="mt-3 flex items-end gap-4">
              <span className="font-display text-[52px] font-semibold leading-[.85] tracking-[-.04em] tnum">
                <Num value={price} prefix="₹" />
              </span>
              <span className="mb-1.5 font-mono text-[13px]" style={{ color: up ? '#3ecf9a' : '#e2503f' }}>
                {up ? '▲' : '▼'} {up ? '+' : ''}{chg.toFixed(2)}%
              </span>
            </div>
            <div className="mt-4 flex gap-7 font-mono text-[10.5px] text-faint">
              <span>volume <span className="text-mute">{vol.toLocaleString('en-IN')}</span></span>
              <span>bid depth <span className="text-signal">{depthBid.toLocaleString('en-IN')}</span></span>
              <span>ask depth <span className="text-breach">{depthAsk.toLocaleString('en-IN')}</span></span>
            </div>
          </div>
          <div className="min-w-[300px] flex-1">
            <Spark data={series} color={up ? '#3ecf9a' : '#e2503f'} w={620} h={104} full />
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
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

  const kpis = [
    { k: 'Certificates held', v: String(active.length), s: 'active serials', c: '#ece9e3' },
    { k: 'CCC balance', v: held.toLocaleString('en-IN'), s: 'tradable tCO2e', c: '#3ecf9a' },
    { k: 'Mark to market', v: '₹' + ((held * price) / 1e7).toFixed(2) + ' Cr', s: `at ₹${price}/tCO2e`, c: '#d8a83a' },
    { k: 'Retired', v: retired.toLocaleString('en-IN'), s: 'permanently burned', c: '#e8603c' },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 border border-rule md:grid-cols-4">
        {kpis.map((x, i) => (
          <div key={x.k} className={`p-4 ${i ? 'md:border-l' : ''} border-rule ${i < 2 ? 'max-md:border-b' : ''} ${i % 2 ? 'max-md:border-l' : ''}`}>
            <div className="eyebrow">{x.k}</div>
            <div className="mt-2.5 font-mono text-[23px] leading-none tnum" style={{ color: x.c }}>{x.v}</div>
            <div className="mt-2 text-[10.5px] text-faint">{x.s}</div>
          </div>
        ))}
      </div>

      <Frame title="Carbon Credit Certificates" index="01" right={<Tag tone="info">registry-native · non-fungible serial</Tag>}>
        {!certs.length ? (
          <Empty title="No certificates yet"
            body="Certificates are minted when a verifier approves an MRV report that beat its notified intensity target. File a report from the Industry desk to mint the first one." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 stagger">
            {certs.map(c => (
              <article key={c.id}
                className={`frame border p-4 transition-colors duration-300
                  ${c.status === 'retired' ? 'border-rule opacity-45' : 'border-rule hover:bg-raise/40'}`}>
                <span className="fx" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[12px]">{c.serial}</div>
                    <div className="mt-1 truncate text-[11px] text-faint">{c.org}</div>
                  </div>
                  <Tag tone={c.status === 'retired' ? 'warn' : 'ok'}>{c.status}</Tag>
                </div>

                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <div className="eyebrow">Quantity</div>
                    <div className="mt-1.5 font-mono text-[22px] leading-none tnum text-signal">{c.qty.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="text-right">
                    <div className="eyebrow">Vintage</div>
                    <div className="mt-1.5 font-mono text-[12px]">{c.vintage}</div>
                  </div>
                </div>

                <Rule className="my-3.5" />
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="eyebrow">Issuance tx</div>
                    <Hash value={c.txId} len={14} className="mt-1 block text-[10.5px] text-mute" />
                  </div>
                  {c.status === 'active' && (
                    <Btn size="sm" tone="ghost" disabled={role === 'verifier'} onClick={() => retire(c.id)}>Retire</Btn>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2 text-[10px] text-faint">
                  <span className="h-[5px] w-[5px]" style={{ background: SECTOR_COLOR[c.sector] ?? '#3ecf9a' }} />{c.sector}
                </div>
              </article>
            ))}
          </div>
        )}
      </Frame>
    </div>
  )
}
