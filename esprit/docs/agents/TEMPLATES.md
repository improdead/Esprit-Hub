# 📦 Agent Templates & Examples

**Ready-to-use agent templates and real-world examples for Esprit-Hub**

This guide provides pre-built templates and complete workflow examples you can copy and customize.

---

## 📖 Table of Contents

1. [Template 1: Scheduler Agent](#template-1-scheduler-agent)
2. [Template 2: MailOps Agent](#template-2-mailops-agent)
3. [Template 3: Content Generator](#template-3-content-generator)
4. [Template 4: Slack Digest](#template-4-slack-digest)
5. [Customizing Templates](#customizing-templates)
6. [Creating Your Own](#creating-your-own)

---

## Template 1: Scheduler Agent

### What It Does

Creates calendar events from natural language descriptions:

```
User input: "Team meeting tomorrow at 2pm with Alice and Bob"
    ↓
Agent parses text using AI
    ↓
Agent creates Google Calendar event
    ↓
Agent sends Slack notification
    ↓
Done!
```

### Complete Workflow

**Step 1: Create Webhook Trigger**
- In Sim.ai Studio: Add → Trigger → Webhook → Catch Hook
- Copy the webhook URL
- Add to `agents.json`: `{ "agent": "scheduler", "webhookUrl": "..." }`

**Step 2: Add Steps**

```
┌─ Webhook Trigger
│
├─ AI Step: Parse Event
│  Prompt: "Extract event details from: {{ payload.text }}"
│  Instructions:
│    - Event title/name
│    - Date and time
│    - Duration (default 1 hour)
│    - Attendee emails
│    - Location (if mentioned)
│  Output format:
│    {
│      "title": "...",
│      "startTime": "2025-11-08T14:00:00Z",
│      "endTime": "2025-11-08T15:00:00Z",
│      "attendees": ["alice@example.com", "bob@example.com"],
│      "location": "..."
│    }
│
├─ Condition: Is time in future?
│  ├─ No → Error: "Cannot create event in the past"
│  └─ Yes → Continue
│
├─ HTTP Request: Create Google Calendar Event
│  URL: https://www.googleapis.com/calendar/v3/calendars/primary/events
│  Method: POST
│  Headers:
│    Authorization: Bearer {{ googleToken }}
│    Content-Type: application/json
│  Body:
│    {
│      "summary": "{{ aiResult.title }}",
│      "description": "Created via Esprit Agent",
│      "start": {
│        "dateTime": "{{ aiResult.startTime }}",
│        "timeZone": "America/New_York"
│      },
│      "end": {
│        "dateTime": "{{ aiResult.endTime }}",
│        "timeZone": "America/New_York"
│      },
│      "attendees": {{ aiResult.attendees }},
│      "location": "{{ aiResult.location }}"
│    }
│
├─ HTTP Request: Create Slack Message
│  URL: https://hooks.slack.com/services/YOUR/WEBHOOK
│  Method: POST
│  Headers:
│    Content-Type: application/json
│  Body:
│    {
│      "text": "📅 Calendar event created",
│      "blocks": [
│        {
│          "type": "section",
│          "text": {
│            "type": "mrkdwn",
│            "text": "*{{ aiResult.title }}*\n{{ aiResult.startTime }} - {{ aiResult.endTime }}\n📍 {{ aiResult.location }}"
│          }
│        }
│      ]
│    }
│
├─ HTTP Request: Report Success
│  URL: http://skyoffice-gateway:3001/api/events
│  Method: POST
│  Body:
│    {
│      "npc": "scheduler",
│      "type": "done",
│      "data": {
│        "eventId": "{{ httpResponse.id }}",
│        "title": "{{ aiResult.title }}",
│        "startTime": "{{ aiResult.startTime }}"
│      }
│    }
│
└─ Catch Error:
   HTTP Request: Report Error
   URL: http://skyoffice-gateway:3001/api/events
   Method: POST
   Body:
     {
       "npc": "scheduler",
       "type": "error",
       "data": {
         "error": "{{ error.message }}",
         "code": "{{ error.code }}"
       }
     }
```

### Test Data

```json
{
  "payload": {
    "text": "Team standup tomorrow at 10am with the engineering team in Conference Room A"
  }
}
```

### Configuration

Add to `.env`:
```bash
GOOGLE_CALENDAR_TOKEN=your_token_here
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

---

## Template 2: MailOps Agent

### What It Does

Sends daily email digest summaries:

```
Scheduled daily at 9 AM
    ↓
Agent fetches unread emails
    ↓
Agent summarizes top 5
    ↓
Agent sends Slack digest
    ↓
Done!
```

### Complete Workflow

**Step 1: Create Schedule Trigger**
- In Sim.ai Studio: Add → Trigger → Schedule
- Set to: `0 9 * * *` (daily at 9 AM)

**Step 2: Add Steps**

```
┌─ Schedule Trigger: 0 9 * * * (daily at 9 AM)
│
├─ HTTP Request: Get Unread Emails
│  URL: https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread
│  Method: GET
│  Headers:
│    Authorization: Bearer {{ gmailToken }}
│  Store result as: {{ emails }}
│
├─ Code Step: Extract Top 5 Subjects
│  Input: {{ emails.messages }}
│  Code:
│    const top5 = emails.messages.slice(0, 5);
│    const subjects = await Promise.all(
│      top5.map(async (msg) => {
│        const detail = await fetch(`/gmail/v1/users/me/messages/${msg.id}`);
│        return {
│          id: msg.id,
│          subject: detail.headers.find(h => h.name === 'Subject').value
│        };
│      })
│    );
│    return subjects;
│
├─ AI Step: Summarize Emails
│  Prompt: "Summarize these emails:\n{{ emailsList }}"
│  Instructions:
│    - 2-3 bullet points per email
│    - Highlight action items
│    - Keep it concise
│  Output: Summary text
│
├─ HTTP Request: Send Slack Message
│  URL: https://hooks.slack.com/services/YOUR/WEBHOOK
│  Method: POST
│  Body:
│    {
│      "text": "📧 Daily Email Digest",
│      "blocks": [
│        {
│          "type": "section",
│          "text": {
│            "type": "mrkdwn",
│            "text": "*Daily Email Digest - {{ $now }}*\n\n{{ aiResult }}"
│          }
│        }
│      ]
│    }
│
├─ HTTP Request: Report Success
│  URL: http://skyoffice-gateway:3001/api/events
│  Method: POST
│  Body:
│    {
│      "npc": "mailops",
│      "type": "done",
│      "data": {
│        "emailCount": {{ emailCount }},
│        "summarized": 5
│      }
│    }
│
└─ Catch Error:
   HTTP Request: Report Error
   URL: http://skyoffice-gateway:3001/api/events
   Method: POST
   Body:
     {
       "npc": "mailops",
       "type": "error",
       "data": {
         "error": "{{ error.message }}"
       }
     }
```

### Configuration

Add to `.env`:
```bash
GMAIL_TOKEN=your_token_here
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

---

## Template 3: Content Generator

### What It Does

Generates blog posts or content on demand:

```
User request with topic
    ↓
Agent generates outline with AI
    ↓
Agent generates full post
    ↓
Agent saves to database
    ↓
Done with link!
```

### Complete Workflow

```
┌─ Webhook Trigger
│
├─ Condition: Validate input
│  payload.topic not empty?
│  ├─ No → Error: "Missing topic"
│  └─ Yes → Continue
│
├─ AI Step: Generate Outline
│  Prompt: "Create a blog post outline for: {{ payload.topic }}"
│  Output: Array of sections
│
├─ For Each section in outline:
│  │
│  ├─ AI Step: Generate Content
│  │  Prompt: "Write content for section: {{ section }}"
│  │
│  └─ HTTP Request: Report Progress
│     /api/events with type: "step"
│
├─ Code Step: Combine Content
│  Combine all sections into markdown
│
├─ HTTP Request: Save to Database
│  Method: POST
│  URL: https://api.example.com/content
│  Body:
│    {
│      "title": "{{ payload.topic }}",
│      "content": "{{ fullContent }}",
│      "status": "draft"
│    }
│
├─ HTTP Request: Report Success
│  /api/events with link and post ID
│
└─ Catch Error:
   Report error to /api/events
```

### Test Data

```json
{
  "payload": {
    "topic": "Getting Started with AI Agents",
    "style": "technical",
    "length": "medium"
  }
}
```

---

## Template 4: Slack Digest

### What It Does

Collects metrics and sends daily Slack summary:

```
Scheduled daily
    ↓
Agent fetches metrics
    ↓
Agent creates formatted message
    ↓
Agent sends to Slack
    ↓
Done!
```

### Complete Workflow

```
┌─ Schedule Trigger: 0 17 * * * (5 PM daily)
│
├─ HTTP Request: Get Daily Metrics
│  URL: https://analytics.example.com/api/daily-summary
│  Method: GET
│  Headers:
│    Authorization: Bearer {{ apiToken }}
│
├─ Code Step: Format Metrics
│  Input: {{ metricsResponse }}
│  Code:
│    return {
│      users: metrics.activeUsers,
│      revenue: metrics.dailyRevenue.toFixed(2),
│      engagement: (metrics.engagement * 100).toFixed(1),
│      topFeature: metrics.topFeatures[0].name
│    };
│
├─ HTTP Request: Send Slack Message
│  URL: https://hooks.slack.com/services/YOUR/WEBHOOK
│  Method: POST
│  Body:
│    {
│      "text": "📊 Daily Metrics Summary",
│      "blocks": [
│        {
│          "type": "header",
│          "text": { "type": "plain_text", "text": "Daily Summary" }
│        },
│        {
│          "type": "section",
│          "fields": [
│            { "type": "mrkdwn", "text": "*Active Users*\n{{ metrics.users }}" },
│            { "type": "mrkdwn", "text": "*Revenue*\n${{ metrics.revenue }}" },
│            { "type": "mrkdwn", "text": "*Engagement*\n{{ metrics.engagement }}%" },
│            { "type": "mrkdwn", "text": "*Top Feature*\n{{ metrics.topFeature }}" }
│          ]
│        }
│      ]
│    }
│
├─ HTTP Request: Report Success
│  /api/events
│
└─ Catch Error:
   Report error to /api/events
```

---

## Customizing Templates

### 1. Change the Trigger

**From Webhook to Schedule**:
```
Replace: Webhook Trigger
With: Schedule Trigger "0 9 * * *"
```

**From Schedule to Interval**:
```
Replace: Schedule Trigger
With: Interval Trigger "every 5 minutes"
```

### 2. Add/Remove Steps

**Add error notification**:
```
Catch Error block:
├─ Send Slack message about error
├─ Log to monitoring system
└─ Report to /api/events
```

**Remove external API call**:
```
Replace API call step with:
Code Step that generates data locally
```

### 3. Change Output Format

**Different Slack format**:
```javascript
{
  "text": "New format",
  "blocks": [...]  // Customize blocks
}
```

**Send email instead**:
```
Replace Slack HTTP Request with:
HTTP Request to email service (Mailgun, SendGrid, etc.)
```

---

## Creating Your Own

### Step 1: Define Your Goal

```
What does the agent do?
What triggers it?
What are the inputs?
What are the outputs?
Who/what needs to be notified?
```

### Step 2: Break into Steps

```
1. Get input
2. Validate
3. Process
4. Store/send results
5. Report completion
```

### Step 3: Choose Actions

```
Trigger:    Webhook / Schedule / Manual
Process:    HTTP Request / AI / Code / Conditional
Output:     HTTP Request / Email / Slack / Database
Report:     HTTP Request to /api/events
```

### Step 4: Test Thoroughly

```
1. Create workflow in Studio
2. Test with sample data
3. Verify output
4. Add to agents.json
5. Test via Gateway
6. Monitor in SkyOffice
```

### Step 5: Document

```
Add comments in workflow:
- What each step does
- Why it exists
- Expected inputs/outputs
```

### Example: Invoice Generator

```
┌─ Webhook: "invoice-request"
│
├─ Input:
│  {
│    "customerId": "cust_123",
│    "items": [...],
│    "amount": 1000
│  }
│
├─ Step: Get customer info
│  HTTP GET to customer API
│
├─ Step: Generate PDF
│  Code: Create invoice PDF from data
│
├─ Step: Save to database
│  HTTP POST to storage API
│
├─ Step: Send email
│  HTTP POST to email service
│
├─ Step: Notify accounting
│  HTTP POST to Slack
│
├─ Step: Report success
│  /api/events → "done"
│
└─ Error: Report failure
   /api/events → "error"
```

---

## Template Library

### Quick Reference

| Template | Trigger | Process | Output |
|----------|---------|---------|--------|
| **Scheduler** | Webhook | Parse → Validate → Create | Calendar + Slack |
| **MailOps** | Schedule | Fetch → Summarize | Slack digest |
| **Content Gen** | Webhook | Outline → Generate → Save | Blog + notification |
| **Metrics** | Schedule | Collect → Format | Slack message |

---

## Next Steps

- **[Workflows](./WORKFLOWS.md)** - Learn advanced patterns
- **[Deployment](./DEPLOYMENT.md)** - Deploy to production
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Fix issues

---

**Last Updated**: 2025-11-08
**Template Version**: 1.0.0
