// CarbonLedger registry node — zero-dependency HTTP + SSE API over Node's built-in server.
import { createServer } from 'node:http'
import * as reg from './registry.mjs'
import { aiConfigured, askRegistry, auditReport, schemeBrief } from './ai.mjs'

const PORT = Number(process.env.PORT || 8787)

const send = (res, code, body) => {
  const data = JSON.stringify(body)
  res.writeHead(code, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(data),
    'access-control-allow-origin': '*',
  })
  res.end(data)
}

const readBody = req => new Promise(resolve => {
  let raw = ''
  req.on('data', c => { raw += c; if (raw.length > 1e6) req.destroy() })
  req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}) } catch { resolve({}) } })
})

const routes = {
  'GET /api/health': () => ({
    ok: true, ai: aiConfigured(), height: reg.state.chain.at(-1).index, integrity: reg.state.integrity,
  }),
  'GET /api/state': () => reg.snapshot(),

  'POST /api/report': async body => reg.submitReport(body.facilityId),
  'POST /api/decide': async body => reg.decideReport(body.id, body.approve !== false),
  'POST /api/trade': async body => reg.hit(body.orderId, body.myOrg),
  'POST /api/retire': async body => reg.retire(body.certId),
  'POST /api/tamper': async body => reg.tamper(body.index),
  'POST /api/revalidate': async () => { reg.revalidate(); return { ok: true } },
  'POST /api/forge': async () => { reg.forge(); return { ok: true } },
  'POST /api/live': async body => { reg.setLive(body.live); return { ok: true } },

  'POST /api/ai/audit': async body => {
    const report = reg.state.reports.find(r => r.id === body.reportId)
    if (!report) return { error: 'unknown report' }
    const facility = reg.state.facilities.find(f => f.id === report.facilityId)
    reg.state.aiBusy = { ...reg.state.aiBusy, [report.id]: true }
    reg.note('info', 'Verification co-pilot running', `Reviewing ${report.id} against ${facility.sensors.length} device streams.`)
    const result = await auditReport(report, facility)
    reg.state.ai = { ...reg.state.ai, [report.id]: result }
    reg.state.aiBusy = { ...reg.state.aiBusy, [report.id]: false }
    reg.note(result.recommendation === 'approve' ? 'ok' : 'warn', 'Co-pilot opinion ready',
      `${result.recommendation.toUpperCase()} · ${result.confidence}% confidence on ${report.id}.`)
    return result
  },

  'POST /api/ai/brief': async () => {
    reg.state.aiBusy = { ...reg.state.aiBusy, brief: true }
    const result = await schemeBrief(reg.snapshot())
    reg.state.ai = { ...reg.state.ai, brief: result }
    reg.state.aiBusy = { ...reg.state.aiBusy, brief: false }
    reg.note('info', 'Supervisory brief ready', result.headline)
    return result
  },

  'POST /api/ai/ask': async body => {
    if (!body.question) return { error: 'question is required' }
    return askRegistry(body.question, reg.snapshot())
  },
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const path = url.pathname

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type',
    })
    return res.end()
  }

  // Server-sent events: one push per registry change, no polling.
  if (path === '/api/stream') {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
      'access-control-allow-origin': '*',
    })
    const push = () => res.write(`data: ${JSON.stringify(reg.snapshot())}\n\n`)
    push()
    const off = reg.onChange(push)
    const ping = setInterval(() => res.write(': ping\n\n'), 25_000)
    req.on('close', () => { off(); clearInterval(ping) })
    return
  }

  const handler = routes[`${req.method} ${path}`]
  if (!handler) return send(res, 404, { error: `no route for ${req.method} ${path}` })

  try {
    const body = req.method === 'POST' ? await readBody(req) : {}
    const result = await handler(body)
    send(res, result?.error ? 400 : 200, result ?? { ok: true })
  } catch (e) {
    console.error('[api]', e)
    send(res, 500, { error: String(e.message || e) })
  }
})

reg.startLoop()
server.listen(PORT, () => {
  console.log(`  registry node   http://localhost:${PORT}`)
  console.log(`  groq analysis   ${aiConfigured() ? 'configured' : 'NOT configured — set GROQ_API_KEY in .env'}`)
})
