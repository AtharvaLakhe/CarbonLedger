// Thin client over the registry node. All chain state, mining and AI analysis happen
// server-side; this file only mirrors the stream and posts intents back.
import { useSyncExternalStore } from 'react'

export type Role = 'industry' | 'verifier' | 'regulator'
export type View = 'ops' | 'registry' | 'market' | 'compliance' | 'verify' | 'vault'

export interface Sensor { id: string; label: string; unit: string; value: number; base: number; vol: number; kind: 'stack' | 'fuel' | 'power' | 'flow' }
export interface Facility {
  id: string; name: string; operator: string; sector: string; state: string
  lat: number; lng: number; targetIntensity: number; actualIntensity: number
  output: number; cap: number; emitted: number; credits: number
  sensors: Sensor[]; series: number[]
}
export interface Tx { id: string; kind: 'MRV' | 'VERIFY' | 'ISSUE' | 'TRADE' | 'RETIRE' | 'ATTEST'; from: string; to: string; qty: number; note: string; ts: number; hash: string }
export interface Block { index: number; ts: number; txs: Tx[]; prevHash: string; nonce: number; hash: string; merkle: string; valid: boolean; tampered?: boolean }
export interface Report {
  id: string; facilityId: string; facility: string; operator: string; sector: string
  period: string; tCO2e: number; intensity: number; target: number; output: number
  status: 'ingesting' | 'pending' | 'verified' | 'rejected'; stage: number
  submittedAt: number; verifier: string; hash: string
}
export interface Certificate { id: string; serial: string; facilityId: string; org: string; sector: string; qty: number; vintage: string; issuedAt: number; txId: string; status: 'active' | 'listed' | 'retired' }
export interface Order { id: string; side: 'bid' | 'ask'; price: number; qty: number; org: string; ts: number }
export interface Trade { id: string; price: number; qty: number; buyer: string; seller: string; ts: number; mine: boolean }
export interface StreamLine { key: string; ts: number; dev: string; label: string; value: string; unit: string }

export interface Audit {
  recommendation: 'approve' | 'reject' | 'review'
  confidence: number
  headline: string
  findings: { label: string; detail: string; severity: 'info' | 'warn' | 'risk' }[]
  deviceChecks: { device: string; verdict: 'consistent' | 'anomalous'; detail: string }[]
  creditImpact: string
  source: 'groq' | 'offline'
  model?: string
  at: number
}
export interface Brief {
  headline: string
  risks: { title: string; detail: string; level: 'low' | 'medium' | 'high' }[]
  marketNote: string
  integrityNote: string
  source: 'groq' | 'offline'
  model?: string
  at: number
}
export interface Answer { answer: string; citations: string[]; source: 'groq' | 'offline'; model?: string; at: number }

export interface Toast { id: number; kind: 'ok' | 'warn' | 'bad' | 'info'; title: string; body: string }

export interface State {
  connected: boolean
  booted: boolean
  tick: number
  live: boolean
  role: Role
  view: View
  selected: string | null
  facilities: Facility[]
  chain: Block[]
  chainHeight: number
  chainLength: number
  mempool: number
  forging: boolean
  integrity: 'sealed' | 'broken'
  reports: Report[]
  certs: Certificate[]
  orders: Order[]
  trades: Trade[]
  price: number
  priceSeries: number[]
  stream: StreamLine[]
  ai: Record<string, Audit | Brief>
  aiBusy: Record<string, boolean>
  toasts: Toast[]
  myOrg: string
  ask: { busy: boolean; question: string; answer: Answer | null }
}

export const PIPELINE = [
  'Pulling CEMS + SCADA telemetry',
  'Normalising to IPCC 2006 factors',
  'Anomaly scan vs 90-day baseline',
  'Hashing and anchoring to registry',
]

export const VERIFIERS = [
  { id: 'ACV-011', name: 'Bharat Assessment Services', scope: 'Iron & Steel · Cement', accred: 'BEE/ACV/2026/011' },
  { id: 'ACV-027', name: 'Meridian Carbon Assurance', scope: 'Refinery · Petrochem', accred: 'BEE/ACV/2026/027' },
  { id: 'ACV-044', name: 'Southern Verification Bureau', scope: 'Power · Aluminium', accred: 'BEE/ACV/2026/044' },
]

export const SECTOR_COLOR: Record<string, string> = {
  'Iron & Steel': '#e8603c',
  'Petroleum Refinery': '#6f8fa8',
  'Cement': '#c9a227',
  'Aluminium': '#8e8fb5',
  'Fertiliser': '#3ecf9a',
  'Chlor-Alkali': '#4fb3a8',
  'Thermal Power': '#e2503f',
  'Pulp & Paper': '#8a8f96',
}

