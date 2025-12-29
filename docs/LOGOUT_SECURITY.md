# Logout Endpoint Security

## Overview

Security hardening for `/api/auth/logout` to prevent logout-related attacks, ensure proper session cleanup, and prevent response caching.

## Security Improvements

### 1. ✅ POST-Only Method

**Why:** Prevents CSRF-style logout attacks via GET links

**Attack Scenario:**
```html
<!-- Attacker embeds malicious image in email/forum -->
<img src="https://victim-app.com/api/auth/logout" />
```

If logout accepts GET requests, user gets logged out just by viewing the page.

**Mitigation:**
- Only `POST` method handler exists (no `GET` handler)
- Browser won't send POST request for `<img>` tags
- Logout requires intentional user action (clicking logout button)

**Verification:**
```bash
# GET request should return 405 Method Not Allowed
curl -X GET http://localhost:3005/api/auth/logout
# Response: 405 Method Not Allowed

# POST request works
curl -X POST http://localhost:3005/api/auth/logout
# Response: 200 OK { success: true }
```

### 2. ✅ No-Cache Headers

**Why:** Prevents browsers/proxies from caching logout responses

**Problem Without No-Cache:**
- User logs out → browser caches `{ success: true }` response
- User hits "Back" button → browser shows cached logout response
- User might think they're still logged out, but session could be restored from cache
- Proxies might serve stale logout responses to other users

**Solution:** Aggressive no-cache headers

```typescript
response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
response.headers.set('Pragma', 'no-cache');
response.headers.set('Expires', '0');
```

**Header Breakdown:**

| Header | Value | Purpose |
|--------|-------|---------|
| `Cache-Control` | `no-store` | Don't store response in cache at all |
| `Cache-Control` | `no-cache` | Revalidate with server before using cached copy |
| `Cache-Control` | `must-revalidate` | Force revalidation after expiration |
| `Cache-Control` | `proxy-revalidate` | Force proxies to revalidate |
| `Pragma` | `no-cache` | HTTP/1.0 backward compatibility |
| `Expires` | `0` | Mark as immediately expired |

**Result:** Logout action never served from cache, always hits server

### 3. ✅ Idempotent Design

**Why:** Safe to call multiple times without side effects

**Scenarios:**
- User clicks logout twice (double-click)
- User hits "Back" and clicks logout again
- Session already expired, user clicks logout
- Session was deleted by admin, user clicks logout

**Implementation:**
```typescript
export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    const tokenHash = hashToken(token);
    // Best-effort delete (won't throw if session doesn't exist)
    await prisma.session.delete({ where: { tokenHash } }).catch(() => {});
  }

  // Always delete cookie (even if no token or DB delete failed)
  cookieStore.delete(SESSION_COOKIE);
}
```

**Benefits:**
- No error if session already deleted
- No error if cookie doesn't exist
- No error if database is down (cookie still deleted)
- Always returns `{ success: true }`

### 4. ✅ Robust Session Cleanup

**deleteSession() guarantees:**

1. **Database Cleanup (Best-Effort)**
   - Reads session token from cookie
   - Hashes token (SHA-256)
   - Deletes session from database by `tokenHash`
   - Wrapped in `.catch(() => {})` - won't throw on error

2. **Cookie Cleanup (Always)**
   - Deletes `session_token` cookie
   - Happens regardless of DB state
   - Ensures client-side logout even if DB is down

3. **Security Properties**
   - Deletes hashed token (not plaintext)
   - No race conditions (cookie deleted atomically)
   - Safe even if called concurrently

**Code Flow:**
```
User clicks "Logout"
    ↓
POST /api/auth/logout
    ↓
deleteSession()
    ├─→ Read token from cookie
    ├─→ Hash token (SHA-256)
    ├─→ Delete session from DB (best-effort)
    └─→ Delete cookie (always)
    ↓
Return { success: true } with no-cache headers
    ↓
Client redirects to /login
```

## Attack Scenarios & Mitigations

### Scenario 1: CSRF Logout Attack (GET-based)

**Attack:**
```html
<!-- Attacker's malicious website -->
<img src="https://victim-app.com/api/auth/logout?_=123" />
```

