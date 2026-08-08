// The registry node: owns the chain, the obligated-entity roster, the order book and the tick loop.
// MOCK: no BEE/CCTS API exists publicly — facilities, devices and orders are synthetic but
// modelled on real CCTS obligated sectors and notified intensity targets.
import { genesis, makeTx, mine, sha256, txHash, validate } from './chain.mjs'

const dev = (id, label, unit, base, vol, kind) => ({ id, label, unit, value: base, base, vol, kind })

export const FACILITIES = [
  {
    id: 'F-IN-KA-0117', name: 'Vijayanagar Works', operator: 'Bharat Steel Ltd', sector: 'Iron & Steel',
    state: 'Karnataka', lat: 68, lng: 38, targetIntensity: 2.24, actualIntensity: 2.41,
    output: 8_420_000, cap: 18_860_800, emitted: 20_292_200, credits: 0,
    sensors: [
      dev('CEMS-01', 'Blast furnace stack CO2', '%vol', 22.4, 0.9, 'stack'),
      dev('CEMS-02', 'Sinter plant stack CO2', '%vol', 15.1, 0.7, 'stack'),
      dev('FUEL-01', 'Coking coal feed', 't/h', 412, 14, 'fuel'),
      dev('PWR-01', 'Grid import', 'MW', 386, 11, 'power'),
    ],
  },
  {
    id: 'F-IN-GJ-0244', name: 'Jamnagar Refinery Cluster', operator: 'Saurashtra Petrochem', sector: 'Petroleum Refinery',
    state: 'Gujarat', lat: 42, lng: 20, targetIntensity: 0.91, actualIntensity: 0.84,
    output: 33_100_000, cap: 30_121_000, emitted: 27_804_000, credits: 1_240,
    sensors: [
      dev('CEMS-11', 'CDU heater stack CO2', '%vol', 11.8, 0.5, 'stack'),
      dev('FLR-01', 'Flare gas flow', 'km3/h', 4.2, 0.35, 'flow'),
      dev('FUEL-11', 'Refinery fuel gas', 't/h', 188, 7, 'fuel'),
      dev('PWR-11', 'Captive cogen', 'MW', 640, 18, 'power'),
    ],
  },
  {
    id: 'F-IN-MP-0392', name: 'Satna Cement Line-3', operator: 'Vindhya Cement', sector: 'Cement',
    state: 'Madhya Pradesh', lat: 42, lng: 44, targetIntensity: 0.58, actualIntensity: 0.61,
    output: 6_900_000, cap: 4_002_000, emitted: 4_209_000, credits: 0,
    sensors: [
      dev('CEMS-21', 'Kiln preheater CO2', '%vol', 27.6, 1.1, 'stack'),
      dev('FUEL-21', 'Pet-coke feed', 't/h', 96, 4, 'fuel'),
      dev('FLOW-21', 'Clinker throughput', 't/h', 780, 22, 'flow'),
      dev('PWR-21', 'Mill drive load', 'MW', 44, 2.2, 'power'),
    ],
  },
  {
    id: 'F-IN-OD-0508', name: 'Angul Aluminium Smelter', operator: 'Kalinga Metals', sector: 'Aluminium',
    state: 'Odisha', lat: 52, lng: 58, targetIntensity: 14.8, actualIntensity: 13.9,
    output: 1_120_000, cap: 16_576_000, emitted: 15_568_000, credits: 3_410,
    sensors: [
      dev('CEMS-31', 'Pot-line anode CO2', '%vol', 8.4, 0.4, 'stack'),
      dev('PWR-31', 'Pot-line DC load', 'MW', 1_240, 26, 'power'),
      dev('FUEL-31', 'Anode bake fuel', 't/h', 31, 1.4, 'fuel'),
      dev('FLOW-31', 'Alumina feed', 't/h', 260, 9, 'flow'),
    ],
  },
  {
    id: 'F-IN-UP-0631', name: 'Dadri Fertiliser Complex', operator: 'Ganga Agrichem', sector: 'Fertiliser',
    state: 'Uttar Pradesh', lat: 30, lng: 40, targetIntensity: 1.62, actualIntensity: 1.71,
    output: 2_400_000, cap: 3_888_000, emitted: 4_104_000, credits: 0,
    sensors: [
      dev('CEMS-41', 'Reformer stack CO2', '%vol', 18.9, 0.8, 'stack'),
      dev('FUEL-41', 'Natural gas feed', 'km3/h', 92, 3.5, 'fuel'),
      dev('FLOW-41', 'Ammonia output', 't/h', 118, 4, 'flow'),
      dev('PWR-41', 'Compressor load', 'MW', 78, 3, 'power'),
    ],
  },
  {
    id: 'F-IN-TN-0774', name: 'Tuticorin Chlor-Alkali', operator: 'Coromandel Chemicals', sector: 'Chlor-Alkali',
    state: 'Tamil Nadu', lat: 84, lng: 42, targetIntensity: 0.44, actualIntensity: 0.39,
    output: 1_850_000, cap: 814_000, emitted: 721_500, credits: 890,
    sensors: [
      dev('PWR-51', 'Membrane cell load', 'MW', 212, 6, 'power'),
      dev('CEMS-51', 'Boiler stack CO2', '%vol', 9.2, 0.5, 'stack'),
      dev('FLOW-51', 'Brine circulation', 'm3/h', 1_480, 40, 'flow'),
      dev('FUEL-51', 'Boiler fuel oil', 't/h', 12.4, 0.6, 'fuel'),
    ],
  },
  {
    id: 'F-IN-CT-0819', name: 'Korba Thermal Station', operator: 'Mahanadi Power', sector: 'Thermal Power',
    state: 'Chhattisgarh', lat: 46, lng: 52, targetIntensity: 0.82, actualIntensity: 0.88,
    output: 21_400_000, cap: 17_548_000, emitted: 18_832_000, credits: 0,
    sensors: [
      dev('CEMS-61', 'Unit-4 stack CO2', '%vol', 13.6, 0.6, 'stack'),
      dev('FUEL-61', 'Pulverised coal', 't/h', 1_180, 32, 'fuel'),
      dev('PWR-61', 'Gross generation', 'MW', 2_100, 48, 'power'),
      dev('FLOW-61', 'Flue gas flow', 'km3/h', 8.9, 0.4, 'flow'),
    ],
  },
  {
    id: 'F-IN-JH-0902', name: 'Jamshedpur Pulp & Paper', operator: 'Subarnarekha Paper', sector: 'Pulp & Paper',
    state: 'Jharkhand', lat: 44, lng: 60, targetIntensity: 1.06, actualIntensity: 0.97,
    output: 940_000, cap: 996_400, emitted: 911_800, credits: 520,
    sensors: [
      dev('CEMS-71', 'Recovery boiler CO2', '%vol', 12.1, 0.5, 'stack'),
      dev('FUEL-71', 'Black liquor solids', 't/h', 64, 2.4, 'fuel'),
      dev('PWR-71', 'Cogen export', 'MW', 38, 1.6, 'power'),
      dev('FLOW-71', 'Pulp line flow', 't/h', 108, 3.6, 'flow'),
    ],
  },
]

