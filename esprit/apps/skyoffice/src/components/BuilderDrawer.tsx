import React from 'react'

export function BuilderDrawer({ open, onClose }: {open:boolean; onClose:()=>void}) {
  if (!open) return null
  return (
    <div className="fixed inset-0" style={{ position:'fixed', inset: 0 as any }}>
      <div onClick={onClose} style={{ position:'absolute', inset: 0, background:'rgba(0,0,0,0.5)' }} />
      <div className="panel" style={{ position:'absolute', right:0, top:0, height:'100%', width: 960, background:'white', boxShadow:'-2px 0 8px rgba(0,0,0,0.1)' }}>
        <div className="bar" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:12, borderBottom:'1px solid #e5e7eb' }}>
          <b>Agent Builder</b>
          <button className="btn secondary" onClick={onClose}>Close</button>
        </div>
        <iframe src="/studio/" style={{ border:0, width:'100%', height:'calc(100% - 48px)' }} />
      </div>
    </div>
  )
}
