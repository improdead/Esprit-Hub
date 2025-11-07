# SkyOffice UI Enhancement Plan
**Improving the 2D Agent Monitoring Interface**

**Last Updated**: 2025-11-07
**Timeline**: 4-6 Weeks

---

## 🎯 Goal

Enhance the existing 2D card-based SkyOffice UI with better visualizations, animations, and user interactions while maintaining simplicity and performance.

**Current State:**
- ✅ Basic card layout with NPC panels
- ✅ Status pills (idle, running, done, error)
- ✅ Real-time log streaming via SSE
- ✅ Run buttons to trigger agents

**Target State:**
- Better visual feedback with CSS animations
- Expandable/collapsible agent cards
- Progress indicators and time estimates
- Task history and analytics
- Improved mobile responsiveness
- Dark mode support

---

## 📋 Enhancement Phases

### Phase 1: Visual Polish (Week 1)

#### 1.1 Enhanced Status Pills

**Current**: Basic colored rectangles

**Enhanced**: Animated, glowing pills with icons

```tsx
// components/StatusPill.tsx
export function StatusPill({ status }: { status: string }) {
  const config = {
    idle: { color: '#9ca3af', icon: '⚪', label: 'Idle' },
    running: { color: '#3b82f6', icon: '🔄', label: 'Running', pulse: true },
    done: { color: '#10b981', icon: '✅', label: 'Done', checkmark: true },
    error: { color: '#ef4444', icon: '❌', label: 'Error', shake: true },
    awaiting: { color: '#f59e0b', icon: '⏳', label: 'Awaiting', pulse: true }
  };

  const { color, icon, label, pulse, shake, checkmark } = config[status] || config.idle;

  return (
    <span
      className={`status-pill ${pulse ? 'pulse' : ''} ${shake ? 'shake' : ''} ${checkmark ? 'checkmark' : ''}`}
      style={{ backgroundColor: color }}
    >
      <span className="icon">{icon}</span>
      <span className="label">{label}</span>
    </span>
  );
}
```

**CSS Animations:**
```css
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.status-pill.pulse {
  animation: pulse 2s infinite;
}

.status-pill.shake {
  animation: shake 0.5s;
}

.status-pill.checkmark {
  animation: checkmark 0.5s ease-out;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

@keyframes checkmark {
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}
```

#### 1.2 Progress Bar Component

```tsx
// components/ProgressBar.tsx
interface ProgressBarProps {
  progress: number; // 0-100
  status: 'idle' | 'running' | 'done' | 'error';
  estimatedCompletion?: Date;
}

export function ProgressBar({ progress, status, estimatedCompletion }: ProgressBarProps) {
  const getColor = () => {
    if (status === 'error') return '#ef4444';
    if (status === 'done') return '#10b981';
    return '#3b82f6';
  };

  const timeRemaining = estimatedCompletion
    ? Math.max(0, estimatedCompletion.getTime() - Date.now())
    : null;

  return (
    <div className="progress-container">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${progress}%`,
            backgroundColor: getColor(),
            transition: 'width 0.3s ease'
          }}
        />
      </div>
      <div className="progress-info">
        <span>{progress}%</span>
        {timeRemaining && (
          <span className="time-remaining">
            ~{Math.ceil(timeRemaining / 1000)}s remaining
          </span>
        )}
      </div>
    </div>
  );
}
```

#### 1.3 Animated Log Entries

```tsx
// components/LogEntry.tsx
export function LogEntry({ log, index }: { log: Log; index: number }) {
  return (
    <div
      className="log-entry"
      style={{
        animation: `slideIn 0.3s ease ${index * 0.05}s both`
      }}
    >
      <span className="timestamp">
        {new Date(log.ts).toLocaleTimeString()}
      </span>
      <span className="separator">•</span>
      <span className={`type type-${log.type}`}>{log.type}</span>
      {log.data && (
        <pre className="data">{short(JSON.stringify(log.data))}</pre>
      )}
    </div>
  );
}
```

```css
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.log-entry {
  padding: 4px 0;
  font-size: 13px;
  font-family: 'Courier New', monospace;
  border-left: 2px solid transparent;
  padding-left: 8px;
  transition: all 0.2s;
}

.log-entry:hover {
  background: rgba(0, 0, 0, 0.02);
  border-left-color: #3b82f6;
}

.type-error {
  color: #ef4444;
  font-weight: 600;
}

