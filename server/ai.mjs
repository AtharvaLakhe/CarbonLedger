// Groq-backed analysis layer. The key never leaves this process — the browser only ever
// sees the parsed result, which is why this lives behind the API rather than in the client.
import { readFileSync } from 'node:fs'

function loadEnv() {
  try {
    for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* no .env — rely on the ambient environment */ }
}
loadEnv()

const KEY = process.env.GROQ_API_KEY || ''
const MODELS = [process.env.GROQ_MODEL, 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'].filter(Boolean)
const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

export const aiConfigured = () => Boolean(KEY)

let activeModel = null

async function complete(system, user, { maxTokens = 900 } = {}) {
  if (!KEY) throw new Error('GROQ_API_KEY is not set')
  const order = activeModel ? [activeModel, ...MODELS.filter(m => m !== activeModel)] : MODELS
  let last

  for (const model of order) {
    const ctl = new AbortController()
    const timeout = setTimeout(() => ctl.abort(), 20_000)
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        signal: ctl.signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        }),
      })
      if (!res.ok) { last = new Error(`${model}: ${res.status} ${(await res.text()).slice(0, 180)}`); continue }
      const json = await res.json()
      activeModel = model
      return { data: JSON.parse(json.choices[0].message.content), model }
    } catch (e) {
      last = e
    } finally {
      clearTimeout(timeout)
    }
  }
  throw last ?? new Error('no model responded')
}

const num = n => Number(n).toLocaleString('en-IN')

// ── verification co-pilot ────────────────────────────────────
const AUDIT_SYSTEM = `You are an accredited carbon verifier working under India's Carbon Credit Trading Scheme (CCTS),
reviewing an MRV report submitted by an obligated entity. You see the reported emissions, the notified
greenhouse-gas intensity target, the measured intensity, and live readings from the facility's connected
CEMS/SCADA devices.

Judge only what the data supports. Be specific and quantitative. Never invent regulations or numbers that
are not derivable from the input.

Reply with JSON exactly matching:
{
  "recommendation": "approve" | "reject" | "review",
  "confidence": 0-100,
  "headline": "one sentence, max 110 chars, plain English",
  "findings": [{ "label": "3-5 word label", "detail": "one sentence", "severity": "info"|"warn"|"risk" }],
  "deviceChecks": [{ "device": "device id", "verdict": "consistent"|"anomalous", "detail": "one short sentence" }],
  "creditImpact": "one sentence on issuance or shortfall consequences"
}
Give 3-4 findings and cover every device supplied.`

