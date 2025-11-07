export const api = {
  async run(agent: string, payload: any) {
    const res = await fetch(`/api/run/${encodeURIComponent(agent)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload })
    })
    if (!res.ok) throw new Error(`Run failed: ${res.status}`)
    return res.json()
  }
}