export const ORG_NAMES = [
  'Bharat Steel Ltd', 'Saurashtra Petrochem', 'Vindhya Cement', 'Kalinga Metals',
  'Ganga Agrichem', 'Coromandel Chemicals', 'Mahanadi Power', 'Subarnarekha Paper',
  'Deccan Renewables', 'Aravalli Offsets', 'Nilgiri Green Desk', 'Konkan Carbon Desk',
]

export const VERIFIERS = [
  { id: 'ACV-011', name: 'Bharat Assessment Services', scope: 'Iron & Steel · Cement', accred: 'BEE/ACV/2026/011' },
  { id: 'ACV-027', name: 'Meridian Carbon Assurance', scope: 'Refinery · Petrochem', accred: 'BEE/ACV/2026/027' },
  { id: 'ACV-044', name: 'Southern Verification Bureau', scope: 'Power · Aluminium', accred: 'BEE/ACV/2026/044' },
]

export const PERIOD = 'FY 2026-27 · Q2'
export const PIPELINE = [
  'Pulling CEMS + SCADA telemetry',
  'Normalising to IPCC 2006 factors',
  'Anomaly scan vs 90-day baseline',
  'Hashing and anchoring to registry',
]

const P0 = 1184
const rnd = (a, b) => a + Math.random() * (b - a)

