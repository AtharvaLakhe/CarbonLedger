import { useSyncExternalStore } from 'react'
import { type Block, type Tx, genesis, makeTx, mine, validate, sha256, txHash } from './chain'
import { FACILITIES, ORG_NAMES, VERIFIERS, type Facility, type Order } from './data'

export type Role = 'industry' | 'verifier' | 'regulator'
export type View = 'ops' | 'registry' | 'market' | 'compliance' | 'verify' | 'vault'

export interface Report {
  id: string
  facilityId: string
  facility: string
  period: string
  tCO2e: number
  intensity: number
  target: number
  status: 'ingesting' | 'pending' | 'verified' | 'rejected'
  stage: number // 0..4 pipeline position
  submittedAt: number
  verifier: string
  hash: string
}

export interface Certificate {
  id: string
  serial: string
  facilityId: string
  org: string
  sector: string
  qty: number
  vintage: string
  issuedAt: number
  txId: string
  status: 'active' | 'listed' | 'retired'
}

export interface Trade {
  id: string
  price: number
  qty: number
  buyer: string
  seller: string
  ts: number
  mine: boolean
}

export interface Toast {
  id: number
  kind: 'ok' | 'warn' | 'bad' | 'info'
  title: string
  body: string
}

export interface State {
  tick: number
  live: boolean
  role: Role
  view: View
  facilities: Facility[]
  selected: string | null
  chain: Block[]
  mempool: Tx[]
  forging: boolean
  integrity: 'sealed' | 'broken'
  reports: Report[]
  certs: Certificate[]
  orders: Order[]
  trades: Trade[]
  price: number
  priceSeries: number[]
  toasts: Toast[]
  myOrg: string
  settleFx: number // bumps to trigger the settlement flight animation
}

const PERIOD = 'FY 2026-27 · Q2'

function seedOrders(price: number): Order[] {
  const out: Order[] = []
  for (let i = 0; i < 7; i++) {
    out.push({
      id: 'B' + i, side: 'bid',
      price: +(price - 4 - i * 7 - Math.random() * 4).toFixed(0),
      qty: Math.round(120 + Math.random() * 1600),
      org: ORG_NAMES[(i * 3) % ORG_NAMES.length], ts: Date.now(),
    })
    out.push({
      id: 'A' + i, side: 'ask',
      price: +(price + 5 + i * 7 + Math.random() * 4).toFixed(0),
      qty: Math.round(120 + Math.random() * 1600),
      org: ORG_NAMES[(i * 5 + 1) % ORG_NAMES.length], ts: Date.now(),
    })
  }
  return out
}

const P0 = 1184

function seedCerts(): Certificate[] {
  return FACILITIES.filter(f => f.credits > 0).map((f, i) => ({
    id: 'c' + i,
    serial: `IN-CCC-2026-${String(4100 + i * 37).padStart(5, '0')}`,
    facilityId: f.id, org: f.operator, sector: f.sector,
    qty: f.credits, vintage: 'FY 2025-26', issuedAt: Date.now() - (i + 2) * 864e5,
    txId: '0x' + sha256(f.id + i).slice(0, 12), status: 'active',
  }))
}

const g = genesis()
let state: State = {
  tick: 0,
  live: true,
  role: 'industry',
  view: 'ops',
  facilities: FACILITIES.map(f => ({
    ...f,
    sensors: f.sensors.map(s => ({ ...s })),
    series: Array.from({ length: 40 }, (_, i) =>
      f.emitted / 4000 * (0.9 + 0.14 * Math.sin(i / 4) + Math.random() * 0.06)),
  })),
  selected: null,
  chain: [g],
  mempool: [],
  forging: false,
  integrity: 'sealed',
  reports: [],
  certs: seedCerts(),
  orders: seedOrders(P0),
  trades: Array.from({ length: 8 }, (_, i) => ({
    id: 't' + i,
    price: +(P0 + (Math.random() - 0.5) * 26).toFixed(0),
    qty: Math.round(80 + Math.random() * 900),
    buyer: ORG_NAMES[(i * 2) % ORG_NAMES.length],
    seller: ORG_NAMES[(i * 5 + 3) % ORG_NAMES.length],
    ts: Date.now() - i * 47000, mine: false,
  })),
  price: P0,
  priceSeries: Array.from({ length: 60 }, (_, i) => P0 - 60 + i * 1.1 + Math.sin(i / 3) * 14 + Math.random() * 10),
  toasts: [],
  myOrg: 'Bharat Steel Ltd',
  settleFx: 0,
}

