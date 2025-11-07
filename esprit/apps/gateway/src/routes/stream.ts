import type { FastifyInstance } from 'fastify'
import { hub } from '../sse.js'

export function registerStreamRoutes(app: FastifyInstance) {
  app.get('/api/stream', async (req, reply) => {
    const npc = (req.query as any)?.npc
    if (!npc) return reply.code(400).send({ error: 'npc required' })

    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.flushHeaders?.()

    hub.add(npc, reply)

    // initial comment to open stream
    reply.raw.write(': connected\n\n')

    const keepAlive = setInterval(() => {
      try { reply.raw.write(': keep-alive\n\n') } catch {}
    }, 15000)

    req.raw.on('close', () => {
      clearInterval(keepAlive)
      hub.remove(npc, reply)
    })

    return reply.hijack()
  })
}
