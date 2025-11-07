import Fastify from 'fastify'
import { registerStreamRoutes } from './routes/stream.js'
import { registerEventsRoutes } from './routes/events.js'
import { registerRunRoutes } from './routes/run.js'
import { env } from './env.js'

const fastify = Fastify({ logger: true })

// Simple CORS for dev behind same origin proxy; Nginx already handles in prod
fastify.addHook('onRequest', async (req, reply) => {
  reply.header('Access-Control-Allow-Origin', req.headers.origin || '*')
  reply.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  reply.header('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') {
    reply.code(204).send()
  }
})

registerStreamRoutes(fastify)
registerEventsRoutes(fastify)
registerRunRoutes(fastify)

const port = Number(env.PORT || 3001)
const host = '0.0.0.0'

fastify.listen({ port, host }).then(() => {
  fastify.log.info(`Gateway listening on http://${host}:${port}`)
}).catch((err) => {
  fastify.log.error(err)
  process.exit(1)
})
