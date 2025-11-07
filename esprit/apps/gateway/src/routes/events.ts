import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { hub } from '../sse.js'

const EventSchema = z.object({
  npc: z.string().min(1),
  type: z.enum(['started', 'step', 'awaiting', 'done', 'error']),
  data: z.any().optional(),
})

export function registerEventsRoutes(app: FastifyInstance) {
  app.post('/api/events', async (req, reply) => {
    const parsed = EventSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() })
    }
    const evt = parsed.data
    hub.broadcast(evt)
    return reply.send({ ok: true })
  })
}
