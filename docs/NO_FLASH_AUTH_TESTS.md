# No-Flash Authentication Tests

This document describes the server-side authentication protection system and how to test it.

## Architecture Overview

InvoiceFlow uses **server-side authentication guards** to prevent flashing of protected content to unauthenticated users.

### Protection Layers

```
Request Flow (Logged Out User):
1. Browser → https://invoice.jahongir-travel.uz/dashboard/invoices
2. Nginx → localhost:3005
3. Middleware → Check session_token cookie
   ├─ NO COOKIE → redirect to /login?callbackUrl=/dashboard/invoices (FAST)
   └─ HAS COOKIE → Continue to server layout
4. Server Layout → getCurrentUser() from DB
   ├─ NO USER → redirect to /login (catches expired sessions)
   └─ AUTHENTICATED → Render dashboard
5. Client → Dashboard UI hydrates (interactive elements)
```

### File Structure

```
app/
├── (protected)/                   # Route group (parentheses = not in URL)
│   ├── layout.tsx                # ✅ Server Component - Auth Guard #1
│   └── dashboard/
│       ├── layout.tsx            # ✅ Server Component - Auth Guard #2 + UI setup
│       ├── DashboardShellClient.tsx  # Client Component - Interactive UI only
│       ├── page.tsx              # Dashboard home
│       ├── invoices/
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
│       ├── templates/page.tsx
│       ├── schedules/page.tsx
│       ├── activity/page.tsx
│       ├── billing/page.tsx
│       └── settings/page.tsx
├── login/page.tsx                # ✅ Secure callbackUrl handling
└── middleware.ts                 # ✅ Lightweight cookie check
```

**All 8 dashboard pages are protected** by the parent `(protected)/layout.tsx` server guard.

## Security Features

### 1. Server-Side Auth Guard (`app/(protected)/layout.tsx`)

```typescript
export default async function ProtectedLayout({ children }) {
  const user = await getCurrentUser(); // DB session check

  if (!user) {
    redirect('/login'); // Server-side redirect BEFORE HTML sent
  }

  return <>{children}</>;
}
```

**Benefits:**
- Runs BEFORE any HTML is sent to client
- Works without JavaScript
- Zero possibility of content flash

### 2. Middleware Cookie Check (`middleware.ts`)

```typescript
if (path.startsWith('/dashboard')) {
  const sessionToken = request.cookies.get('session_token')?.value;

  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(loginUrl);
  }
  // Cookie exists - let server layout validate in DB
}
```

**Benefits:**
- Fast fail (< 1ms) if no cookie
- No database query
- Preserves original URL for callback

### 3. Hardened callbackUrl Sanitization (`app/login/page.tsx`)

```typescript
// SECURITY: Prevent open redirect attacks
let redirectTo = '/dashboard'; // safe default

if (callbackUrl && typeof callbackUrl === 'string') {
  const trimmed = callbackUrl.trim();

  // Must start with '/' but NOT '//'
  const isRelativePath = trimmed.startsWith('/') && !trimmed.startsWith('//');

  // Only allow safe URL characters
  const safeCharPattern = /^[a-zA-Z0-9\/_\-?=&%]+$/;
  const hasSafeChars = safeCharPattern.test(trimmed);

  if (isRelativePath && hasSafeChars) {
    redirectTo = trimmed;
  }
}

router.push(redirectTo);
```

**Protection Against:**
- ✅ Protocol-relative URLs: `//evil.com` → Blocked
- ✅ External URLs: `/login?callbackUrl=https://evil.com` → Blocked
- ✅ JavaScript protocols: `javascript:alert(1)` → Blocked
- ✅ Data URIs: `data:text/html,...` → Blocked
- ✅ Malformed URLs → Falls back to `/dashboard`

**Allowed:**
- ✅ `/dashboard`
- ✅ `/dashboard/invoices`
- ✅ `/dashboard/invoices/123`
- ✅ `/dashboard/settings?tab=preferences`

## Manual Test Suite

### Test 1: No Flash - Logged Out Direct Access

**Purpose:** Verify unauthenticated users NEVER see protected content.

```bash
# Test dashboard root
curl -s http://127.0.0.1:3005/dashboard

# Expected output:
/login?callbackUrl=%2Fdashboard

# Test deep route
curl -s http://127.0.0.1:3005/dashboard/invoices/123

# Expected output:
/login?callbackUrl=%2Fdashboard%2Finvoices%2F123
```

✅ **Pass Criteria:** Response contains ONLY redirect path, zero HTML content.

---

### Test 2: No Protected Content Leak