// pre-seed a few blocks so the registry never opens empty
;(() => {
  const seedTx = [
    makeTx('ATTEST', 'CEMS-11', 'REGISTRY', 0, 'IoT telemetry batch anchored — Jamnagar Refinery Cluster'),
    makeTx('MRV', 'F-IN-GJ-0244', 'ACV-027', 27_804_000, 'Q1 FY26 emissions report submitted'),
    makeTx('VERIFY', 'ACV-027', 'BEE-CCTS', 27_804_000, 'Report verified — intensity 0.84 vs target 0.91'),
    makeTx('ISSUE', 'BEE-CCTS', 'Saurashtra Petrochem', 1240, 'CCC issued — over-achievement of notified target'),
    makeTx('TRADE', 'Kalinga Metals', 'Vindhya Cement', 600, 'Matched on ICX at Rs 1,171/tCO2e'),
    makeTx('ATTEST', 'CEMS-31', 'REGISTRY', 0, 'IoT telemetry batch anchored — Angul Aluminium Smelter'),
    makeTx('RETIRE', 'Coromandel Chemicals', 'BURN', 310, 'Retired against FY25 compliance obligation'),
    makeTx('ATTEST', 'CEMS-61', 'REGISTRY', 0, 'IoT telemetry batch anchored — Korba Thermal Station'),
  ]
  let prev = g
  for (let i = 0; i < 4; i++) {
    const b = mine(prev.index + 1, prev.hash, seedTx.slice(i * 2, i * 2 + 2), Date.now() - (4 - i) * 92_000)
    state.chain.push(b); prev = b
  }
})()

const subs = new Set<() => void>()
function emit() { subs.forEach(f => f()) }
function set(patch: Partial<State>) { state = { ...state, ...patch }; emit() }

export function subscribe(cb: () => void) { subs.add(cb); return () => { subs.delete(cb) } }
export function getState() { return state }
export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state), () => sel(state))
}

let toastSeq = 0
export function toast(kind: Toast['kind'], title: string, body: string) {
  const t = { id: ++toastSeq, kind, title, body }
  set({ toasts: [...state.toasts, t] })
  setTimeout(() => set({ toasts: state.toasts.filter(x => x.id !== t.id) }), 4200)
}

// ── chain ops ────────────────────────────────────────────────
function pushTx(tx: Tx) {
  const mempool = [...state.mempool, tx]
  set({ mempool })
  if (mempool.length >= 3) forge()
}

export function forge() {
  if (!state.mempool.length || state.forging) return
  const txs = state.mempool
  set({ forging: true, mempool: [] })
  setTimeout(() => {
    const prev = state.chain[state.chain.length - 1]
    const b = mine(prev.index + 1, prev.hash, txs)
    set({ chain: [...state.chain, b].slice(-60), forging: false })
  }, 520)
}

export function tamper(index: number) {
  const chain = state.chain.map(b => {
    if (b.index !== index) return b
    const txs = b.txs.map((t, i) => {
      if (i !== 0) return t
      const edited = { ...t, qty: Math.round(t.qty * 4.6 + 9_500), note: t.note + '  [ledger row rewritten]' }
      return { ...edited, hash: txHash(edited) }
    })
    return { ...b, txs, tampered: true }
  })
  set({ chain: validate(chain), integrity: 'broken' })
  toast('bad', 'Integrity alarm', `Block #${index} no longer hashes to its recorded digest. Every block after it is orphaned.`)
}

export function revalidate() {
  // re-mine the tampered block and everything downstream, restoring the linked hashes
  const chain = [...state.chain]
  const i = chain.findIndex(b => b.tampered)
  if (i < 0) { set({ integrity: 'sealed', chain: validate(chain) }); return }
  chain[i] = {
    ...chain[i], tampered: false,
    txs: chain[i].txs.map((t, k) => {
      if (k !== 0) return t
      const restored = { ...t, qty: Math.round((t.qty - 9_500) / 4.6), note: t.note.replace('  [ledger row rewritten]', '') }
      return { ...restored, hash: txHash(restored) }
    }),
  }
  for (let k = i; k < chain.length; k++) {
    const prevHash = k === 0 ? chain[0].prevHash : chain[k - 1].hash
    chain[k] = mine(chain[k].index, prevHash, chain[k].txs, chain[k].ts)
  }
  set({ chain: validate(chain), integrity: 'sealed' })
  toast('ok', 'Consensus restored', 'Honest nodes rejected the rewrite. The canonical chain was re-derived from block 0.')
}

