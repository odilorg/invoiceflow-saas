# Authentication Security Hardening

## Overview

This document describes the security improvements made to the authentication system in December 2025.

## Key Improvements

### 1. **Secure Token Generation**
- **Before:** `crypto.randomUUID()` (122 bits of entropy)
- **After:** `crypto.randomBytes(32).toString('hex')` (256 bits of entropy)
- **Why:** Stronger randomness for session tokens

### 2. **Token Hashing in Database**
- **Before:** Plaintext tokens stored in `Session.token`
- **After:** SHA-256 hashed tokens stored in `Session.tokenHash`
- **Why:** If database is compromised, attackers cannot use stolen tokens directly
- **Implementation:**
  ```typescript
  // Cookie contains plaintext token (client needs this)
  const token = crypto.randomBytes(32).toString('hex');

  // Database stores SHA-256 hash
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  ```

### 3. **Session Revocation Support**
- **New Field:** `Session.revokedAt` (optional DateTime)
- **Use Cases:**
  - "Logout from all devices" feature
  - Admin-initiated session termination
  - Security incident response
- **Implementation:**
  ```typescript
  // Soft delete via revocation
  await revokeSession(sessionId);

  // getSession() automatically excludes revoked sessions
  if (session.revokedAt) {
    return null;
  }
  ```

### 4. **Automatic Session Cleanup**
- **Before:** Expired sessions remained in database
- **After:** `getSession()` automatically deletes expired/invalid sessions
- **Benefits:**
  - Reduces database bloat
  - Better security posture
  - No manual cleanup required

### 5. **Minimal User Data Exposure**
- **Before:** `include: { user: true }` (all user fields)
- **After:** Explicit `select` with minimal fields (id, email, name, planStatus)
- **Why:** Reduces sensitive data in memory and logs

### 6. **Proper Error Handling (401 vs 500)**
- **Before:** `throw new Error('Unauthorized')` → Generic 500 error
- **After:** `throw new UnauthorizedError()` → Proper 401 response
- **Implementation:**
  ```typescript
  // lib/auth.ts
  export class UnauthorizedError extends Error {
    constructor(message = 'Unauthorized') {
      super(message);
      this.name = 'UnauthorizedError';
    }
  }

  export async function requireUser() {
    const user = await getCurrentUser();
    if (!user) {
      throw new UnauthorizedError(); // ← Proper 401
    }
    return user;
  }

  // lib/api-error-handler.ts
  export function handleApiError(error: unknown): NextResponse {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  ```

## CSRF Protection

### Current State: Cookie-Based Auth with SameSite=Lax

The application uses **httpOnly cookies with SameSite=Lax**, which provides baseline CSRF protection for:
- ✅ GET requests (always safe)
- ✅ Top-level navigation POST requests (e.g., login forms)
- ⚠️ **NOT PROTECTED:** Cross-site embedded POSTs (e.g., AJAX requests from attacker.com)

### When to Add CSRF Tokens

If the application will later expose **cross-site POST endpoints** (e.g., public webhooks, embedded widgets), implement CSRF token validation:

```typescript
// Example: Double-submit cookie pattern
// 1. Generate CSRF token on login
const csrfToken = crypto.randomBytes(32).toString('hex');
cookies().set('csrf_token', csrfToken, { sameSite: 'strict' });

// 2. Client includes token in request headers
fetch('/api/invoices', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
  },
});

// 3. Server validates token
const headerToken = request.headers.get('X-CSRF-Token');
const cookieToken = cookies().get('csrf_token')?.value;
if (headerToken !== cookieToken) {
  throw new Error('CSRF validation failed');
}
```

**Current risk level:** ⚠️ **MEDIUM** (SameSite=Lax provides partial protection)

**Recommended timeline:** Add CSRF tokens before launching public API or cross-site features.

## Migration Guide for API Routes

All API routes using `requireUser()` should be updated to use the error handler wrapper.

### Pattern 1: Simple Route

**Before:**
```typescript
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    // ... business logic
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**After:**
```typescript
import { withErrorHandler } from '@/lib/api-error-handler';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireUser();
  // ... business logic
  return NextResponse.json({ data });
});
```

### Pattern 2: Multiple Handlers (GET + POST)

**Before:**
```typescript
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    // ...
  } catch (error) { /* ... */ }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    // ...
  } catch (error) { /* ... */ }
}
```

**After:**
```typescript
import { withErrorHandler } from '@/lib/api-error-handler';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await requireUser();
  // ...
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireUser();
  // ...
});
```

### Pattern 3: Validation Errors (Keep Custom Handling)

Some routes need custom error handling (e.g., Zod validation). In these cases, use `handleApiError` directly:

**Before:**
```typescript
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const data = schema.parse(await req.json());
    // ...
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**After:**
```typescript
import { handleApiError } from '@/lib/api-error-handler';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const data = schema.parse(await req.json());
    // ...
  } catch (error) {
    // Custom validation error handling
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    // Fallback to standard error handler (handles UnauthorizedError)
    return handleApiError(error);
  }
}
```

## Database Schema Changes

```sql
-- Session table changes
ALTER TABLE "Session" RENAME COLUMN "token" TO "tokenHash";
ALTER TABLE "Session" ADD COLUMN "revokedAt" TIMESTAMP(3);
CREATE INDEX "Session_tokenHash_idx" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
```

## Security Checklist

- [x] Use `crypto.randomBytes(32)` for session tokens
- [x] Store SHA-256 hash of tokens in database
- [x] Support session revocation via `revokedAt` field
- [x] Auto-delete expired/invalid sessions in `getSession()`
- [x] Return minimal user fields (not all fields)
- [x] Throw `UnauthorizedError` (not generic Error)
- [x] Use `withErrorHandler` wrapper for API routes
- [x] Set httpOnly, secure, sameSite=lax on cookies
- [ ] Add CSRF tokens before exposing cross-site endpoints
- [ ] Implement rate limiting on auth endpoints
- [ ] Add session fingerprinting (User-Agent, IP)
- [ ] Implement "remember me" with refresh tokens

## Performance Considerations

- **Token hashing overhead:** SHA-256 is very fast (~1-2ms), negligible impact
- **Index on tokenHash:** Ensures O(1) lookups (no performance degradation)
- **Auto-cleanup:** Best-effort delete with `.catch(() => {})` to prevent blocking

## Testing

```bash
# Test token generation entropy
node -e "console.log(require('crypto').randomBytes(32).toString('hex').length)" # Should be 64

# Test database schema
psql -d invoice_followup -c "\d Session"

# Test UnauthorizedError handling
curl -X GET http://localhost:3005/api/invoices # Should return 401
```

## References

- **OWASP Session Management:** https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- **OWASP CSRF Prevention:** https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- **Crypto.randomBytes:** https://nodejs.org/api/crypto.html#cryptorandombytessize-callback

---

**Last Updated:** 2025-12-29
**Status:** ✅ Implemented (API routes migration in progress)