**Purpose:** Verify response doesn't contain any dashboard HTML.

```bash
# Search for protected content keywords
curl -s http://127.0.0.1:3005/dashboard | grep -iE "sidebar|navigation|invoice|template"

# Expected output:
/login?callbackUrl=%2Fdashboard
```

✅ **Pass Criteria:** grep finds ONLY the redirect path, no UI keywords.

---

### Test 3: Middleware Fast Fail

**Purpose:** Verify middleware blocks requests without cookie.

```bash
# Access protected route without session cookie
curl -v http://127.0.0.1:3005/dashboard/settings 2>&1 | grep -E "HTTP|Location"

# Expected:
# < HTTP/1.1 307 Temporary Redirect
# < Location: /login?callbackUrl=%2Fdashboard%2Fsettings
```

✅ **Pass Criteria:** Middleware returns 307 redirect, no page rendering.

---

### Test 4: CallbackUrl Sanitization

**Purpose:** Verify open redirect protection.

```bash
# Test safe callback
curl -s "http://127.0.0.1:3005/login?callbackUrl=/dashboard/invoices"
# Should redirect to /dashboard/invoices after login

# Test protocol-relative URL (should fail)
curl -s "http://127.0.0.1:3005/login?callbackUrl=//evil.com"
# Should fallback to /dashboard

# Test absolute URL (should fail)
curl -s "http://127.0.0.1:3005/login?callbackUrl=https://evil.com"
# Should fallback to /dashboard

# Test JavaScript protocol (should fail)
curl -s "http://127.0.0.1:3005/login?callbackUrl=javascript:alert(1)"
# Should fallback to /dashboard
```

✅ **Pass Criteria:** Only relative paths starting with `/` are accepted.

---

### Test 5: Callback Preserves Query Parameters

**Purpose:** Verify full path is preserved.

```bash
curl -s "http://127.0.0.1:3005/dashboard/settings?tab=preferences&theme=dark"

# Expected output:
/login?callbackUrl=%2Fdashboard%2Fsettings%3Ftab%3Dpreferences%26theme%3Ddark
```

✅ **Pass Criteria:** Query parameters are URL-encoded and preserved.

---

### Test 6: Server-Side Rendering Verification

**Purpose:** Confirm all dashboard routes are server-rendered.

```bash
cd /domains/invoice.jahongir-travel.uz
npm run build 2>&1 | grep "dashboard"

# Expected output (λ = server-rendered):
# λ  /dashboard
# λ  /dashboard/activity
# λ  /dashboard/billing
# λ  /dashboard/invoices
# λ  /dashboard/invoices/[id]
# λ  /dashboard/schedules
# λ  /dashboard/settings
# λ  /dashboard/templates
```

✅ **Pass Criteria:** All dashboard routes marked with `λ` (not `○`).

---

### Test 7: Expired Session Detection

**Purpose:** Verify server layout catches expired cookies.

**Setup:**
1. Login and copy session cookie
2. Wait for session to expire OR manually delete from database
3. Try accessing dashboard with expired cookie

```bash
# Simulate with invalid cookie
curl -b "session_token=invalid-token-12345" http://127.0.0.1:3005/dashboard

# Expected output:
/login
```

✅ **Pass Criteria:** Server layout validates DB session and redirects.

---

### Test 8: Successful Login Flow

**Purpose:** End-to-end login with callback.

**Steps:**
1. Access protected route while logged out
2. Get redirected to login with callbackUrl
3. Login successfully
4. Get redirected back to original route

```bash
# Automated test
curl -c cookies.txt -b cookies.txt -s \
  -X POST http://127.0.0.1:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Should receive session cookie
grep session_token cookies.txt

# Access dashboard with valid session
curl -b cookies.txt -s http://127.0.0.1:3005/dashboard | head -20

# Should see dashboard HTML (not redirect)
```

✅ **Pass Criteria:** Authenticated request returns dashboard HTML.

---

## Browser Testing (Manual)

### Test 9: Visual Flash Test (Most Important)

**Purpose:** Verify NO visual flash of protected content.

**Steps:**
1. Open browser DevTools → Network tab
2. Logout from dashboard
3. In URL bar, type: `https://invoice.jahongir-travel.uz/dashboard/invoices`
4. Press Enter
5. Watch screen carefully

✅ **Pass Criteria:**
- URL immediately changes to `/login?callbackUrl=...`
- **ZERO frames** of dashboard UI visible
- Login page appears instantly

---

### Test 10: Slow 3G Simulation

**Purpose:** Verify no flash even on slow connections.

