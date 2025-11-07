import React, { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'

type Log = { ts: string; type: string; data?: any }

export function NPCPanel({ npcId, label }: { npcId: string; label: string }) {
  const [status, setStatus] = useState<'idle' | 'running' | 'awaiting' | 'done' | 'error'>('idle')
  const [logs, setLogs] = useState<Log[]>([])
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource(`/api/stream?npc=${encodeURIComponent(npcId)}`)
    esRef.current = es
    es.onmessage = (ev) => {
      // not used; we rely on named events
    }
    es.addEventListener('started', (ev) => handleEvt('started', ev))
    es.addEventListener('step', (ev) => handleEvt('step', ev))
    es.addEventListener('awaiting', (ev) => handleEvt('awaiting', ev))
    es.addEventListener('done', (ev) => handleEvt('done', ev))
    es.addEventListener('error', (ev) => handleEvt('error', ev))
    es.onerror = () => { /* keep open; browser will retry */ }
    return () => { es.close() }
  }, [npcId])

  function handleEvt(type: string, ev: Event) {
    try {
      const data = JSON.parse((ev as MessageEvent).data)
      setLogs((prev) => [...prev, { ts: data.ts || new Date().toISOString(), type, data }])
      if (type === 'started') setStatus('running')
      else if (type === 'awaiting') setStatus('awaiting')
      else if (type === 'done') setStatus('done')
      else if (type === 'error') setStatus('error')
      else setStatus('running')
    } catch (e) {
      // ignore
    }
  }

  const pill = useMemo(() => {
    const color = status === 'running' ? '#c7d2fe' : status === 'done' ? '#bbf7d0' : status === 'error' ? '#fecaca' : '#e5e7eb'
    const text = status
    return <span className="pill" style={{ background: color }}>{text}</span>
  }, [status])

  const run = async () => {
    await api.run(npcId, {})
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{npcId}</div>
        </div>
        <div style={{ display:'flex', gap: 8, alignItems:'center' }}>
          {pill}
          <button className="btn" onClick={run}>Run</button>
        </div>
      </div>
      <div className="log">
        {logs.length === 0 ? <div style={{ opacity: 0.6 }}>[no events yet]</div> : logs.map((l, i) => (
          <div key={i}>
            <span style={{ opacity: 0.6 }}>{new Date(l.ts).toLocaleTimeString()}</span>
            <span> • </span>
            <b>{l.type}</b>
            {l.data ? <pre style={{ display:'inline', margin: 0 }}> {short(JSON.stringify(l.data))}</pre> : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function short(s: string, max = 120) { return s.length > max ? s.slice(0, max) + '…' : s }