// ── MRV pipeline ─────────────────────────────────────────────
const STAGES = ['Pulling CEMS + SCADA telemetry', 'Normalising to IPCC 2006 factors', 'Anomaly scan vs 90-day baseline', 'Hashing and anchoring to registry']
export const PIPELINE = STAGES

export function submitReport(facilityId: string) {
  const f = state.facilities.find(x => x.id === facilityId)!
  if (state.reports.some(r => r.facilityId === facilityId && (r.status === 'pending' || r.status === 'ingesting'))) {
    toast('warn', 'Already in queue', `${f.name} has a report awaiting verification.`); return
  }
  const rep: Report = {
    id: 'R-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    facilityId, facility: f.name, period: PERIOD,
    tCO2e: Math.round(f.emitted), intensity: f.actualIntensity, target: f.targetIntensity,
    status: 'ingesting', stage: 0, submittedAt: Date.now(),
    verifier: VERIFIERS[FACILITIES.indexOf(FACILITIES.find(x => x.id === facilityId)!) % VERIFIERS.length].name,
    hash: '',
  }
  set({ reports: [rep, ...state.reports] })
  STAGES.forEach((_, i) => setTimeout(() => {
    set({ reports: state.reports.map(r => r.id === rep.id ? { ...r, stage: i + 1 } : r) })
  }, 520 + i * 620))
  setTimeout(() => {
    const hash = '0x' + sha256(rep.id + rep.tCO2e + rep.facilityId).slice(0, 16)
    set({ reports: state.reports.map(r => r.id === rep.id ? { ...r, status: 'pending', hash } : r) })
    pushTx(makeTx('MRV', facilityId, 'ACV', Math.round(f.emitted), `${PERIOD} MRV report ${rep.id} anchored — ${f.name}`))
    toast('info', 'Report anchored', `${rep.id} is now immutable and queued with ${rep.verifier}.`)
  }, 520 + STAGES.length * 620)
}

export function decideReport(id: string, approve: boolean) {
  const r = state.reports.find(x => x.id === id)
  if (!r || r.status !== 'pending') return
  set({ reports: state.reports.map(x => x.id === id ? { ...x, status: approve ? 'verified' : 'rejected' } : x) })
  pushTx(makeTx('VERIFY', 'ACV', 'BEE-CCTS', r.tCO2e,
    `${r.id} ${approve ? 'verified' : 'rejected'} — intensity ${r.intensity} vs target ${r.target} tCO2e/t`))
  if (!approve) { toast('warn', 'Report rejected', `${r.facility} must resubmit with corrected activity data.`); return }

  const f = state.facilities.find(x => x.id === r.facilityId)!
  const over = f.targetIntensity - f.actualIntensity   // positive = beat the target
  const qty = Math.round(Math.abs(over) * f.output / 1000)
  if (over > 0) {
    const cert: Certificate = {
      id: 'c' + Date.now(),
      serial: `IN-CCC-2026-${String(5000 + state.certs.length * 41).padStart(5, '0')}`,
      facilityId: f.id, org: f.operator, sector: f.sector, qty,
      vintage: 'FY 2026-27', issuedAt: Date.now(),
      txId: '0x' + sha256(f.id + Date.now()).slice(0, 12), status: 'active',
    }
    set({
      certs: [cert, ...state.certs],
      facilities: state.facilities.map(x => x.id === f.id ? { ...x, credits: x.credits + qty } : x),
    })
    pushTx(makeTx('ISSUE', 'BEE-CCTS', f.operator, qty, `${qty} CCC issued to ${f.operator} — ${cert.serial}`))
    toast('ok', 'Carbon Credit Certificate minted', `${qty.toLocaleString('en-IN')} CCC issued to ${f.operator}.`)
  } else {
    pushTx(makeTx('VERIFY', 'BEE-CCTS', f.operator, qty, `Shortfall of ${qty} tCO2e recorded — ${f.name} must surrender CCCs`))
    toast('warn', 'Compliance shortfall', `${f.name} is ${qty.toLocaleString('en-IN')} tCO2e over its notified target.`)
  }
}

// ── market ───────────────────────────────────────────────────
export function hit(orderId: string) {
  const o = state.orders.find(x => x.id === orderId)
  if (!o) return
  const buyer = o.side === 'ask' ? state.myOrg : o.org
  const seller = o.side === 'ask' ? o.org : state.myOrg
  const trade: Trade = { id: 'T' + Date.now(), price: o.price, qty: o.qty, buyer, seller, ts: Date.now(), mine: true }
  set({
    trades: [trade, ...state.trades].slice(0, 30),
    orders: state.orders.filter(x => x.id !== orderId),
    price: o.price,
    settleFx: state.settleFx + 1,
  })
  pushTx(makeTx('TRADE', seller, buyer, o.qty, `${o.qty} CCC matched on ICX at Rs ${o.price}/tCO2e — T+0 settlement`))
  toast('ok', 'Trade settled on-chain', `${o.qty.toLocaleString('en-IN')} CCC at Rs ${o.price} — settled in the next block.`)
}

