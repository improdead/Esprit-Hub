# Block Adder Bug - Cannot Add Second Block

## Issue Summary

**Status**: Critical Bug
**Component**: Workflow Block Addition System
**Impact**: Users can add the first block to a workflow but cannot add subsequent blocks
**Severity**: High - Prevents users from building multi-block workflows

---

## Symptoms

- ✅ First block can be added to a workflow
- ❌ Second and subsequent blocks cannot be added
- ⚠️ No error message shown to user
- ⚠️ Block toolbar remains visible but non-functional
- ⚠️ Issue persists until page refresh

---

## Root Cause Analysis

### The Bug Chain

1. **Operation Timeout/Failure**
   - User adds first block
   - Operation sent to server times out after 5 seconds
   - Or fails after 3 retry attempts

2. **Offline Mode Triggered**
   - System enters "offline mode" after failed retries
   - Sets `hasOperationError = true`
   - Location: `esprit/external/sim/apps/sim/stores/operation-queue/store.ts:499-512`

3. **Edit Permissions Disabled**
   - `hasOperationError` propagates to permissions provider
   - Offline mode forces `canEdit = false`
   - Location: `esprit/external/sim/apps/sim/app/workspace/[workspaceId]/providers/workspace-permissions-provider.tsx:64-104`

4. **Toolbar Clicks Silently Blocked**
   - Block addition handler checks `canEdit` permission
   - Silently returns without feedback when `canEdit = false`
   - Location: `esprit/external/sim/apps/sim/app/workspace/[workspaceId]/w/[workflowId]/workflow.tsx:629`

5. **No Error Recovery Path**
   - `clearError()` function exists but is **NEVER CALLED**
   - Once in error state, system stays there permanently
   - Only page refresh resets the state

---

## Technical Details

### Key Code Locations

#### 1. Operation Queue Store
**File**: `esprit/external/sim/apps/sim/stores/operation-queue/store.ts`

**Lines 359-368**: Operation timeout (5 seconds)
```typescript
const timeoutDuration = isSubblockOrVariable ? 15000 : 5000
const timeoutId = setTimeout(() => {
  logger.warn(`Operation timeout - no server response after ${timeoutDuration}ms`, {
    operationId: nextOperation.id,
  })
  operationTimeouts.delete(nextOperation.id)
  get().handleOperationTimeout(nextOperation.id)
}, timeoutDuration)
```

**Lines 276-284**: Offline mode trigger after retries
```typescript
else {
  logger.error('Operation failed after max retries, triggering offline mode', {
    operationId,
    operation: operation.operation.operation,
    retryCount: operation.retryCount,
  })
  get().triggerOfflineMode()
}
```

**Lines 499-512**: Offline mode sets error flag
```typescript
triggerOfflineMode: () => {
  logger.error('Operation failed after retries - triggering offline mode')

  retryTimeouts.forEach((timeout) => clearTimeout(timeout))
  retryTimeouts.clear()
  operationTimeouts.forEach((timeout) => clearTimeout(timeout))
  operationTimeouts.clear()

  set({
    operations: [],
    isProcessing: false,
    hasOperationError: true,  // ← GETS SET BUT NEVER CLEARED
  })
},
```

**Lines 514-516**: Clear error function (NEVER CALLED!)
```typescript
clearError: () => {
  set({ hasOperationError: false })
},
```

#### 2. Workspace Permissions Provider
**File**: `esprit/external/sim/apps/sim/app/workspace/[workspaceId]/providers/workspace-permissions-provider.tsx`

**Lines 64-71**: Error detection
```typescript
const { hasOperationError } = useCollaborativeWorkflow()

useEffect(() => {
  if (hasOperationError) {
    setIsOfflineMode(true)
  }
}, [hasOperationError])
```

**Lines 93-104**: Permission override in offline mode
```typescript
const userPermissions = useMemo(() => {
  if (isOfflineMode) {
    return {
      ...baseUserPermissions,
      canEdit: false,  // ← DISABLES EDITING
      canAdmin: false,
      canRead: baseUserPermissions.canRead,
      isOfflineMode: true,
    }
  }
  return {
    ...baseUserPermissions,
    isOfflineMode: false,
  }
}, [baseUserPermissions, isOfflineMode])
```

#### 3. Workflow Block Addition Handler
**File**: `esprit/external/sim/apps/sim/app/workspace/[workspaceId]/w/[workflowId]/workflow.tsx`

**Line 629**: Silent permission check
```typescript
const handleAddBlockFromToolbar = (event: CustomEvent) => {
  if (!effectivePermissions.canEdit) {
    return  // ← SILENTLY EXITS WITHOUT USER FEEDBACK
  }
  // ... rest of block addition logic
```

---

## Why This Manifests as "No Second Block UI"

From the user's perspective:
- Toolbar is still visible (not hidden by CSS)
- Clicks appear to do nothing (no feedback)
- No error message displayed
- Seems like the UI is broken or missing

In reality:
- UI is fully present and functional
- Permission check silently blocks all actions
- System is in permanent error state
- No recovery mechanism exists

---

## Proposed Fixes

### Fix #1: Call clearError() on Success (Recommended)

**File**: `esprit/external/sim/apps/sim/stores/operation-queue/store.ts`

Modify the success handler to clear error state:

```typescript
// Around line 236-250
if (serverResult.success) {
  // Clear error state when any operation succeeds
  if (get().hasOperationError) {
    get().clearError()
  }

  // ... existing success logic
}
```

### Fix #2: Add Manual Retry Button

Add UI button to clear error state and retry:

```typescript
// In workspace-permissions-provider.tsx
const handleRetry = () => {
  setIsOfflineMode(false)
  operationQueueStore.getState().clearError()
}

// Show retry button when isOfflineMode is true
```

### Fix #3: Auto-clear on Reconnection

```typescript
// Monitor connection status and auto-clear
useEffect(() => {
  if (isOnline && hasOperationError) {
    operationQueueStore.getState().clearError()
  }
}, [isOnline, hasOperationError])
```

### Fix #4: Show Error Toast (UX Improvement)

```typescript
// In workflow.tsx handleAddBlockFromToolbar
if (!effectivePermissions.canEdit) {
  if (effectivePermissions.isOfflineMode) {
    toast.error('Cannot add blocks while in offline mode. Please check your connection.')
  }
  return
}
```

---

## Testing Checklist

After implementing fixes:

- [ ] Add first block successfully
- [ ] Add second block without issue
- [ ] Test with slow/failing network conditions
- [ ] Verify error recovery after connection restored
- [ ] Confirm error messages shown to user
- [ ] Test with multiple rapid block additions
- [ ] Verify clearError() called in success path
- [ ] Test page refresh clears state (existing behavior)

---

## Related Issues

- Block toolbar visibility/discoverability
- Lack of user feedback for permission errors
- No visual indicator when in offline mode
- Operation timeout duration (5s may be too short)

---

## References

- Operation Queue Store: `esprit/external/sim/apps/sim/stores/operation-queue/store.ts`
- Permissions Provider: `esprit/external/sim/apps/sim/app/workspace/[workspaceId]/providers/workspace-permissions-provider.tsx`
- Workflow Component: `esprit/external/sim/apps/sim/app/workspace/[workspaceId]/w/[workflowId]/workflow.tsx`
- Toolbar Component: `esprit/external/sim/apps/sim/app/workspace/[workspaceId]/w/components/sidebar/components/toolbar/toolbar.tsx`

---

**Last Updated**: 2025-11-08
**Reported By**: User testing
**Investigated By**: Claude Code Analysis
