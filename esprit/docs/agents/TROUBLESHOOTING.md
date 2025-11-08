# 🔧 Troubleshooting & FAQ

**Solutions to common issues and frequently asked questions**

Having problems with your agents? This guide covers the most common issues and their fixes.

---

## 📖 Table of Contents

1. [Getting Started Issues](#getting-started-issues)
2. [Agent Triggering Issues](#agent-triggering-issues)
3. [Workflow Execution Issues](#workflow-execution-issues)
4. [Real-time Update Issues](#real-time-update-issues)
5. [External API Issues](#external-api-issues)
6. [Deployment Issues](#deployment-issues)
7. [Performance Issues](#performance-issues)
8. [FAQ](#faq)

---

## Getting Started Issues

### Issue: Sim.ai Studio not loading

**Symptoms**:
- Blank page at `/studio/`
- Error page at `/studio/`
- Redirect to login that doesn't work

**Causes**:
- Missing trailing slash
- `sim` service not running
- Database migrations not complete
- Incorrect URL

**Solutions**:

1. **Use trailing slash**:
   ```
   ❌ http://localhost:8080/studio
   ✅ http://localhost:8080/studio/
   ```

2. **Check Sim.ai is running**:
   ```bash
   docker compose -f infra/docker-compose.yml ps sim
   # Should show: sim - running - (healthy)
   ```

3. **Check database is initialized**:
   ```bash
   docker compose -f infra/docker-compose.yml logs sim-migrations
   # Should show: "Migrations completed successfully"
   ```

4. **Restart Sim.ai**:
   ```bash
   docker compose -f infra/docker-compose.yml restart sim
   ```

5. **Check database connection**:
   ```bash
   docker compose -f infra/docker-compose.yml exec postgres psql -U postgres -d simstudio
   # Should connect successfully
   ```

---

### Issue: Cannot log in to Studio

**Symptoms**:
- Login form appears
- Submit fails with error
- Infinite redirect loop

**Causes**:
- `BETTER_AUTH_SECRET` not set
- Database issue
- Browser cookies

**Solutions**:

1. **Set auth secret in .env**:
   ```bash
   BETTER_AUTH_SECRET=generate-a-random-secret-here
   ```

2. **Clear browser cookies**:
   - Open DevTools (F12)
   - Go to Application → Cookies
   - Delete cookies for `localhost`
   - Reload page

3. **Restart Sim.ai**:
   ```bash
   docker compose -f infra/docker-compose.yml restart sim
   ```

---

## Agent Triggering Issues

### Issue: 404 error when triggering agent

**Symptoms**:
```
POST /api/run/scheduler → 404
{ "error": "Agent 'scheduler' not found in mapping" }
```

**Causes**:
- Agent not in `agents.json`
- Typo in agent ID
- `agents.json` not reloaded
- Gateway restarted but file not found

**Solutions**:

1. **Check agents.json exists**:
   ```bash
   cat esprit/apps/gateway/data/agents.json
   # Should show JSON array with agents
   ```

2. **Verify agent name matches**:
   ```json
   [
     { "agent": "scheduler", "npc": "scheduler", "webhookUrl": "..." }
   ]
   ```

3. **Check for typos**:
   ```bash
   # Bad: ❌
   curl -X POST /api/run/Scheduler  (wrong case)

   # Good: ✅
   curl -X POST /api/run/scheduler  (exact match)
   ```

4. **Restart Gateway**:
   ```bash
   docker compose -f infra/docker-compose.yml restart gateway
   ```

5. **Check Gateway logs**:
   ```bash
   docker compose -f infra/docker-compose.yml logs gateway
   # Look for "Agent loaded: scheduler"
   ```

---

### Issue: Agent triggers but nothing happens

**Symptoms**:
- POST request succeeds (200 OK)
- No status update in UI
- Workflow doesn't execute

**Causes**:
- Webhook URL incorrect
- Sim.ai workflow not deployed
- Network issue between Gateway and Sim.ai
- Wrong trigger configuration

**Solutions**:

1. **Verify webhook URL is correct**:
   ```bash
   # In Sim.ai Studio, check the webhook trigger
   # Copy the exact URL and verify it's in agents.json
   ```

2. **Ensure workflow is deployed**:
   - Open Sim.ai Studio
   - Select your workflow
   - Look for "Deployed" status
   - If not deployed, click Deploy button

3. **Test webhook directly**:
   ```bash
   # Get webhook URL from Studio
   WEBHOOK_URL="http://localhost:8080/api/v1/webhooks/catch/abc123"

   curl -X POST $WEBHOOK_URL \
     -H "Content-Type: application/json" \
     -d '{"test": "payload"}'

   # Should return 200 OK
   ```

4. **Check network connectivity**:
   ```bash
   # From Gateway container, test Sim.ai
   docker compose -f infra/docker-compose.yml exec gateway \
     curl -I http://sim:3000/health

   # Should return 200 OK
   ```

5. **Check Gateway logs**:
   ```bash
   docker compose -f infra/docker-compose.yml logs gateway
   # Look for "Forwarding webhook to: ..."
   # Check for any error messages
   ```

---

## Workflow Execution Issues

### Issue: Workflow starts but doesn't complete

**Symptoms**:
- Status shows "RUNNING"
- No progress updates
- Status never changes to "DONE"
- Stays running forever

**Causes**:
- Workflow stuck on a step
- External API call hanging
- Network timeout
- Infinite loop in code step

**Solutions**:

1. **Check Sim.ai workflow logs**:
   ```bash
   # In Sim.ai Studio:
   # Select workflow → Execution Logs → Find latest run
   # Look for error or hang point
   ```

2. **Check for timeouts**:
   ```javascript
   // In HTTP Request steps, add timeout:
   {
     "timeout": 30  // 30 seconds
   }
   ```

3. **Test step by step**:
   - In Studio, run workflow with Test button
   - Watch each step execute
   - Note which step gets stuck

4. **Disable problematic step**:
   - Comment out or remove the hanging step
   - See if workflow completes
   - Then fix the step

5. **Check external service**:
   - If calling external API, test it:
   ```bash
   curl -I https://api.example.com/endpoint
   # Should respond quickly
   ```

---

### Issue: Workflow gives "rate limit exceeded" error

**Symptoms**:
```
error: "API rate limit exceeded"
```

**Causes**:
- API has rate limits
- Making too many requests
- Not waiting between requests

**Solutions**:

1. **Add delay between calls**:
   ```javascript
   // In workflow:
   Step 1: Make API call
   Step 2: Wait 1 second
   Step 3: Continue
   ```

2. **Batch requests**:
   ```javascript
   // Bad: Make 100 individual calls
   for (let i = 0; i < 100; i++) {
     makeAPICall(items[i]);
   }

   // Good: Make one batch call
   makeAPICall(items);
   ```

3. **Use exponential backoff**:
   ```javascript
   // Retry with increasing delays
   Try (attempt 1): call API
   If rate limited: wait 1s, retry (attempt 2)
   If rate limited: wait 2s, retry (attempt 3)
   If rate limited: wait 4s, retry (attempt 4)
   ```

4. **Check API quota**:
   - Log into the external service
   - Check current usage vs limits
   - Consider upgrading plan

---

### Issue: Workflow fails with "Invalid credentials" error

**Symptoms**:
```
error: "Invalid credentials"
error: "Unauthorized"
error: "403 Forbidden"
```

**Causes**:
- API token expired
- Token not set
- Token doesn't have required permissions
- Wrong token format

**Solutions**:

1. **Verify token is set**:
   ```bash
   # Check in .env or environment
   echo $GOOGLE_TOKEN
   # Should show a token, not empty
   ```

2. **Check token format**:
   ```javascript
   // Common format: Bearer token
   Authorization: "Bearer " + token

   // Or just token
   Authorization: token

   // Check API documentation for correct format
   ```

3. **Regenerate token**:
   - Log into external service
   - Regenerate API key/token
   - Update in `.env`
   - Restart Gateway

4. **Check token permissions**:
   - Some tokens have limited scopes
   - Verify token has required permissions
   - May need to request new token with more scopes

5. **Check token expiration**:
   ```bash
   # Some tokens expire
   # Check when token expires
   # Regenerate if needed
   ```

---

## Real-time Update Issues

### Issue: SSE stream not connecting

**Symptoms**:
- No logs appearing in UI
- Status doesn't update
- Browser console shows no events

**Causes**:
- SSE endpoint not working
- Browser blocking SSE
- Network issue
- Nginx buffering

**Solutions**:

1. **Check SSE endpoint directly**:
   ```bash
   curl -N http://localhost:8080/api/stream?npc=scheduler
   # Should keep connection open
   # Type Ctrl+C to close
   ```

2. **Check Nginx buffering**:
   ```
   # In nginx.conf, ensure:
   location /api/stream {
     proxy_buffering off;     ✅ Important!
     proxy_cache off;
   }
   ```

3. **Check Gateway health**:
   ```bash
   curl http://localhost:3001/health
   # Should return 200 OK
   ```

4. **Check logs**:
   ```bash
   docker compose logs gateway
   # Look for "SSE client connected"
   ```

---

### Issue: Events not appearing in logs

**Symptoms**:
- Agent runs
- No log messages appear
- Logs empty in UI

**Causes**:
- Workflow not sending events to `/api/events`
- Wrong NPC ID
- Events lost due to dropped SSE connection

**Solutions**:

1. **Check workflow sends events**:
   - In Sim.ai Studio, look for HTTP Request steps
   - Verify they POST to `/api/events`
   - Verify correct NPC ID in body

2. **Verify event format**:
   ```javascript
   // Correct format:
   {
     "npc": "scheduler",        // Must match UI
     "type": "step",            // One of: started, step, done, error
     "data": {
       "message": "Processing..." // Optional: any JSON data
     }
   }
   ```

3. **Test event manually**:
   ```bash
   curl -X POST http://localhost:3001/api/events \
     -H "Content-Type: application/json" \
     -d '{
       "npc": "scheduler",
       "type": "step",
       "data": { "message": "Test message" }
     }'
   ```

4. **Check SSE connection first**:
   - Before triggering agent, open SSE stream in another terminal
   - Then trigger agent
   - You should see events in SSE terminal

---

## External API Issues

### Issue: Google Calendar API returning error

**Symptoms**:
```
error: "Invalid request"
error: "Insufficient permissions"
error: "Not found"
```

**Solutions**:

1. **Check API is enabled**:
   - Go to Google Cloud Console
   - Select your project
   - Go to APIs & Services
   - Search for "Google Calendar API"
   - Ensure it's enabled (blue toggle)

2. **Check scopes**:
   ```
   Required scopes for Calendar:
   - calendar.calendars.readonly
   - calendar.events
   ```

3. **Test API directly**:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     https://www.googleapis.com/calendar/v3/calendars/primary/events

   # Should return list of events
   ```

4. **Verify token is valid**:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     https://www.googleapis.com/oauth2/v1/userinfo

   # Should return user info
   ```

---

### Issue: Slack webhook failing

**Symptoms**:
```
error: "Forbidden"
error: "Invalid payload"
error: "webhook_blocked"
```

**Solutions**:

1. **Check webhook URL**:
   - Generate new webhook from Slack
   - Verify URL starts with `https://hooks.slack.com`
   - Update in `.env` or code

2. **Check message format**:
   ```javascript
   // Correct format:
   {
     "text": "Message text",
     "blocks": [...]  // Optional
   }

   // Common mistakes:
   // - Empty text field
   // - Invalid blocks syntax
   // - Too large payload (>4KB)
   ```

3. **Test webhook directly**:
   ```bash
   curl -X POST $SLACK_WEBHOOK \
     -H "Content-Type: application/json" \
     -d '{"text": "Test message"}'
   ```

---

## Deployment Issues

### Issue: Services don't start

**Symptoms**:
- `docker compose up` fails
- Services keep restarting
- Error messages in logs

**Solutions**:

1. **Check all services are healthy**:
   ```bash
   docker compose -f infra/docker-compose.yml ps

   # All should show: running, healthy
   # or: running (if no healthcheck)
   ```

2. **Check logs**:
   ```bash
   # All services
   docker compose -f infra/docker-compose.yml logs

   # Specific service
   docker compose -f infra/docker-compose.yml logs postgres
   docker compose -f infra/docker-compose.yml logs sim
   ```

3. **Clear volumes and restart**:
   ```bash
   # Warning: This deletes all data!
   docker compose -f infra/docker-compose.yml down -v
   docker compose -f infra/docker-compose.yml up -d --build
   ```

---

### Issue: Port already in use

**Symptoms**:
```
Error response from daemon: driver failed programming external connectivity on endpoint: Error starting userland proxy: listen tcp 0.0.0.0:8080: bind: address already in use
```

**Solutions**:

1. **Find process using port**:
   ```bash
   lsof -i :8080
   # Shows process ID using port
   ```

2. **Kill process**:
   ```bash
   kill -9 <PID>
   ```

3. **Use different port**:
   ```bash
   # In docker-compose.yml, change:
   ports:
     - "9090:8080"  # Use 9090 instead
   ```

---

## Performance Issues

### Issue: Agents running slowly

**Symptoms**:
- Workflows take longer than expected
- API responses slow
- Timeouts occurring

**Solutions**:

1. **Check resource usage**:
   ```bash
   docker stats
   # Look for high CPU or memory
   ```

2. **Check for bottlenecks**:
   - External API latency (check service status pages)
   - Database performance (check query logs)
   - Network issues (test with `ping`, `traceroute`)

3. **Optimize workflow**:
   - Remove unnecessary API calls
   - Add caching where possible
   - Parallel processing for independent steps

4. **Increase resource limits**:
   ```yaml
   services:
     gateway:
       resources:
         limits:
           cpus: '2'
           memory: 2G
   ```

---

### Issue: SSE connections drop frequently

**Symptoms**:
- Logs stop updating
- "Reconnecting..." messages in console
- Status stuck on "RUNNING"

**Causes**:
- Gateway crashed
- Network timeout
- Nginx timeout
- Browser tab backgrounded

**Solutions**:

1. **Check Gateway health**:
   ```bash
   docker compose logs gateway
   # Look for crashes or errors
   ```

2. **Disable Nginx timeout**:
   ```nginx
   location /api/stream {
     proxy_read_timeout 3600s;  # 1 hour
     proxy_buffering off;
   }
   ```

3. **Ensure tab stays active**:
   - Browsers pause SSE when tab is backgrounded
   - Keep browser tab in focus

4. **Implement reconnection logic**:
   ```javascript
   // Reconnect automatically on disconnect
   function subscribeWithReconnect(npcId) {
     let es = new EventSource(`/api/stream?npc=${npcId}`);

     es.onerror = () => {
       es.close();
       // Reconnect after 3 seconds
       setTimeout(() => {
         subscribeWithReconnect(npcId);
       }, 3000);
     };

     return es;
   }
   ```

---

## FAQ

### Q: Can I run multiple agents in parallel?

**A**: Yes! Each agent has its own SSE channel. You can trigger multiple agents and they'll run independently:

```bash
curl /api/run/scheduler
curl /api/run/mailops
curl /api/run/content-gen

# All three run at the same time
```

---

### Q: How do I debug a workflow?

**A**:

1. Use Sim.ai Studio Test button
2. Add logging steps in workflow
3. Check Sim.ai execution logs
4. Check Gateway logs
5. Monitor SSE stream

---

### Q: Can agents call other agents?

**A**: Not directly, but you can:

1. Have workflow A call `/api/events`
2. Have workflow B listen for those events
3. Or use webhooks between workflows

---

### Q: How do I update an agent?

**A**:

1. Edit workflow in Sim.ai Studio
2. Click Deploy
3. No need to restart Gateway (webhook URL stays same)

---

### Q: Can I pass data between workflow steps?

**A**: Yes! Use variables:

```javascript
Step 1: HTTP Request
Result saved as: {{ response }}

Step 2: Code Step
Input: {{ response }}
Code: extract data you need
Output: {{ processed }}

Step 3: Use {{ processed }}
```

---

### Q: What if an API doesn't have a webhook?

**A**: Use HTTP polling:

```
Schedule Trigger: Every 5 minutes
  ↓
HTTP Request: Check API for new data
  ↓
Condition: Is there new data?
  ├─ Yes → Process it
  └─ No → Stop
```

---

### Q: How do I add authentication?

**A**: Use environment variables:

```javascript
// In workflow:
Authorization: "Bearer " + {{ API_TOKEN }}

// Set in .env:
API_TOKEN=your_secret_token_here
```

---

### Q: Can I use the same webhook for multiple agents?

**A**: Not recommended, but technically yes if they have same format. Better approach:

```json
[
  { "agent": "scheduler-v1", "webhookUrl": "..." },
  { "agent": "scheduler-v2", "webhookUrl": "..." }
]
```

---

### Q: What's the maximum payload size?

**A**: Most systems support 1MB. Keep payloads under 100KB for best performance.

---

## Still Having Issues?

1. **Check logs**:
   ```bash
   docker compose logs -f gateway
   docker compose logs -f sim
   ```

2. **Check health**:
   ```bash
   curl http://localhost:8080/health
   ```

3. **Test components individually**:
   - Test Gateway: `curl /api/run/:agent`
   - Test Sim.ai: `curl http://localhost:3000/health`
   - Test SSE: `curl -N /api/stream?npc=X`

4. **Review this guide**: Search for your symptom

5. **Check docs**:
   - [Gateway API](./GATEWAY.md)
   - [Workflows](./WORKFLOWS.md)
   - [System Architecture](../ARCHITECTURE.md)

---

**Last Updated**: 2025-11-08
**FAQ Version**: 1.0.0