export function retire(certId: string) {
  const c = state.certs.find(x => x.id === certId)
  if (!c || c.status === 'retired') return
  set({ certs: state.certs.map(x => x.id === certId ? { ...x, status: 'retired' } : x) })
  pushTx(makeTx('RETIRE', c.org, 'BURN', c.qty, `${c.serial} retired against ${PERIOD} obligation — permanently removed`))
  toast('ok', 'Certificate retired', `${c.serial} burned. It can never be traded again.`)
}

// ── the live loop ────────────────────────────────────────────
let timer: ReturnType<typeof setInterval> | null = null

export function setLive(v: boolean) { set({ live: v }) }
export function setRole(r: Role) {
  const view: View = r === 'industry' ? 'ops' : r === 'verifier' ? 'verify' : 'compliance'
  set({ role: r, view, selected: null, myOrg: r === 'industry' ? 'Bharat Steel Ltd' : r === 'verifier' ? 'Bharat Assessment Services' : 'Bureau of Energy Efficiency' })
}
export function setView(v: View) { set({ view: v }) }
export function select(id: string | null) { set({ selected: id }) }

export function startLoop() {
  if (timer) return
  timer = setInterval(() => {
    if (!state.live) return
    const t = state.tick + 1

    const facilities = state.facilities.map(f => {
      const sensors = f.sensors.map(s => {
        const drift = (Math.random() - 0.5) * s.vol
        const pull = (s.base - s.value) * 0.14
        return { ...s, value: Math.max(0, s.value + drift + pull) }
      })
      const load = sensors[0].value / sensors[0].base
      const series = [...f.series.slice(1), (f.emitted / 4000) * (0.94 + load * 0.09)]
      return { ...f, sensors, series, emitted: f.emitted + Math.round(f.emitted / 52560 * load) }
    })

    // price random walk with mild mean reversion
    const drift = (Math.random() - 0.5) * 9 + (P0 - state.price) * 0.02
    const price = Math.max(600, +(state.price + drift).toFixed(0))
    const priceSeries = [...state.priceSeries.slice(1), price]

    // order book breathes
    const orders = state.orders.map(o =>
      Math.random() < 0.18
        ? { ...o, qty: Math.max(40, Math.round(o.qty * (0.82 + Math.random() * 0.42))) }
        : o)
    if (orders.length < 14 && Math.random() < 0.5) {
      const side: Order['side'] = Math.random() < 0.5 ? 'bid' : 'ask'
      orders.push({
        id: side[0].toUpperCase() + Date.now(), side,
        price: side === 'bid' ? price - 3 - Math.round(Math.random() * 40) : price + 3 + Math.round(Math.random() * 40),
        qty: Math.round(100 + Math.random() * 1400),
        org: ORG_NAMES[Math.floor(Math.random() * ORG_NAMES.length)], ts: Date.now(),
      })
    }

    let trades = state.trades
    if (t % 4 === 0) {
      trades = [{
        id: 'T' + Date.now(), price: price + Math.round((Math.random() - 0.5) * 8),
        qty: Math.round(60 + Math.random() * 700),
        buyer: ORG_NAMES[Math.floor(Math.random() * ORG_NAMES.length)],
        seller: ORG_NAMES[Math.floor(Math.random() * ORG_NAMES.length)],
        ts: Date.now(), mine: false,
      }, ...state.trades].slice(0, 30)
    }

    set({ tick: t, facilities, price, priceSeries, orders, trades })

    // IoT devices attest their telemetry batch to the chain
    if (t % 3 === 0 && state.integrity === 'sealed') {
      const f = facilities[Math.floor(Math.random() * facilities.length)]
      const sn = f.sensors[Math.floor(Math.random() * f.sensors.length)]
      pushTx(makeTx('ATTEST', sn.id, 'REGISTRY', 0,
        `Telemetry batch anchored — ${sn.label} @ ${sn.value.toFixed(1)} ${sn.unit} · ${f.name}`))
    }
  }, 1100)
}

export function stopLoop() { if (timer) { clearInterval(timer); timer = null } }