function seedOrders(price) {
  const out = []
  for (let i = 0; i < 7; i++) {
    out.push({ id: 'B' + i, side: 'bid', price: Math.round(price - 4 - i * 7 - rnd(0, 4)), qty: Math.round(rnd(120, 1720)), org: ORG_NAMES[(i * 3) % ORG_NAMES.length], ts: Date.now() })
    out.push({ id: 'A' + i, side: 'ask', price: Math.round(price + 5 + i * 7 + rnd(0, 4)), qty: Math.round(rnd(120, 1720)), org: ORG_NAMES[(i * 5 + 1) % ORG_NAMES.length], ts: Date.now() })
  }
  return out
}

const g = genesis()

export const state = {
  tick: 0,
  live: true,
  facilities: FACILITIES.map(f => ({
    ...f,
    sensors: f.sensors.map(s => ({ ...s })),
    series: Array.from({ length: 40 }, (_, i) => (f.emitted / 4000) * (0.9 + 0.14 * Math.sin(i / 4) + Math.random() * 0.06)),
  })),
  chain: [g],
  mempool: [],
  forging: false,
  integrity: 'sealed',
  reports: [],
  certs: FACILITIES.filter(f => f.credits > 0).map((f, i) => ({
    id: 'c' + i,
    serial: `IN-CCC-2026-${String(4100 + i * 37).padStart(5, '0')}`,
    facilityId: f.id, org: f.operator, sector: f.sector, qty: f.credits,
    vintage: 'FY 2025-26', issuedAt: Date.now() - (i + 2) * 864e5,
    txId: '0x' + sha256(f.id + i).slice(0, 12), status: 'active',
  })),
  orders: seedOrders(P0),
  trades: Array.from({ length: 8 }, (_, i) => ({
    id: 't' + i, price: Math.round(P0 + rnd(-13, 13)), qty: Math.round(rnd(80, 980)),
    buyer: ORG_NAMES[(i * 2) % ORG_NAMES.length], seller: ORG_NAMES[(i * 5 + 3) % ORG_NAMES.length],
    ts: Date.now() - i * 47000, mine: false,
  })),
  price: P0,
  priceSeries: Array.from({ length: 60 }, (_, i) => Math.round(P0 - 60 + i * 1.1 + Math.sin(i / 3) * 14 + Math.random() * 10)),
  events: [],
  stream: [],
  ai: {},          // keyed by reportId / 'brief'
  aiBusy: {},
}

// pre-seed history so the registry never opens empty
;(() => {
  const seed = [
    makeTx('ATTEST', 'CEMS-11', 'REGISTRY', 0, 'Telemetry batch anchored — Jamnagar Refinery Cluster'),
    makeTx('MRV', 'F-IN-GJ-0244', 'ACV-027', 27_804_000, 'Q1 FY26 emissions report submitted'),
    makeTx('VERIFY', 'ACV-027', 'BEE-CCTS', 27_804_000, 'Report verified — intensity 0.84 vs target 0.91'),
    makeTx('ISSUE', 'BEE-CCTS', 'Saurashtra Petrochem', 1240, 'CCC issued — over-achievement of notified target'),
    makeTx('TRADE', 'Kalinga Metals', 'Vindhya Cement', 600, 'Matched on ICX at Rs 1,171/tCO2e'),
    makeTx('ATTEST', 'CEMS-31', 'REGISTRY', 0, 'Telemetry batch anchored — Angul Aluminium Smelter'),
    makeTx('RETIRE', 'Coromandel Chemicals', 'BURN', 310, 'Retired against FY25 compliance obligation'),
    makeTx('ATTEST', 'CEMS-61', 'REGISTRY', 0, 'Telemetry batch anchored — Korba Thermal Station'),
  ]
  let prev = g
  for (let i = 0; i < 4; i++) {
    const b = mine(prev.index + 1, prev.hash, seed.slice(i * 2, i * 2 + 2), Date.now() - (4 - i) * 92_000)
    state.chain.push(b); prev = b
  }
})()