**Before (if GET was allowed):**
- User visits attacker's site
- Browser loads image, sends GET request
- User gets logged out without consent

**After (POST-only):**
- Browser loads image, tries GET request
- Server returns `405 Method Not Allowed`
- User stays logged in ✅

**Result:** ✅ Attack prevented by POST-only method

### Scenario 2: Cached Logout Response

**Attack:**
```bash
# User logs out
POST /api/auth/logout
# Response cached by browser

# User clicks "Back" button
# Browser shows cached { success: true }
# But session might be restored from browser storage
```

**Before (no cache headers):**
- Logout response cached
- User confused about logout state
- Potential security issue if browser restores session

**After (no-cache headers):**
- Logout response never cached
- Browser always fetches fresh response
- Clear logout state ✅

**Result:** ✅ Attack prevented by no-cache headers

### Scenario 3: Double Logout Click

**Attack:**
```javascript
// User double-clicks logout button
fetch('/api/auth/logout', { method: 'POST' });
fetch('/api/auth/logout', { method: 'POST' }); // immediate retry
```

**Before (non-idempotent):**
- First request deletes session
- Second request throws error (session not found)
- Client sees error message

**After (idempotent):**
- First request deletes session
- Second request returns `{ success: true }` (cookie already gone)
- No error, smooth UX ✅

**Result:** ✅ Graceful handling via idempotent design

### Scenario 4: Database Unavailable

**Attack/Failure:**
```bash
# Database connection lost
POST /api/auth/logout
# DB delete fails
```

**Before (not best-effort):**
- DB delete throws error
- Endpoint returns 500 error
- Cookie NOT deleted
- User stuck in logged-in state

**After (best-effort delete):**
- DB delete fails silently (`.catch(() => {})`)
- Cookie still deleted
- Returns `{ success: true }`
- User logged out successfully ✅

**Result:** ✅ Graceful degradation via best-effort design

## CSRF Protection Considerations

### Current State: SameSite=Lax

The logout endpoint currently relies on **SameSite=Lax** cookie protection:

```typescript
// lib/auth.ts - createSession()
(await cookies()).set(SESSION_COOKIE, token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax', // ← Prevents cross-site POST requests
  expires: expiresAt,
  path: '/',
});
```

**SameSite=Lax Protection:**
- ✅ Prevents logout from `<img>` tags (no GET handler anyway)
- ✅ Prevents logout from cross-site AJAX (browser blocks cross-site POST with cookies)
- ⚠️ Does NOT prevent top-level form submissions (rare for logout)

**Example Protected Scenario:**
```html
<!-- Attacker's website (evil.com) -->
<script>
  // Try to logout user from victim-app.com
  fetch('https://victim-app.com/api/auth/logout', {
    method: 'POST',
    credentials: 'include', // Try to include cookies
  });
</script>
```

**Browser Behavior:**
- Browser blocks request because:
  - Cross-site request (evil.com → victim-app.com)
  - SameSite=Lax cookie (not sent for cross-site POST)
- Result: Logout fails, user stays logged in ✅

### Future: CSRF Tokens (If Needed)

**When to Add CSRF Tokens:**
- If you embed the app in iframes on other domains
- If you allow cross-origin requests via CORS
- If you downgrade SameSite to 'none' (for cross-site features)

**Implementation Example:**
```typescript
// Generate CSRF token on login
const csrfToken = crypto.randomBytes(32).toString('hex');
cookies().set('csrf_token', csrfToken, { sameSite: 'strict' });

// Verify CSRF token on logout
export async function POST(req: NextRequest) {
  const headerToken = req.headers.get('X-CSRF-Token');
  const cookieToken = (await cookies()).get('csrf_token')?.value;

  if (headerToken !== cookieToken) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  }

  await deleteSession();
  // ...
}
```

**Current Assessment:** CSRF tokens not needed (SameSite=Lax sufficient)

## Future Enhancements

### 1. Logout All Sessions

Add endpoint to logout from all devices:

```typescript
// app/api/auth/logout-all/route.ts
export async function POST(req: NextRequest) {
  const user = await requireUser(); // Get current user

  // Delete all sessions for this user
  await prisma.session.deleteMany({
    where: { userId: user.id },
  });

  // Clear current session cookie
  (await cookies()).delete(SESSION_COOKIE);

  const response = NextResponse.json({ success: true });
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}
```

**Use Cases:**
- User suspects account compromise
- User clicks "logout from all devices" in settings
- Admin force-logouts user

### 2. Session Revocation (Soft Delete)

Already implemented via `revokedAt` field:

```typescript
// lib/auth.ts
export async function revokeSession(sessionId: string) {
  await prisma.session.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });
}
```

**Use Cases:**
- Admin revokes specific session (not delete, audit trail)
- Suspicious activity detected (revoke but keep record)
- User wants to see "recently logged out devices"

### 3. Logout Audit Log

Track logout events for security monitoring:

```typescript
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(); // May be null
  const clientIp = getClientIp(req);

  // Log logout event (before deleting session)
  if (user) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGOUT',
        ipAddress: clientIp,
        userAgent: req.headers.get('user-agent'),
        timestamp: new Date(),
      },
    });
  }

  await deleteSession();
  // ...
}
```

**Use Cases:**
- Security monitoring (detect unusual logout patterns)
- Compliance requirements (audit trail)
- User activity timeline

## Testing

### Manual Testing

```bash
# Test 1: Successful logout
curl -X POST http://localhost:3005/api/auth/logout \
  -H "Cookie: session_token=abc123" \
  -v
# Expected: 200 OK
# Expected headers: Cache-Control: no-store, Pragma: no-cache, Expires: 0
# Expected: Set-Cookie: session_token=; Expires=Thu, 01 Jan 1970 00:00:00 GMT

# Test 2: GET request blocked
curl -X GET http://localhost:3005/api/auth/logout
# Expected: 405 Method Not Allowed

# Test 3: Double logout (idempotent)
curl -X POST http://localhost:3005/api/auth/logout
curl -X POST http://localhost:3005/api/auth/logout
# Expected: Both return 200 OK { success: true }

# Test 4: Logout without session
curl -X POST http://localhost:3005/api/auth/logout
# Expected: 200 OK { success: true } (no error)

# Test 5: Check no-cache headers
curl -X POST http://localhost:3005/api/auth/logout -v | grep -i cache
# Expected:
# Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
# Pragma: no-cache
# Expires: 0
```

### Browser Testing

```javascript
// Test logout from browser console
await fetch('/api/auth/logout', { method: 'POST' });
// Check: session_token cookie deleted (Application → Cookies)
// Check: Response not cached (Network tab → "from cache" should be absent)
```

## Security Checklist

- [x] POST-only method (no GET handler)
- [x] No-cache headers (no-store, no-cache, must-revalidate, proxy-revalidate, Pragma, Expires)
- [x] Idempotent design (safe to call multiple times)
- [x] Best-effort DB delete (won't throw on error)
- [x] Always deletes cookie (even if DB fails)
- [x] Deletes hashed token from DB (not plaintext)
- [x] Returns consistent response ({ success: true })
- [x] SameSite=Lax cookie protection (prevents cross-site logout)
- [x] No sensitive data in response
- [ ] CSRF token validation (not needed yet, SameSite sufficient)
- [ ] Logout audit log (future enhancement)
- [ ] "Logout all sessions" endpoint (future enhancement)

## Configuration

### Required: SameSite Cookie Setting

Verify `lib/auth.ts` sets SameSite=Lax:

```typescript
(await cookies()).set(SESSION_COOKIE, token, {
  sameSite: 'lax', // ← Required for CSRF protection
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
});
```

### Optional: Additional Security Headers

Applied globally via `middleware.ts`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

See `docs/NO_FLASH_AUTH_TESTS.md` for middleware security headers documentation.

## References

- **OWASP Session Management:** https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- **OWASP CSRF Prevention:** https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- **HTTP Caching (MDN):** https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching
- **SameSite Cookies:** https://web.dev/samesite-cookies-explained/

---

**Last Updated:** 2025-12-29
**Status:** ✅ All Improvements Implemented
