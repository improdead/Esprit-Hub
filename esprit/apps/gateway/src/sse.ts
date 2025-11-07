import type { FastifyReply } from 'fastify'

export type SseEvent = {
  npc: string
  type: 'started' | 'step' | 'awaiting' | 'done' | 'error'
  data?: any
  ts?: string
}

export class SseHub {
  private channels: Map<string, Set<FastifyReply>> = new Map()

  add(npc: string, res: FastifyReply) {
    if (!this.channels.has(npc)) this.channels.set(npc, new Set())
    this.channels.get(npc)!.add(res)
  }

  remove(npc: string, res: FastifyReply) {
    const set = this.channels.get(npc)
    if (set) {
      set.delete(res)
      if (set.size === 0) this.channels.delete(npc)
    }
  }

  broadcast(evt: SseEvent) {
    const payload = JSON.stringify({ ...evt, ts: evt.ts || new Date().toISOString() })
    const set = this.channels.get(evt.npc)
    if (!set) return
    for (const res of set) {
      res.raw.write(`event: ${evt.type}\n`)
      res.raw.write(`data: ${payload}\n\n`)
    }
  }
}

export const hub = new SseHub()