// ── event bus ────────────────────────────────────────────────
const listeners = new Set()
export const onChange = fn => { listeners.add(fn); return () => listeners.delete(fn) }
const emit = () => listeners.forEach(fn => fn())

let eventSeq = 0
export function note(kind, title, body) {
  state.events = [...state.events, { id: ++eventSeq, kind, title, body, ts: Date.now() }].slice(-6)
  emit()
}

// ── chain ops ────────────────────────────────────────────────
function pushTx(tx) {
  state.mempool = [...state.mempool, tx]
  if (state.mempool.length >= 3) forge()
  emit()
}

export function forge() {
  if (!state.mempool.length || state.forging) return
  const txs = state.mempool
  state.forging = true
  state.mempool = []
  emit()
  setTimeout(() => {
    const prev = state.chain[state.chain.length - 1]
    state.chain = [...state.chain, mine(prev.index + 1, prev.hash, txs)].slice(-60)
    state.forging = false
    emit()
  }, 520)
}

export function tamper(index) {
  const target = index ?? state.chain[Math.max(1, Math.floor(state.chain.length / 2))].index
  state.chain = validate(state.chain.map(b => {
    if (b.index !== target) return b
    const txs = b.txs.map((t, i) => {
      if (i !== 0) return t
      const edited = { ...t, qty: Math.round(t.qty * 4.6 + 9_500), note: t.note + '  [ledger row rewritten]' }
      return { ...edited, hash: txHash(edited) }
    })
    return { ...b, txs, tampered: true }
  }))
  state.integrity = 'broken'
  note('bad', 'Integrity alarm', `Block #${target} no longer hashes to its recorded digest. Every block after it is orphaned.`)
  return { target }
}

export function revalidate() {
  const chain = [...state.chain]
  const i = chain.findIndex(b => b.tampered)
  if (i < 0) { state.chain = validate(chain); state.integrity = 'sealed'; emit(); return }
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
  state.chain = validate(chain)
  state.integrity = 'sealed'
  note('ok', 'Consensus restored', 'Honest nodes rejected the rewrite. The canonical chain was re-derived from block 0.')
}

// ── MRV ──────────────────────────────────────────────────────
export function submitReport(facilityId) {
  const f = state.facilities.find(x => x.id === facilityId)
  if (!f) return { error: 'unknown facility' }
  if (state.reports.some(r => r.facilityId === facilityId && (r.status === 'pending' || r.status === 'ingesting')))
    return { error: `${f.name} already has a report awaiting verification.` }

  const rep = {
    id: 'R-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    facilityId, facility: f.name, operator: f.operator, sector: f.sector, period: PERIOD,
    tCO2e: Math.round(f.emitted), intensity: f.actualIntensity, target: f.targetIntensity,
    output: f.output, status: 'ingesting', stage: 0, submittedAt: Date.now(),
    verifier: VERIFIERS[FACILITIES.findIndex(x => x.id === facilityId) % VERIFIERS.length].name,
    hash: '',
  }
  state.reports = [rep, ...state.reports]
  emit()

  PIPELINE.forEach((_, i) => setTimeout(() => {
    state.reports = state.reports.map(r => (r.id === rep.id ? { ...r, stage: i + 1 } : r))
    emit()
  }, 520 + i * 620))

  setTimeout(() => {
    const hash = '0x' + sha256(rep.id + rep.tCO2e + rep.facilityId).slice(0, 16)
    state.reports = state.reports.map(r => (r.id === rep.id ? { ...r, status: 'pending', hash } : r))
    pushTx(makeTx('MRV', facilityId, 'ACV', Math.round(f.emitted), `${PERIOD} MRV report ${rep.id} anchored — ${f.name}`))
    note('info', 'Report anchored', `${rep.id} is now immutable and queued with ${rep.verifier}.`)
  }, 520 + PIPELINE.length * 620)

  return { id: rep.id }
}