.type-done {
  color: #10b981;
  font-weight: 600;
}
```

**Deliverables:**
- [ ] Enhanced status pills with icons and animations
- [ ] Progress bar component with time estimates
- [ ] Animated log entries
- [ ] Updated CSS with smooth transitions

---

### Phase 2: Expandable Cards (Week 2)

#### 2.1 Accordion-Style Cards

```tsx
// components/NPCPanel.tsx (enhanced)
export function NPCPanel({ npcId, label }: { npcId: string; label: string }) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [logs, setLogs] = useState<Log[]>([]);
  const [progress, setProgress] = useState(0);

  // ... SSE logic ...

  return (
    <div className={`npc-card ${expanded ? 'expanded' : 'collapsed'}`}>
      {/* Header - always visible */}
      <div className="card-header" onClick={() => setExpanded(!expanded)}>
        <div className="header-left">
          <div className="avatar">{label.charAt(0)}</div>
          <div className="info">
            <div className="name">{label}</div>
            <div className="npc-id">{npcId}</div>
          </div>
        </div>

        <div className="header-right">
          <StatusPill status={status} />
          <button className="btn-run" onClick={(e) => {
            e.stopPropagation();
            run();
          }}>
            Run
          </button>
          <span className="expand-icon">
            {expanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {/* Progress - visible when running */}
      {(status === 'running' || status === 'awaiting') && (
        <ProgressBar progress={progress} status={status} />
      )}

      {/* Details - visible when expanded */}
      {expanded && (
        <div className="card-body">
          <div className="stats">
            <div className="stat">
              <span className="label">Total Runs:</span>
              <span className="value">{totalRuns}</span>
            </div>
            <div className="stat">
              <span className="label">Success Rate:</span>
              <span className="value">{successRate}%</span>
            </div>
            <div className="stat">
              <span className="label">Avg Duration:</span>
              <span className="value">{avgDuration}s</span>
            </div>
          </div>

          <div className="logs-section">
            <div className="logs-header">
              <h4>Execution Logs</h4>
              <button onClick={clearLogs}>Clear</button>
            </div>
            <div className="logs">
              {logs.map((log, i) => (
                <LogEntry key={i} log={log} index={i} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 2.2 Grid Layout with Responsive Design

```css
/* App.css */
.npc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  padding: 20px;
}

.npc-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
}

.npc-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.npc-card.expanded {
  grid-column: span 2;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .npc-grid {
    grid-template-columns: 1fr;
  }

  .npc-card.expanded {
    grid-column: span 1;
  }
}
```

**Deliverables:**
- [ ] Expandable/collapsible cards
- [ ] Smooth accordion animations
- [ ] Responsive grid layout
- [ ] Mobile-friendly design

---

### Phase 3: Advanced Features (Week 3-4)

#### 3.1 Task History & Analytics

```tsx
// hooks/useTaskHistory.ts
export function useTaskHistory(npcId: string) {
  const [history, setHistory] = useState<TaskExecution[]>([]);

  useEffect(() => {
    fetch(`/api/npcs/${npcId}/history`)
      .then(res => res.json())
      .then(setHistory);
  }, [npcId]);

  return {
    history,
    totalRuns: history.length,
    successRate: (history.filter(h => h.status === 'done').length / history.length) * 100,
    avgDuration: history.reduce((sum, h) => sum + h.duration, 0) / history.length,
    lastRun: history[0]
  };
}
```

```tsx
// components/TaskHistory.tsx
export function TaskHistory({ npcId }: { npcId: string }) {
  const { history } = useTaskHistory(npcId);

  return (
    <div className="task-history">
      <h4>Recent Executions</h4>
      <div className="history-list">
        {history.map(task => (
          <div key={task.id} className="history-item">
            <div className="task-info">
              <span className="task-status">
                {task.status === 'done' ? '✅' : '❌'}
              </span>
              <span className="task-time">
                {new Date(task.startedAt).toLocaleString()}
              </span>
              <span className="task-duration">
                {task.duration}s
              </span>
            </div>
            {task.error && (
              <div className="task-error">{task.error}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 3.2 Quick Actions Menu

```tsx
// components/QuickActions.tsx
export function QuickActions({ npcId }: { npcId: string }) {
  return (
    <div className="quick-actions">
      <button onClick={() => runAgent(npcId)}>
        ▶️ Run Now
      </button>
      <button onClick={() => scheduleAgent(npcId)}>
        ⏰ Schedule
      </button>
      <button onClick={() => editAgent(npcId)}>
        ✏️ Edit in Sim.ai
      </button>
      <button onClick={() => viewLogs(npcId)}>
        📋 View Full Logs
      </button>
      <button onClick={() => duplicateAgent(npcId)}>
        📋 Duplicate
      </button>
    </div>
  );
}
```

#### 3.3 Dark Mode

```tsx
// hooks/useDarkMode.ts
export function useDarkMode() {
  const [isDark, setIsDark] = useState(() =>
    localStorage.getItem('darkMode') === 'true'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('darkMode', String(isDark));
  }, [isDark]);

  return [isDark, setIsDark] as const;
}
```

```css
/* Dark mode styles */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f3f4f6;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --border: #e5e7eb;
}

.dark {
  --bg-primary: #1f2937;
  --bg-secondary: #111827;
  --text-primary: #f9fafb;
  --text-secondary: #9ca3af;
  --border: #374151;
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.npc-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
}
```

**Deliverables:**
- [ ] Task history component
- [ ] Analytics display (success rate, avg duration)
- [ ] Quick actions menu
- [ ] Dark mode toggle
- [ ] Persistent theme preference

---

### Phase 4: Real-time Enhancements (Week 5)

#### 4.1 Live Activity Feed

```tsx
// components/ActivityFeed.tsx
export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const es = new EventSource('/api/stream?all=true');

    es.addEventListener('activity', (e) => {
      const activity = JSON.parse(e.data);
      setActivities(prev => [activity, ...prev].slice(0, 50));
    });

    return () => es.close();
  }, []);

  return (
    <div className="activity-feed">
      <h3>Live Activity</h3>
      <div className="feed-list">
        {activities.map((activity, i) => (
          <div key={i} className="activity-item">
            <span className="activity-icon">{activity.icon}</span>
            <span className="activity-npc">{activity.npc}</span>
            <span className="activity-message">{activity.message}</span>
            <span className="activity-time">
              {formatTimeAgo(activity.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 4.2 Toast Notifications

```tsx
// components/Toaster.tsx
export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Toast) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => removeToast(id), toast.duration || 3000);
  };

  return (
    <div className="toaster">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
```

```css
.toaster {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.toast {
  padding: 12px 20px;
  margin-top: 10px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideInRight 0.3s ease;
}

.toast-success {
  background: #10b981;
  color: white;
}

.toast-error {
  background: #ef4444;
  color: white;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

**Deliverables:**
- [ ] Global activity feed
- [ ] Toast notifications for events
- [ ] Real-time badge counts
- [ ] Sound notifications (optional)

---

### Phase 5: Polish & Optimization (Week 6)

#### 5.1 Performance Optimizations

- **Virtualized Log List**: Only render visible logs
- **Memoization**: Use `React.memo` for expensive components
- **Debounced SSE**: Batch rapid events
- **Lazy Loading**: Load history on demand

```tsx
// Virtualized logs example
import { FixedSizeList } from 'react-window';

function LogList({ logs }: { logs: Log[] }) {
  return (
    <FixedSizeList
      height={400}
      itemCount={logs.length}
      itemSize={35}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <LogEntry log={logs[index]} index={index} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

#### 5.2 Accessibility

- **Keyboard Navigation**: Tab through cards, Enter to expand
- **ARIA Labels**: Proper labeling for screen readers
- **Focus Indicators**: Clear focus states
- **Reduced Motion**: Respect `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

.npc-card:focus-within {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

#### 5.3 Error Boundaries

```tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-state">
          <h3>Something went wrong</h3>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Deliverables:**
- [ ] Virtualized lists for performance
- [ ] Full keyboard navigation
- [ ] ARIA labels and roles
- [ ] Error boundaries
- [ ] Reduced motion support

---

## 🎨 Design System

### Color Palette

```css
:root {
  /* Primary */
  --blue-500: #3b82f6;
  --blue-600: #2563eb;

  /* Status colors */
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;

  /* Neutrals */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
}
```

### Typography

```css
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'Courier New', monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
}
```

### Spacing

```css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
}
```

---

## 📊 Success Metrics

### Performance
- [ ] First Contentful Paint < 1s
- [ ] Time to Interactive < 2s
- [ ] Lighthouse score > 90

### User Experience
- [ ] Animations smooth (60 FPS)
- [ ] Mobile responsive
- [ ] Accessible (WCAG 2.1 AA)

### Features
- [ ] All phases complete
- [ ] Dark mode working
- [ ] Task history saved
- [ ] No critical bugs

---

## 🚀 Quick Start for Each Phase

### Phase 1: Start with status pills
```bash
cd esprit/apps/skyoffice
# Create components/StatusPill.tsx
# Update NPCPanel.tsx to use StatusPill
# Add CSS animations
npm run dev
```

### Phase 2: Add expandable cards
```bash
# Update NPCPanel.tsx with expand state
# Add card-header and card-body
# Update CSS for grid layout
npm run dev
```

### Phase 3: Add history tracking
```bash
# Create hooks/useTaskHistory.ts
# Add /api/npcs/:id/history endpoint in gateway
# Create TaskHistory component
npm run dev
```

---

**This plan enhances the existing 2D UI with smooth animations, better UX, and advanced features while keeping development simple and incremental.**
