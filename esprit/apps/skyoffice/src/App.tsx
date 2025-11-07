import React, { useMemo } from 'react'
import { NPCPanel } from './components/NPCPanel'

export function App() {
  const npcs = useMemo(() => ([
    { id: 'scheduler', name: 'Scheduler' },
    { id: 'mailops', name: 'MailOps' },
  ]), [])

  return (
    <>
      <header>
        <div>
          <b>SkyOffice</b>
        </div>
        <div>
          <a className="btn secondary" href="/studio/" target="_blank" rel="noopener noreferrer">Open Sim Studio</a>
        </div>
      </header>
      <div className="container">
        <div className="row">
          {npcs.map(n => (
            <div key={n.id} className="card" style={{ width: 360 }}>
              <NPCPanel npcId={n.id} label={n.name} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
