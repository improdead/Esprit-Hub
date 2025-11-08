# Button Redirect Logic Changes

## Overview
Updated the "Build/Agent Builder" button in the game client to intelligently redirect based on user's login status:
- **If logged in to Sim.ai** → Redirect to Dashboard (`/studio/workspace`)
- **If NOT logged in** → Redirect to Login (`/studio/login`)

## Changes Made

### File Modified: `client/src/components/HelperButtonGroup.tsx`

#### 1. Added Session Check State
```typescript
const [isUserLoggedInStudio, setIsUserLoggedInStudio] = useState(false)
```

#### 2. Added useEffect Hook to Check Login Status
```typescript
React.useEffect(() => {
  const checkSimStudioLogin = async () => {
    try {
      const response = await fetch(`${studioUrl.replace(/\/$/, '')}/api/auth/get-session`, {
        credentials: 'include',
        method: 'GET',
      })
      const data = await response.json()
      setIsUserLoggedInStudio(!!data && !!data.user)
    } catch (error) {
      setIsUserLoggedInStudio(false)
    }
  }

  checkSimStudioLogin()
}, [studioUrl])
```

#### 3. Added Click Handler
```typescript
const handleStudioButtonClick = () => {
  const targetUrl = isUserLoggedInStudio 
    ? `${studioUrl}workspace`
    : `${studioUrl}login`
  window.open(targetUrl, '_blank', 'noopener,noreferrer')
}
```

#### 4. Updated Button
**Before:**
```tsx
<Tooltip title="Open Agent Builder">
  <StyledFab
    size="small"
    href={studioUrl}
    target="_blank"
    rel="noopener noreferrer"
  >
    <BuildIcon />
  </StyledFab>
</Tooltip>
```

**After:**
```tsx
<Tooltip title={isUserLoggedInStudio ? "Go to Dashboard" : "Open Agent Builder"}>
  <StyledFab
    size="small"
    onClick={handleStudioButtonClick}
  >
    <BuildIcon />
  </StyledFab>
</Tooltip>
```

## How It Works

1. **On Component Mount:** The `useEffect` hook runs and checks if the user has an active session by calling `/api/auth/get-session`
2. **Session Check:** 
   - If the API returns a user object → `isUserLoggedInStudio = true`
   - If the API returns null or errors → `isUserLoggedInStudio = false`
3. **On Button Click:** 
   - If logged in → Opens `/studio/workspace` (Dashboard)
   - If not logged in → Opens `/studio/login` (Login Page)
4. **Tooltip Updates:** The button tooltip dynamically changes based on login status

## Benefits

✅ Better user experience - Users go to the right place based on their auth status
✅ Prevents unnecessary redirects
✅ Clear button labels that reflect the action
✅ Uses secure credentials-based auth checks

## Testing

1. **Test without login:**
   - Click the build icon
   - Should redirect to `/studio/login`

2. **Test with login:**
   - Log into Sim.ai at `http://localhost:8080/studio/`
   - Return to the game client
   - Click the build icon
   - Should redirect to `/studio/workspace` (Dashboard)

## Dependencies

This feature relies on:
- The Sim.ai auth session endpoint: `/api/auth/get-session`
- Proper CORS and cookie handling
- The auth cookies set by Sim.ai being accessible to the client


