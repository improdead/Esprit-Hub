export const env = {
  AP_BASE: process.env.AP_BASE || 'http://sim',
  AP_TOKEN: process.env.AP_TOKEN || '',
  AP_PROJECT: process.env.AP_PROJECT || '',
  PORT: process.env.PORT || '3001',
  AGENT_MAP_FILE: process.env.AGENT_MAP_FILE || '/app/data/agents.json',
}