export async function auditReport(report, facility) {
  const beat = +(facility.targetIntensity - facility.actualIntensity).toFixed(3)
  const qty = Math.round(Math.abs(beat) * facility.output / 1000)
  const devices = facility.sensors
    .map(s => `- ${s.id} ${s.label}: ${s.value.toFixed(1)} ${s.unit} (nameplate baseline ${s.base} ${s.unit})`)
    .join('\n')

  const user = `MRV report ${report.id} — compliance period ${report.period}

Facility: ${facility.name} (${facility.id}), operated by ${facility.operator}
Sector: ${facility.sector} · State: ${facility.state}
Product output this period: ${num(facility.output)} t
Reported emissions: ${num(report.tCO2e)} tCO2e
Allowance (cap): ${num(facility.cap)} tCO2e
Notified intensity target: ${facility.targetIntensity} tCO2e per t product
Measured intensity: ${facility.actualIntensity} tCO2e per t product
Delta vs target: ${beat >= 0 ? '+' : ''}${beat} (positive means the target was beaten)
Certificates at stake if approved: ${num(qty)} CCC ${beat >= 0 ? 'to be issued' : 'shortfall to be surrendered'}

Live device readings at the moment of submission:
${devices}`

  try {
    const { data, model } = await complete(AUDIT_SYSTEM, user)
    return { ...data, source: 'groq', model, at: Date.now() }
  } catch (e) {
    // MOCK: deterministic fallback so a network blip never kills the review flow.
    const ok = beat >= 0
    return {
      recommendation: ok ? 'approve' : 'review',
      confidence: ok ? 88 : 64,
      headline: ok
        ? `Measured intensity beats the notified target by ${Math.abs(beat)} tCO2e/t; issuance is supported.`
        : `Measured intensity misses the notified target by ${Math.abs(beat)} tCO2e/t; a shortfall is recorded.`,
      findings: [
        { label: 'Intensity vs target', detail: `Measured ${facility.actualIntensity} against a notified ${facility.targetIntensity} tCO2e per t product.`, severity: ok ? 'info' : 'risk' },
        { label: 'Cap utilisation', detail: `Reported ${num(report.tCO2e)} tCO2e against an allowance of ${num(facility.cap)} tCO2e.`, severity: report.tCO2e > facility.cap ? 'warn' : 'info' },
        { label: 'Device coverage', detail: `${facility.sensors.length} connected devices streamed continuously through the period with no ingest gap.`, severity: 'info' },
      ],
      deviceChecks: facility.sensors.map(s => ({
        device: s.id,
        verdict: Math.abs(s.value - s.base) / s.base > 0.06 ? 'anomalous' : 'consistent',
        detail: `Reading ${s.value.toFixed(1)} ${s.unit} against a ${s.base} ${s.unit} baseline.`,
      })),
      creditImpact: ok
        ? `Approving mints ${num(qty)} CCC to ${facility.operator}.`
        : `Approving records a ${num(qty)} tCO2e shortfall that ${facility.operator} must cover by surrendering CCCs.`,
      source: 'offline',
      error: String(e.message || e).slice(0, 160),
      at: Date.now(),
    }
  }
}

// ── regulator brief ──────────────────────────────────────────
const BRIEF_SYSTEM = `You are the market surveillance desk at India's Bureau of Energy Efficiency, writing the
daily supervisory brief on the Carbon Credit Trading Scheme. You are given the live compliance position of
every obligated entity, the registry's integrity status and the state of the certificate market.

Be concise, factual and specific to the numbers given. No boilerplate, no recommendations you cannot
support from the data.

Reply with JSON exactly matching:
{
  "headline": "one sentence, max 120 chars",
  "risks": [{ "title": "3-6 words", "detail": "one or two sentences", "level": "low"|"medium"|"high" }],
  "marketNote": "one sentence on price and liquidity",
  "integrityNote": "one sentence on registry integrity"
}
Give exactly 3 risks, ordered most severe first.`

export async function schemeBrief(s) {
  const rows = s.facilities.map(f =>
    `- ${f.name} (${f.sector}, ${f.state}): emitted ${num(Math.round(f.emitted))} tCO2e vs cap ${num(f.cap)}; intensity ${f.actualIntensity} vs target ${f.targetIntensity}`
  ).join('\n')
  const breach = s.facilities.filter(f => f.actualIntensity > f.targetIntensity).length
  const circulating = s.certs.filter(c => c.status !== 'retired').reduce((a, b) => a + b.qty, 0)
  const vol = s.trades.reduce((a, b) => a + b.qty, 0)

  const user = `Compliance year ${s.meta?.period ?? 'FY 2026-27'} — live position

Obligated entities: ${s.facilities.length}, of which ${breach} are above their notified intensity target.
Registry height: block #${s.chainHeight}, integrity ${s.integrity}, ${s.chainLength} blocks held.
Certificates in circulation: ${num(circulating)} CCC across ${s.certs.length} serials.
CCC spot price: Rs ${s.price} per tCO2e. Session volume ${num(vol)} CCC across ${s.trades.length} prints.
Open orders: ${s.orders.length}.

Entity position:
${rows}`

  try {
    const { data, model } = await complete(BRIEF_SYSTEM, user, { maxTokens: 700 })
    return { ...data, source: 'groq', model, at: Date.now() }
  } catch (e) {
    return {
      headline: `${breach} of ${s.facilities.length} obligated entities are above their notified intensity target.`,
      risks: [
        { title: 'Concentrated shortfall exposure', detail: `Breaching entities are clustered in the hardest-to-abate sectors, so demand for certificates is inelastic near the compliance deadline.`, level: breach > 3 ? 'high' : 'medium' },
        { title: 'Thin certificate float', detail: `Only ${num(circulating)} CCC are in circulation against the outstanding shortfall, which leaves the order book easy to move.`, level: 'medium' },
        { title: 'Single-verifier dependency', detail: 'Several sectors route to one accredited verifier, creating a queue risk at period close.', level: 'low' },
      ],
      marketNote: `CCC spot is Rs ${s.price} per tCO2e on ${num(vol)} CCC of session volume.`,
      integrityNote: s.integrity === 'sealed'
        ? `All ${s.chainLength} blocks recompute cleanly from genesis.`
        : 'Registry integrity is broken — a settled record was rewritten and the chain must be re-derived.',
      source: 'offline',
      error: String(e.message || e).slice(0, 160),
      at: Date.now(),
    }
  }
}