export function decideReport(id, approve) {
  const r = state.reports.find(x => x.id === id)
  if (!r || r.status !== 'pending') return { error: 'report is not awaiting a decision' }
  state.reports = state.reports.map(x => (x.id === id ? { ...x, status: approve ? 'verified' : 'rejected' } : x))
  pushTx(makeTx('VERIFY', 'ACV', 'BEE-CCTS', r.tCO2e,
    `${r.id} ${approve ? 'verified' : 'rejected'} — intensity ${r.intensity} vs target ${r.target} tCO2e/t`))

  if (!approve) {
    note('warn', 'Report rejected', `${r.facility} must resubmit with corrected activity data.`)
    return { ok: true }
  }

  const f = state.facilities.find(x => x.id === r.facilityId)
  const over = f.targetIntensity - f.actualIntensity
  const qty = Math.round(Math.abs(over) * f.output / 1000)

  if (over > 0) {
    const cert = {
      id: 'c' + Date.now(),
      serial: `IN-CCC-2026-${String(5000 + state.certs.length * 41).padStart(5, '0')}`,
      facilityId: f.id, org: f.operator, sector: f.sector, qty,
      vintage: 'FY 2026-27', issuedAt: Date.now(),
      txId: '0x' + sha256(f.id + Date.now()).slice(0, 12), status: 'active',
    }
    state.certs = [cert, ...state.certs]
    state.facilities = state.facilities.map(x => (x.id === f.id ? { ...x, credits: x.credits + qty } : x))
    pushTx(makeTx('ISSUE', 'BEE-CCTS', f.operator, qty, `${qty} CCC issued to ${f.operator} — ${cert.serial}`))
    note('ok', 'Carbon Credit Certificate minted', `${qty.toLocaleString('en-IN')} CCC issued to ${f.operator}.`)
  } else {
    pushTx(makeTx('VERIFY', 'BEE-CCTS', f.operator, qty, `Shortfall of ${qty} tCO2e recorded — ${f.name} must surrender CCCs`))
    note('warn', 'Compliance shortfall', `${f.name} is ${qty.toLocaleString('en-IN')} tCO2e over its notified target.`)
  }
  return { ok: true }
}

// ── market ───────────────────────────────────────────────────
export function hit(orderId, myOrg = 'Bharat Steel Ltd') {
  const o = state.orders.find(x => x.id === orderId)
  if (!o) return { error: 'order already filled' }
  const buyer = o.side === 'ask' ? myOrg : o.org
  const seller = o.side === 'ask' ? o.org : myOrg
  state.trades = [{ id: 'T' + Date.now(), price: o.price, qty: o.qty, buyer, seller, ts: Date.now(), mine: true }, ...state.trades].slice(0, 30)
  state.orders = state.orders.filter(x => x.id !== orderId)
  state.price = o.price
  pushTx(makeTx('TRADE', seller, buyer, o.qty, `${o.qty} CCC matched on ICX at Rs ${o.price}/tCO2e — T+0 settlement`))
  note('ok', 'Trade settled on-chain', `${o.qty.toLocaleString('en-IN')} CCC at Rs ${o.price} — settled in the next block.`)
  return { ok: true }
}

export function retire(certId) {
  const c = state.certs.find(x => x.id === certId)
  if (!c || c.status === 'retired') return { error: 'certificate already retired' }
  state.certs = state.certs.map(x => (x.id === certId ? { ...x, status: 'retired' } : x))
  pushTx(makeTx('RETIRE', c.org, 'BURN', c.qty, `${c.serial} retired against ${PERIOD} obligation — permanently removed`))
  note('ok', 'Certificate retired', `${c.serial} burned. It can never be traded again.`)
  return { ok: true }
}