export const compact = (n: number) => {
  if (Math.abs(n) >= 1e7) return (n / 1e7).toFixed(2) + ' Cr'
  if (Math.abs(n) >= 1e5) return (n / 1e5).toFixed(2) + ' L'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'k'
  return n.toFixed(0)
}

let state: State = {
  connected: false, booted: false, tick: 0, live: true,
  role: 'industry', view: 'ops', selected: null,
  facilities: [], chain: [], chainHeight: 0, chainLength: 0, mempool: 0,
  forging: false, integrity: 'sealed',
  reports: [], certs: [], orders: [], trades: [],
  price: 0, priceSeries: [], stream: [], ai: {}, aiBusy: {},
  toasts: [], myOrg: 'Bharat Steel Ltd',
  ask: { busy: false, question: '', answer: null },
}

const subs = new Set<() => void>()
const emit = () => subs.forEach(f => f())
function set(patch: Partial<State>) { state = { ...state, ...patch }; emit() }

export function subscribe(cb: () => void) { subs.add(cb); return () => { subs.delete(cb) } }
export function getState() { return state }
export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state), () => sel(state))
}

// ── toasts, fed by the node's event log ──────────────────────
let toastSeq = 0
const seenEvents = new Set<number>()
function toast(kind: Toast['kind'], title: string, body: string) {
  const t = { id: ++toastSeq, kind, title, body }
  set({ toasts: [...state.toasts, t] })
  setTimeout(() => set({ toasts: state.toasts.filter(x => x.id !== t.id) }), 5200)
}

// ── transport ────────────────────────────────────────────────
type ServerEvent = { id: number; kind: Toast['kind']; title: string; body: string }
type Snapshot = Omit<State, 'connected' | 'booted' | 'role' | 'view' | 'selected' | 'toasts' | 'myOrg' | 'ask'> & { events: ServerEvent[] }

let source: EventSource | null = null
let firstSnapshot = true

export function connect() {
  if (source) return
  source = new EventSource('/api/stream')

  source.onmessage = e => {
    const s: Snapshot = JSON.parse(e.data)
    const { events, ...rest } = s
    if (firstSnapshot) {
      firstSnapshot = false
      events.forEach(ev => seenEvents.add(ev.id))   // don't replay history as toasts
    } else {
      events.forEach(ev => {
        if (seenEvents.has(ev.id)) return
        seenEvents.add(ev.id)
        toast(ev.kind, ev.title, ev.body)
      })
    }
    set({ ...rest, connected: true } as Partial<State>)
  }

  source.onerror = () => set({ connected: false })
}

export function disconnect() { source?.close(); source = null; firstSnapshot = true }
export const markBooted = () => set({ booted: true })

async function post<T = unknown>(path: string, body: Record<string, unknown> = {}): Promise<T | null> {
  try {
    const res = await fetch(path, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    })
    const json = await res.json()
    if (json?.error) { toast('warn', 'Rejected by the registry', json.error); return null }
    return json as T
  } catch {
    toast('bad', 'Registry node unreachable', 'The API is not responding. Check that the registry node is running.')
    return null
  }
}

// ── intents ──────────────────────────────────────────────────
export const submitReport = (facilityId: string) => post('/api/report', { facilityId })
export const decideReport = (id: string, approve: boolean) => post('/api/decide', { id, approve })
export const hit = (orderId: string) => post('/api/trade', { orderId, myOrg: state.myOrg })
export const retire = (certId: string) => post('/api/retire', { certId })
export const tamper = (index?: number) => post('/api/tamper', index === undefined ? {} : { index })
export const revalidate = () => post('/api/revalidate')
export const forge = () => post('/api/forge')
export const setLive = (live: boolean) => { set({ live }); post('/api/live', { live }) }

export const runAudit = (reportId: string) => post<Audit>('/api/ai/audit', { reportId })
export const runBrief = () => post<Brief>('/api/ai/brief')

export async function askRegistry(question: string) {
  set({ ask: { busy: true, question, answer: null } })
  const answer = await post<Answer>('/api/ai/ask', { question })
  set({ ask: { busy: false, question, answer } })
}
export const clearAsk = () => set({ ask: { busy: false, question: '', answer: null } })

// ── local view state ─────────────────────────────────────────
export function setRole(r: Role) {
  const view: View = r === 'industry' ? 'ops' : r === 'verifier' ? 'verify' : 'compliance'
  set({
    role: r, view, selected: null,
    myOrg: r === 'industry' ? 'Bharat Steel Ltd' : r === 'verifier' ? 'Bharat Assessment Services' : 'Bureau of Energy Efficiency',
  })
}
export const setView = (v: View) => set({ view: v })
export const select = (id: string | null) => set({ selected: id })