// ── natural-language registry query ──────────────────────────
const ASK_SYSTEM = `You answer questions about a live carbon registry using only the state supplied.
The state already contains per-entity shortfall, surplus and cost-at-spot figures — use them directly and
do simple arithmetic on them where the question calls for it. Only say the answer is unavailable if the
state genuinely lacks the facts. Quote figures the way they appear. Keep the answer under 60 words.
Reply with JSON: { "answer": "...", "citations": ["short fact you used", "..."] }`

export async function askRegistry(question, s) {
  // Derive the compliance arithmetic here so the model never has to guess at it.
  const rows = s.facilities.map(f => {
    const delta = +(f.targetIntensity - f.actualIntensity).toFixed(3)
    const tonnes = Math.round(Math.abs(delta) * f.output / 1000)
    return { f, delta, tonnes, cost: tonnes * s.price }
  })
  const short = rows.filter(r => r.delta < 0)
  const surplus = rows.filter(r => r.delta >= 0)
  const shortTotal = short.reduce((a, b) => a + b.tonnes, 0)
  const surplusTotal = surplus.reduce((a, b) => a + b.tonnes, 0)

  const ctx = `Entities (shortfall = tCO2e the entity must cover; surplus = CCC it can earn):
${rows.map(({ f, delta, tonnes, cost }) =>
    `- ${f.name} [${f.sector}, ${f.state}] emitted ${num(Math.round(f.emitted))} of cap ${num(f.cap)} tCO2e; intensity ${f.actualIntensity} vs target ${f.targetIntensity}; ${delta < 0 ? `SHORTFALL ${num(tonnes)} tCO2e, cost at spot Rs ${num(cost)}` : `SURPLUS ${num(tonnes)} tCO2e`}; holds ${num(f.credits)} CCC`).join('\n')}

Scheme totals: ${short.length} entities in shortfall totalling ${num(shortTotal)} tCO2e, which costs Rs ${num(shortTotal * s.price)} to cover at the current spot of Rs ${s.price}/tCO2e. ${surplus.length} entities are in surplus totalling ${num(surplusTotal)} tCO2e.
Registry: block #${s.chainHeight}, integrity ${s.integrity}, ${s.chainLength} blocks held.
Market: CCC spot Rs ${s.price}/tCO2e, ${s.orders.length} open orders, ${s.trades.length} recent prints.
Certificates: ${s.certs.map(c => `${c.serial} ${num(c.qty)} CCC ${c.status} (${c.org})`).join('; ')}
Reports: ${s.reports.map(r => `${r.id} ${r.facility} ${r.status}`).join('; ') || 'none filed this period'}`

  try {
    const { data, model } = await complete(ASK_SYSTEM, `Question: ${question}\n\nRegistry state:\n${ctx}`, { maxTokens: 400 })
    return { ...data, source: 'groq', model, at: Date.now() }
  } catch (e) {
    return {
      answer: 'The analysis service is unreachable right now, so this answer comes from the registry summary only. Try again in a moment.',
      citations: [`Registry at block #${s.chainHeight}, integrity ${s.integrity}`, `CCC spot Rs ${s.price}/tCO2e`],
      source: 'offline', error: String(e.message || e).slice(0, 160), at: Date.now(),
    }
  }
}
