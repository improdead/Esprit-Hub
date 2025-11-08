# 📋 Workflow Building Patterns

**Complete guide to building, structuring, and optimizing Sim.ai workflows for Esprit-Hub**

This guide covers everything you need to know about creating effective workflows in Sim.ai, from basic structures to advanced patterns and best practices.

---

## 📖 Table of Contents

1. [Workflow Basics](#workflow-basics)
2. [Trigger Types](#trigger-types)
3. [Common Step Patterns](#common-step-patterns)
4. [Advanced Patterns](#advanced-patterns)
5. [Error Handling](#error-handling)
6. [Best Practices](#best-practices)
7. [Performance Optimization](#performance-optimization)
8. [Testing Workflows](#testing-workflows)

---

## Workflow Basics

### What is a Workflow?

A workflow is a series of automated steps that accomplish a specific task. Think of it as a recipe or checklist:

```
Trigger → Step 1 → Step 2 → ... → Step N → Result
```

### Anatomy of a Workflow

```
┌─────────────┐
│   Trigger   │  When workflow starts
├─────────────┤
│   Steps     │  What happens
│ (1, 2, 3...)│
├─────────────┤
│  Outputs    │  What gets reported back
└─────────────┘
```

### The Esprit-Hub Pattern

Workflows in Esprit-Hub follow this pattern:

1. **Trigger** - Webhook or schedule
2. **Process** - Do the actual work (API calls, transformations, etc.)
3. **Report** - Post events back to Gateway via `/api/events`

```javascript
// Example workflow structure
Webhook Trigger
  ↓
Step 1: Extract/parse input
  ↓
Step 2: Call external API
  ↓
Step 3: Transform data
  ↓
Step 4: HTTP Request → POST /api/events
  ↓
Done
```

### Creating Your First Workflow

1. **Access Sim.ai Studio**
   - Open `http://localhost:8080/studio/` (with trailing slash!)
   - Create account if first time
   - Click "New Workflow"

2. **Name your workflow**
   - Use clear, descriptive name
   - Example: "Scheduler Agent"

3. **Add a trigger**
   - Click "+" to add a trigger
   - Select "Webhook" → "Catch Hook"
   - Click to copy the webhook URL

4. **Add first step**
   - Click "+" to add a step
   - Select an action (HTTP Request, AI, etc.)
   - Configure the step

5. **Deploy**
   - Click "Deploy"
   - Studio shows deployment status

6. **Copy webhook URL**
   - From trigger, copy the full webhook URL
   - Add to `agents.json` in Gateway

---

## Trigger Types

### 1. Webhook Trigger

**Use when**: External systems or UI should trigger the workflow

```
Manual trigger via UI or API call
        ↓
   Webhook receives request
        ↓
   Payload extracted automatically
        ↓
   Variables available in workflow
```

**How to set up**:
1. In Sim.ai Studio: Add → Trigger → Webhook → Catch Hook
2. Copy webhook URL
3. Add to `agents.json`
4. Trigger via `POST /api/run/:agent`

**Payload handling**:
The webhook automatically extracts variables from the request body. For example:

```javascript
// Request to webhook
POST /api/run/scheduler
{
  "payload": {
    "title": "Team meeting",
    "time": "2025-11-08T14:00:00Z",
    "attendees": ["alice@example.com", "bob@example.com"]
  }
}

// Available in workflow:
- {{ payload.title }}
- {{ payload.time }}
- {{ payload.attendees }}
```

**Example Webhook Workflow**:
```
1. Webhook Trigger "Catch Hook"
2. Log "Title: {{ payload.title }}"
3. HTTP Request → Create calendar event
4. HTTP Request → POST /api/events
```

---

### 2. Schedule Trigger

**Use when**: Workflow should run automatically on a schedule

```
Cron schedule
        ↓
   Trigger fires at time
        ↓
   Workflow executes
        ↓
   No payload (unless manually added)
```

**Cron Format**:
```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 7) (0 or 7 is Sunday)
│ │ │ │ │
│ │ │ │ │
* * * * *

0 9 * * * = Every day at 9:00 AM
0 0 * * 0 = Every Sunday at midnight
*/15 * * * * = Every 15 minutes
```

**Example Schedule Workflow**:
```
1. Schedule "0 9 * * *" (daily at 9 AM)
2. Gmail: List unread messages
3. AI: Summarize top 5 emails
4. Slack: Send message with digest
5. HTTP Request → POST /api/events
```

---

### 3. Interval Trigger (Alternative)

**Use when**: Workflow should run every N seconds/minutes/hours

```
Wait N seconds → Trigger → Execute → Wait → Trigger again
```

**Example**:
```
1. Interval: 5 minutes
2. Check database for new items
3. Process new items
4. HTTP Request → POST /api/events
```

---

## Common Step Patterns

### Pattern 1: HTTP Request

**What it does**: Makes HTTP calls to external APIs

**Example 1: GET Request**
```
HTTP Request
├─ Method: GET
├─ URL: https://api.example.com/data/{{ id }}
├─ Headers:
│  └─ Authorization: Bearer {{ token }}
└─ Result available as: {{ httpResponse }}
```

**Example 2: POST Request with Body**
```
HTTP Request
├─ Method: POST
├─ URL: https://api.example.com/events
├─ Headers:
│  ├─ Authorization: Bearer {{ token }}
│  └─ Content-Type: application/json
├─ Body (JSON):
│  {
│    "npc": "scheduler",
│    "type": "done",
│    "data": {{ workflowResult }}
│  }
└─ Result: Response from API
```

**Using Variables**:
```javascript
// In HTTP request body:
{
  "title": "{{ payload.title }}",
  "timestamp": "{{ $now }}",
  "user": "{{ auth.userId }}"
}
```

**Error Handling**:
```
HTTP Request
├─ If succeeds → Continue to next step
└─ If fails → Go to error handler (see Error Handling section)
```

---

### Pattern 2: AI Step

**What it does**: Uses LLM to process text

**Example: Parse Natural Language**
```
AI Step
├─ Prompt: "Parse this event: {{ payload.text }}"
│  Extract: title, date, attendees
├─ Model: GPT-4 (via LiteLLM)
└─ Result available as: {{ aiResult }}
```

**Example: Summarization**
```
AI Step
├─ Prompt: "Summarize these emails into 3 bullet points"
├─ Context: {{ emails }}
└─ Output: Summary text
```

**Prompt Template**:
```
You are a helpful assistant.

User Input: {{ payload.text }}

Please extract:
1. Title (event name)
2. Date/Time
3. Attendees
4. Location

Format as JSON: { "title": "...", "date": "...", "attendees": [...], "location": "..." }
```

---

### Pattern 3: Data Transform/Code Step

**What it does**: Transforms data with custom code (JavaScript)

**Example: Extract Values**
```javascript
// Input: { "email": "user@example.com" }
// Code:
const [username, domain] = email.split('@');
return {
  username: username,
  domain: domain,
  isCompany: domain.endsWith('.com')
};
```

**Example: Filter Array**
```javascript
// Input: emails array
// Code:
const unread = emails.filter(e => !e.isRead);
const urgent = unread.filter(e => e.priority === 'high');
return {
  unreadCount: unread.length,
  urgentCount: urgent.length,
  urgentEmails: urgent.slice(0, 5)
};
```

---

### Pattern 4: Conditional Logic

**What it does**: Makes decisions based on data

**Example: Branch based on condition**
```
Condition
├─ If payload.type === 'calendar'
│  └─ Step: Create calendar event
└─ Else if payload.type === 'email'
   └─ Step: Send email
```

**Using conditions**:
```
Step: Parse input (AI)
  ↓
Condition: Is priority === 'high'?
  ├─ Yes → Step: Send urgent notification
  └─ No → Step: Add to queue
```

---

### Pattern 5: Loop/Repeat

**What it does**: Repeats steps for each item in a list

**Example: Process multiple emails**
```
For each email in {{ emails }}
  ├─ Step 1: Extract sender
  ├─ Step 2: Send acknowledgment
  └─ Step 3: Log result
End loop
```

---

### Pattern 6: Reporting via HTTP Request

**The Esprit-Hub standard pattern**: Every workflow should end with reporting progress

**Step 1: Report Started** (optional, Gateway does this automatically)
```
HTTP Request
├─ URL: http://skyoffice-gateway:3001/api/events
├─ Method: POST
├─ Body:
│  {
│    "npc": "scheduler",
│    "type": "started",
│    "data": { "ts": "{{ $now }}" }
│  }
```

**Step 2: Report Progress** (optional, for long workflows)
```
HTTP Request
├─ URL: http://skyoffice-gateway:3001/api/events
├─ Method: POST
├─ Body:
│  {
│    "npc": "scheduler",
│    "type": "step",
│    "data": { "message": "Creating calendar event..." }
│  }
```

**Step 3: Report Completion**
```
HTTP Request
├─ URL: http://skyoffice-gateway:3001/api/events
├─ Method: POST
├─ Body:
│  {
│    "npc": "scheduler",
│    "type": "done",
│    "data": {
│      "eventId": "{{ eventId }}",
│      "title": "{{ title }}",
│      "attendees": {{ attendees }}
│    }
│  }
```

**Step 4: Error Reporting** (in error handler)
```
HTTP Request
├─ URL: http://skyoffice-gateway:3001/api/events
├─ Method: POST
├─ Body:
│  {
│    "npc": "scheduler",
│    "type": "error",
│    "data": {
│      "error": "{{ errorMessage }}",
│      "code": "CALENDAR_API_ERROR"
│    }
│  }
```

---

## Advanced Patterns

### Pattern 1: Nested Workflows

**Use when**: You want to reuse a workflow inside another

**Example**:
```
Main Workflow: Scheduler
  ├─ Step 1: Parse input
  ├─ Step 2: Call sub-workflow "Validate Event"
  └─ Step 3: Create calendar event

Sub-workflow: Validate Event
  ├─ Check title not empty
  ├─ Check date in future
  └─ Return validation result
```

---

### Pattern 2: Parallel Steps

**Use when**: Multiple independent tasks can run simultaneously

**Example**:
```
Workflow: Send Notifications
  ├─ Parallel:
  │  ├─ Send Email
  │  ├─ Send Slack Message
  │  └─ Log to Database
  └─ Wait for all to complete
  └─ Report done
```

---

### Pattern 3: Retry Logic

**Use when**: API calls might fail temporarily

**Example**:
```
HTTP Request
├─ URL: https://api.example.com/data
├─ Retry:
│  ├─ Max attempts: 3
│  ├─ Backoff: exponential
│  └─ Delay: 1s, 2s, 4s
└─ If all fail → Go to error handler
```

---

### Pattern 4: Rate Limiting

**Use when**: API has rate limits

**Example**:
```
For each item in {{ items }}
  ├─ Step: Call API
  ├─ Step: Wait 1 second
  └─ Next item
```

---

## Error Handling

### Basic Error Handling

**Pattern**:
```
Try
  ├─ Step: Call external API
  ├─ Step: Process result
  └─ Step: Report success
Catch Error
  └─ Step: Report error to Gateway
```

### Example: Calendar Event Creation with Error Handling

```
1. Webhook Trigger

2. Try:
   ├─ Step: Parse input (AI)
   ├─ Step: Validate date
   ├─ Step: Create Google Calendar event
   │  └─ If rate limited, retry 3 times
   ├─ Step: Get event ID
   └─ Step: HTTP Request
      {
        "npc": "scheduler",
        "type": "done",
        "data": { "eventId": "{{ eventId }}" }
      }

3. Catch Validation Error:
   ├─ Step: HTTP Request
   │  {
   │    "npc": "scheduler",
   │    "type": "error",
   │    "data": { "error": "Invalid event data" }
   │  }

4. Catch API Error:
   ├─ Step: HTTP Request
   │  {
   │    "npc": "scheduler",
   │    "type": "error",
   │    "data": { "error": "Google API error: {{ error }}" }
   │  }
```

### Handling Specific Errors

```javascript
// Use conditional to handle different error types
Condition: errorType === 'rate_limit'
├─ Yes → Retry after delay
└─ No → Check if auth error
  ├─ Yes → Report auth error
  └─ No → Report generic error
```

### Timeout Handling

```
HTTP Request
├─ Timeout: 30 seconds
├─ If timeout → Go to error handler
└─ Error message: "Request timed out after 30s"
```

---

## Best Practices

### 1. Clear Naming

**Good**:
- `scheduler-create-event`
- `mailops-send-digest`
- `content-gen-blog-post`

**Bad**:
- `workflow1`
- `test`
- `wf`

---

### 2. Add Comments

In Sim.ai, you can add comment steps to document workflow logic:

```
Step 1: Comment "Parse calendar event from user input"
Step 2: AI: Parse input...
Step 3: Comment "Create Google Calendar event"
Step 4: HTTP Request to Google Calendar...
```

---

### 3. Use Meaningful Variable Names

```javascript
// Good
const startTime = new Date(payload.time);
const isInFuture = startTime > new Date();

// Bad
const t = new Date(payload.time);
const x = t > new Date();
```

---

### 4. Validate Input Early

```
Webhook Trigger
  ↓
Condition: payload.title not empty?
├─ No → Report error and stop
└─ Yes → Continue

Condition: payload.time is valid ISO string?
├─ No → Report error and stop
└─ Yes → Continue
```

---

### 5. Report Progress Regularly

For long workflows (>10 seconds), report progress:

```
Step 1: Report started
Step 2: Process 1/3 → Report progress
Step 3: Process 2/3 → Report progress
Step 4: Process 3/3 → Report progress
Step 5: Report done
```

---

### 6. Handle Sensitive Data

**Never log or expose**:
- API keys
- User tokens
- Passwords
- Personal information

**Example**:
```javascript
// Bad
console.log('API Key: ' + apiKey);

// Good
// Log only sanitized info
console.log('Calling API for user');
```

---

### 7. Test in Isolation

Before adding to production:
1. Create workflow
2. Test with sample payloads
3. Check logs for errors
4. Verify reporting works
5. Then add to `agents.json`

---

## Performance Optimization

### 1. Reduce External API Calls

**Bad**:
```
For each user in users
  └─ Call API to get user details
```

**Good**:
```
Get all users in one API call
For each user
  └─ Use already-fetched details
```

---

### 2. Add Timeouts

```
HTTP Request
├─ URL: ...
├─ Timeout: 30s (don't wait forever)
└─ Retry: 3 times
```

---

### 3. Batch Operations

**Bad**:
```
For each email
  └─ Send individual notification
```

**Good**:
```
Collect all emails
Send one batch notification with all
```

---

### 4. Cache Results

If calling same API multiple times:
```
Step 1: Get data and cache
Step 2: For each item, use cached data
```

---

### 5. Use Conditional Logic

```
Condition: Should run this step?
├─ No → Skip (saves time)
└─ Yes → Execute
```

---

## Testing Workflows

### 1. Manual Test in Studio

1. Open workflow in Studio
2. Click "Test" button
3. Provide sample input
4. Watch execution
5. Check results

---

### 2. Test via Webhook URL Directly

```bash
curl -X POST http://localhost:8080/api/v1/webhooks/catch/abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Event",
    "time": "2025-11-08T14:00:00Z"
  }'
```

---

### 3. Test via Gateway

```bash
curl -X POST http://localhost:8080/api/run/scheduler \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "title": "Test Event",
      "time": "2025-11-08T14:00:00Z"
    }
  }'
```

---

### 4. Monitor in SkyOffice

1. Open SkyOffice UI
2. Trigger agent
3. Watch status and logs in real-time

---

### 5. Test Error Cases

Make sure your error handling works:

```javascript
// Test 1: Missing required field
{
  "payload": {
    "title": ""  // Missing title should trigger error
  }
}

// Test 2: Invalid data format
{
  "payload": {
    "time": "not-a-date"
  }
}

// Test 3: External API failure
// (Temporarily misconfigure API endpoint)
```

---

## Example: Full Scheduler Workflow

Here's a complete, production-ready scheduler workflow:

```
1. Webhook Trigger "Catch Hook"

2. Comment "Parse natural language calendar event"

3. Condition: payload.text not empty?
   ├─ No → HTTP Request error: "Missing event text"
   └─ Yes → Continue

4. AI Step: Parse event
   Prompt: "Extract event details from: {{ payload.text }}"
   Extract: title, date, duration, attendees

5. Condition: date is in future?
   ├─ No → HTTP Request error: "Date must be in future"
   └─ Yes → Continue

6. Comment "Create Google Calendar event"

7. HTTP Request (with retry 3x)
   Method: POST
   URL: https://www.googleapis.com/calendar/v3/calendars/primary/events
   Headers: Authorization: Bearer {{ googleToken }}
   Body: {
     "summary": "{{ aiResult.title }}",
     "description": "{{ payload.description }}",
     "start": { "dateTime": "{{ aiResult.date }}" },
     "end": { "dateTime": "{{ aiResult.endDate }}" },
     "attendees": {{ aiResult.attendees }}
   }

8. Comment "Send Slack notification"

9. HTTP Request (parallel)
   Method: POST
   URL: https://hooks.slack.com/services/...
   Body: {
     "text": "📅 Event created: {{ aiResult.title }}",
     "blocks": [...]
   }

10. Comment "Report completion"

11. HTTP Request
    URL: http://skyoffice-gateway:3001/api/events
    Method: POST
    Body: {
      "npc": "scheduler",
      "type": "done",
      "data": {
        "eventId": "{{ httpResponse.id }}",
        "title": "{{ aiResult.title }}",
        "attendees": {{ aiResult.attendees.length }}
      }
    }

12. Catch Error: HTTP Request
    URL: http://skyoffice-gateway:3001/api/events
    Method: POST
    Body: {
      "npc": "scheduler",
      "type": "error",
      "data": {
        "error": "{{ error.message }}",
        "code": "{{ error.code }}"
      }
    }
```

---

## Next Steps

- **[Deployment & Testing](./DEPLOYMENT.md)** - Deploy workflows
- **[Agent Templates](./TEMPLATES.md)** - See more examples
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Debug issues

---

**Last Updated**: 2025-11-08
**Workflow Version**: 1.0.0
