import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import fs from 'node:fs/promises'
import { env } from '../env.js'
import { hub } from '../sse.js'

const RunBody = z.object({
  npc: z.string().optional(),
  payload: z.any().optional(),
})

export function registerRunRoutes(app: FastifyInstance) {
  app.post('/api/run/:agent', async (req, reply) => {
    const agent = (req.params as any)?.agent as string
    const body = RunBody.parse(req.body ?? {})

    const mapRaw = await fs.readFile(env.AGENT_MAP_FILE, 'utf8').catch(() => '[]')
    const mappings: Array<{ agent: string; npc: string; webhookUrl: string }> = JSON.parse(mapRaw)
    const row = mappings.find((m) => m.agent === agent)
    if (!row) return reply.code(404).send({ error: 'unknown agent' })

    const npc = body.npc || row.npc

    // emit started to SSE right away
    hub.broadcast({ npc, type: 'started', data: { agent, at: new Date().toISOString() } })

    // forward to AP webhook
    try {
      const res = await fetch(row.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: body.payload ?? {}, npc, agent }),
      })
      if (!res.ok) {
        const txt = await res.text()
        hub.broadcast({ npc, type: 'error', data: { agent, status: res.status, txt } })
        return reply.code(502).send({ error: 'webhook error', status: res.status, txt })
      }
    } catch (e: any) {
      hub.broadcast({ npc, type: 'error', data: { agent, message: e?.message } })
      return reply.code(500).send({ error: 'forward failed', message: String(e) })
    }

    return reply.send({ ok: true })
  })

  // Optional AI build endpoint stub
  app.post('/api/build', async (_req, reply) => {
    return reply.code(501).send({ error: 'Not implemented yet. Use /studio to build flows manually first.' })
  })
}