export const setLive = v => { state.live = !!v; emit() }

// ── the live loop ────────────────────────────────────────────
let timer = null
export function startLoop() {
  if (timer) return
  timer = setInterval(() => {
    if (!state.live) return
    const t = ++state.tick

    state.facilities = state.facilities.map(f => {
      const sensors = f.sensors.map(s => {
        const drift = (Math.random() - 0.5) * s.vol
        const pull = (s.base - s.value) * 0.14
        return { ...s, value: Math.max(0, s.value + drift + pull) }
      })
      const load = sensors[0].value / sensors[0].base
      const series = [...f.series.slice(1), (f.emitted / 4000) * (0.94 + load * 0.09)]
      return { ...f, sensors, series, emitted: f.emitted + Math.round((f.emitted / 52560) * load) }
    })

    const drift = (Math.random() - 0.5) * 9 + (P0 - state.price) * 0.02
    state.price = Math.max(600, Math.round(state.price + drift))
    state.priceSeries = [...state.priceSeries.slice(1), state.price]

    state.orders = state.orders.map(o =>
      Math.random() < 0.18 ? { ...o, qty: Math.max(40, Math.round(o.qty * rnd(0.82, 1.24))) } : o)
    if (state.orders.length < 14 && Math.random() < 0.5) {
      const side = Math.random() < 0.5 ? 'bid' : 'ask'
      state.orders = [...state.orders, {
        id: side[0].toUpperCase() + Date.now(), side,
        price: side === 'bid' ? state.price - 3 - Math.round(rnd(0, 40)) : state.price + 3 + Math.round(rnd(0, 40)),
        qty: Math.round(rnd(100, 1500)), org: ORG_NAMES[Math.floor(Math.random() * ORG_NAMES.length)], ts: Date.now(),
      }]
    }

    if (t % 4 === 0) {
      state.trades = [{
        id: 'T' + Date.now(), price: state.price + Math.round(rnd(-4, 4)), qty: Math.round(rnd(60, 760)),
        buyer: ORG_NAMES[Math.floor(Math.random() * ORG_NAMES.length)],
        seller: ORG_NAMES[Math.floor(Math.random() * ORG_NAMES.length)],
        ts: Date.now(), mine: false,
      }, ...state.trades].slice(0, 30)
    }

    // device ingest log
    const fac = state.facilities[t % state.facilities.length]
    const sn = fac.sensors[(t * 3) % fac.sensors.length]
    state.stream = [{
      key: 'k' + t, ts: Date.now(), dev: sn.id,
      label: `${sn.label} · ${fac.name}`, value: sn.value.toFixed(1), unit: sn.unit,
    }, ...state.stream].slice(0, 40)

    if (t % 3 === 0 && state.integrity === 'sealed') {
      pushTx(makeTx('ATTEST', sn.id, 'REGISTRY', 0,
        `Telemetry batch anchored — ${sn.label} @ ${sn.value.toFixed(1)} ${sn.unit} · ${fac.name}`))
    }
    emit()
  }, 1100)
}

/** What the client sees. Chain is trimmed — the client only ever renders the recent window. */
export function snapshot() {
  return {
    tick: state.tick, live: state.live, price: state.price, priceSeries: state.priceSeries,
    facilities: state.facilities, chain: state.chain.slice(-26), chainHeight: state.chain[state.chain.length - 1].index,
    chainLength: state.chain.length, mempool: state.mempool.length, forging: state.forging,
    integrity: state.integrity, reports: state.reports, certs: state.certs,
    orders: state.orders, trades: state.trades, stream: state.stream, events: state.events,
    ai: state.ai, aiBusy: state.aiBusy,
    meta: { period: PERIOD, pipeline: PIPELINE, verifiers: VERIFIERS },
  }
}