**Steps:**
1. Open DevTools → Network → Throttling → Slow 3G
2. Logout
3. Navigate to `/dashboard/invoices`
4. Observe

✅ **Pass Criteria:**
- Still no flash (server redirect happens before HTML sent)
- Login page loads slowly but no dashboard content visible

---

### Test 11: Hard Reload Test

**Purpose:** Verify cache doesn't cause flash.

**Steps:**
1. Logout
2. Hard reload (Cmd+Shift+R or Ctrl+Shift+R) on `/dashboard`
3. Observe

✅ **Pass Criteria:** No cached dashboard content visible.

---

### Test 12: Callback After Login

**Purpose:** Verify user returns to original page.

**Steps:**
1. Logout
2. Navigate to `/dashboard/settings?tab=preferences`
3. Login
4. Check URL

✅ **Pass Criteria:** URL is `/dashboard/settings?tab=preferences` after login.

---

## Automated Test Suite (Future)

### Jest/Playwright Tests

```typescript
// Example test structure (not implemented yet)
describe('Auth Protection', () => {
  test('logged-out user sees no dashboard content', async () => {
    const response = await fetch('http://localhost:3005/dashboard');
    const text = await response.text();

    expect(text).not.toContain('sidebar');
    expect(text).not.toContain('navigation');
    expect(text).toMatch(/\/login\?callbackUrl=/);
  });

  test('callbackUrl sanitization blocks external URLs', async () => {
    const malicious = [
      '//evil.com',
      'https://evil.com',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>'
    ];

    for (const url of malicious) {
      const result = sanitizeCallbackUrl(url);
      expect(result).toBe('/dashboard'); // fallback
    }
  });
});
```

---

## Debugging Failed Tests

### If Test 1 Fails (Content Visible)

**Check:**
1. Is `app/(protected)/layout.tsx` a Server Component? (no `'use client'`)
2. Does it call `getCurrentUser()` before rendering?
3. Is `redirect('/login')` called when no user?

**Fix:**
```typescript
// app/(protected)/layout.tsx
export default async function ProtectedLayout({ children }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login'); // ← Must be here
  }

  return <>{children}</>;
}
```

---

### If Test 4 Fails (Open Redirect)

**Check:**
1. Is regex validation in `app/login/page.tsx` correct?
2. Are all edge cases handled?

**Test manually:**
```typescript
const safeCharPattern = /^[a-zA-Z0-9\/_\-?=&%]+$/;

console.log(safeCharPattern.test('/dashboard')); // true
console.log(safeCharPattern.test('//evil.com')); // false (has //)
console.log(safeCharPattern.test('http://evil.com')); // false (has :)
```

---

### If Flash Still Occurs

**Possible causes:**
1. Client component mounting before server redirect
2. Cached HTML from previous session
3. Race condition in child pages

**Debugging steps:**
```bash
# 1. Check build output - all dashboard routes should be λ
npm run build | grep dashboard

# 2. Verify no client-side auth checks remain
grep -r "fetch.*auth/me" app/(protected)/dashboard/layout.tsx
# Should find NOTHING (auth is server-side only)

# 3. Check middleware is running
tail -f /root/.pm2/logs/invoice-followup-out.log
# Try accessing dashboard, watch for logs
```

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Flash duration | 0ms | Visual inspection (Test 9) |
| Redirect speed | < 10ms | `curl` timing |
| Protected content leak | 0 bytes | grep for keywords (Test 2) |
| Open redirect vulnerability | 0 | Sanitization tests (Test 4) |
| Server-rendered routes | 100% | Build output (Test 6) |

---

## Maintenance Checklist

When adding new protected routes:

- [ ] Place under `app/(protected)/` route group
- [ ] Verify server layout auth applies
- [ ] Test with `curl` (no HTML leakage)
- [ ] Test visual flash (logged out browser)
- [ ] Update this documentation

When modifying auth logic:

- [ ] Run full test suite (Tests 1-12)
- [ ] Test on staging before production
- [ ] Verify no performance regression
- [ ] Document changes in this file

---

## References

- **Route Groups:** https://nextjs.org/docs/app/building-your-application/routing/route-groups
- **Server Components:** https://nextjs.org/docs/app/building-your-application/rendering/server-components
- **Middleware:** https://nextjs.org/docs/app/building-your-application/routing/middleware
- **redirect():** https://nextjs.org/docs/app/api-reference/functions/redirect

---

**Last Updated:** 2025-12-29
**Version:** 1.0
**Status:** ✅ All Tests Passing
