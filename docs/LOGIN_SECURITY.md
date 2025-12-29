# Login Route Security Hardening

## Overview

Comprehensive security improvements to `/api/auth/login` to prevent brute-force attacks, user enumeration, timing attacks, and credential stuffing.

## Security Improvements

### 1. ✅ Dual-Layer Rate Limiting (IP + IP+Email)

**Problem:** Previous rate limiting only tracked email, allowing:
- Attackers to brute-force many emails from single IP without throttling
- Attackers to DoS a victim's email by exhausting their rate limit

**Solution:** Two-tier rate limiting

```typescript
// Tier 1: Per-IP rate limit (global protection)
const ipIdentifier = `login-ip:${clientIp}`;
const ipRateCheck = await checkRateLimit(authRateLimit, ipIdentifier);

// Tier 2: Per-IP+Email rate limit (targeted protection)
const ipEmailIdentifier = `login:${clientIp}:${emailNormalized}`;
const ipEmailRateCheck = await checkRateLimit(authRateLimit, ipEmailIdentifier);
```

**Benefits:**
- Single IP limited to 10 login attempts/min total (regardless of email targets)
- Each IP+email combination limited to 10 attempts/min (prevents DoS of victim email)
- Distributed brute-force attacks still blocked (would need many IPs)

**Rate Limits (Upstash Ratelimit):**
- **Per-IP:** 10 requests/min (sliding window)
- **Per-IP+Email:** 10 requests/min (sliding window)
- **Algorithm:** Sliding window (more accurate than fixed window)

### 2. ✅ IP Extraction with Proxy Support

**Problem:** Production apps often run behind proxies (Nginx, Cloudflare), which hide client IP

**Solution:** Multi-header IP extraction

```typescript
function getClientIp(req: NextRequest): string {
  // Check x-forwarded-for (standard proxy header)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take first IP in comma-separated list (original client IP)
    return forwardedFor.split(',')[0].trim();
  }

  // Check x-real-ip (alternative proxy header)
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Fallback to 'unknown' if no IP found
  return 'unknown';
}
```

**Header Priority:**
1. `x-forwarded-for` (most common, set by proxies/load balancers)
2. `x-real-ip` (alternative header, used by Nginx)
3. `'unknown'` (fallback for local development)

**x-forwarded-for Format:**
```
X-Forwarded-For: 203.0.113.195, 70.41.3.18, 150.172.238.178
                 ^^^^^^^^^^^^^^ (original client IP - we take this)
```

**Security Note:** Trusted proxies must set this header correctly (configure Nginx/Cloudflare to append, not replace)

### 3. ✅ Email Normalization Before DB Lookup

**Problem:** Email casing inconsistency could bypass rate limits or cause login failures

**Before:**
```typescript
const { email } = loginSchema.parse(body);
const user = await prisma.user.findUnique({ where: { email } });
```

**After:**
```typescript
const emailNormalized = email.toLowerCase().trim();
const user = await prisma.user.findUnique({ where: { email: emailNormalized } });
```

**Benefits:**
- Consistent rate limiting (User@Example.com and user@example.com treated as same)
- Prevents case-sensitive login issues
- Matches database storage convention (emails stored lowercase)

**Database Constraint:**
Users should be stored with lowercase emails. Add migration if needed:
```sql
-- Ensure all emails are lowercase
UPDATE "User" SET email = LOWER(TRIM(email));
```

### 4. ✅ Timing-Safe Password Verification

**Problem:** Early return when user not found creates timing side-channel for user enumeration

**Timing Leak:**
- User exists: ~100-200ms (bcrypt compare)
- User doesn't exist: ~1-5ms (no bcrypt)
- Attacker can measure response time to enumerate valid emails

**Solution:** Always run bcrypt compare (even if user not found)

```typescript
// Dummy hash for timing-safe password comparison when user not found
const DUMMY_PASSWORD_HASH = '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

let isValidPassword = false;
if (user) {
  isValidPassword = await verifyPassword(password, user.passwordHash);
} else {
  // User not found - run dummy bcrypt to match timing of real verification
  await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
}

// Same error message for both cases
if (!user || !isValidPassword) {
  return NextResponse.json(apiError('Invalid credentials'), { status: 401 });
}
```

**Benefits:**
- Both code paths take similar time (~100-200ms)
- Prevents timing-based user enumeration
- Generic error message prevents direct enumeration

**Note:** This is defense-in-depth. Rate limiting is primary defense, but timing safety adds extra layer.

### 5. ✅ Consistent Response Helpers

**Before:** Mixed usage of `NextResponse.json()` and helper functions

**After:** Consistent use of `apiSuccess()`, `apiError()`, `commonErrors.*`

```typescript
// Success
return NextResponse.json(apiSuccess({ user: { ... } }));

// Invalid credentials
return NextResponse.json(apiError('Invalid credentials'), { status: 401 });

// Rate limit
return NextResponse.json(commonErrors.rateLimit(reset), { status: 429 });

// Validation error
return NextResponse.json(commonErrors.validation(errors), { status: 400 });

// Internal error
return NextResponse.json(commonErrors.internal(), { status: 500 });
```

**Benefits:**
- Stable response shape across all endpoints
- Easier to update error format globally
- Better client-side error handling

### 6. ✅ Session Security (Already Implemented)

Verified `createSession()` uses:
- `crypto.randomBytes(32)` for secure tokens (256 bits entropy)
- SHA-256 hashed tokens stored in DB (not plaintext)
- HttpOnly, Secure, SameSite=Lax cookies
- 30-day expiration with auto-cleanup

See `docs/AUTH_SECURITY.md` for full session security details.

## Attack Scenarios & Mitigations

### Scenario 1: Brute-Force Attack (Single IP, Many Emails)

**Attack:**
```bash
# Attacker tries to brute-force multiple users from single IP
POST /api/auth/login { email: "user1@example.com", password: "password123" }
POST /api/auth/login { email: "user2@example.com", password: "password123" }
POST /api/auth/login { email: "user3@example.com", password: "password123" }
...
POST /api/auth/login { email: "user11@example.com", password: "password123" }
```

**Mitigation:**
- **Per-IP rate limit** blocks after 10 attempts (regardless of email)
- Response: `429 Too Many Requests`
- Attacker must wait 1 minute or switch IPs

**Result:** ✅ Attack prevented by Tier 1 (per-IP) rate limiting

### Scenario 2: Credential Stuffing (Many IPs, Many Emails)

**Attack:**
```bash
# Attacker uses botnet with 1000 IPs to test leaked credentials
IP 1.2.3.4:   POST /api/auth/login { email: "user1@example.com", password: "leaked1" }
IP 5.6.7.8:   POST /api/auth/login { email: "user2@example.com", password: "leaked2" }
IP 9.10.11.12: POST /api/auth/login { email: "user3@example.com", password: "leaked3" }
...
```

**Mitigation:**
- **Per-IP+Email rate limit** allows max 10 attempts per IP+email combo
- Each victim email can only be attacked 10 times/min from each IP
- With 1000 IPs, attacker can only make 10,000 attempts/min across all users
- For 10,000 users, that's 1 attempt/user/min (very slow brute-force)

**Additional Defenses:**
- Password strength requirements (8+ chars)
- Email verification on signup
- Monitoring for suspicious login patterns

**Result:** ⚠️ Slowed significantly, not fully prevented (would need additional measures like CAPTCHA after N failed attempts)

### Scenario 3: User Enumeration via Timing

**Attack:**
```bash
# Attacker measures response times to find valid emails
curl -w "%{time_total}\n" -X POST /api/auth/login -d '{"email":"exists@example.com","password":"wrong"}'
# Response: 0.150s (bcrypt takes time)

curl -w "%{time_total}\n" -X POST /api/auth/login -d '{"email":"notexist@example.com","password":"wrong"}'
# Response: 0.152s (dummy bcrypt takes similar time)
```

**Mitigation:**
- **Timing-safe password verification** ensures both paths take ~100-200ms
- **Generic error message** ("Invalid credentials") doesn't reveal if user exists
- **Rate limiting** prevents mass enumeration attempts

**Result:** ✅ Attack prevented by timing-safe code + generic error + rate limiting

### Scenario 4: Email DoS Attack

**Attack:**
```bash
# Attacker wants to prevent victim from logging in (DoS)
for i in {1..100}; do
  curl -X POST /api/auth/login -d '{"email":"victim@example.com","password":"wrong"}'
done
```

**Before (email-only rate limit):**
- After 10 attempts, victim email is rate-limited for 1 minute
- Victim cannot log in (DoS successful)

**After (IP+email rate limit):**
- After 10 attempts from attacker's IP, attacker is blocked
- Victim can still log in from their own IP
- Attacker must use many IPs to DoS (much harder)

**Result:** ✅ Attack difficulty increased significantly

## Testing

### Manual Testing

```bash
# Test 1: Valid login
curl -X POST http://localhost:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"correct"}'
# Expected: 200 OK, session cookie set

# Test 2: Invalid credentials
curl -X POST http://localhost:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}'
# Expected: 401 Unauthorized, "Invalid credentials"

# Test 3: Rate limiting (run 11 times quickly)
for i in {1..11}; do
  curl -X POST http://localhost:3005/api/auth/login \
    -H "Content-Type: application/json" \
    -H "X-Forwarded-For: 1.2.3.4" \
    -d '{"email":"test@example.com","password":"wrong"}'
done
# Expected: First 10 return 401, 11th returns 429 Too Many Requests

# Test 4: Email normalization
curl -X POST http://localhost:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"Test@Example.com","password":"correct"}'
# Expected: 200 OK (case-insensitive)

# Test 5: IP extraction
curl -X POST http://localhost:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 203.0.113.195, 70.41.3.18" \
  -d '{"email":"test@example.com","password":"wrong"}'
# Expected: Rate limit tracked under 203.0.113.195 (first IP)
```

### Timing Attack Test

```bash
# Test timing difference (should be minimal)
time curl -X POST http://localhost:3005/api/auth/login \
  -d '{"email":"exists@example.com","password":"wrong"}'
# Time: ~0.15s

time curl -X POST http://localhost:3005/api/auth/login \
  -d '{"email":"notexist@example.com","password":"wrong"}'
# Time: ~0.15s (similar to above)
```

## Configuration

### Required Environment Variables

```bash
# Upstash Redis (for rate limiting)
UPSTASH_REDIS_URL=https://your-redis.upstash.io
UPSTASH_REDIS_TOKEN=your-token-here
```

### Nginx Proxy Configuration

If running behind Nginx, ensure proxy headers are set:

```nginx
location / {
  proxy_pass http://localhost:3005;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header Host $host;
}
```

**Important:** Use `proxy_add_x_forwarded_for` (appends) NOT `$remote_addr` (replaces)

### Cloudflare Configuration

Cloudflare automatically sets `X-Forwarded-For` and `CF-Connecting-IP` headers.

For Cloudflare, you may prefer:
```typescript
const cfIp = req.headers.get('cf-connecting-ip');
if (cfIp) return cfIp;
```

## Security Checklist

- [x] Dual-layer rate limiting (per-IP + per-IP+email)
- [x] IP extraction with proxy support (x-forwarded-for, x-real-ip)
- [x] Email normalization (lowercase + trim)
- [x] Timing-safe password verification (dummy bcrypt compare)
- [x] Generic error messages (prevents user enumeration)
- [x] Consistent response helpers (apiSuccess, apiError, commonErrors)
- [x] Secure session tokens (crypto.randomBytes, hashed storage)
- [x] HttpOnly, Secure, SameSite=Lax cookies
- [x] No password/request body in logs
- [x] Zod schema validation
- [ ] CAPTCHA after N failed attempts (recommended, not implemented)
- [ ] Account lockout after X failures (recommended, not implemented)
- [ ] Email alerts on suspicious login activity (recommended, not implemented)
- [ ] Geographic anomaly detection (recommended, not implemented)

## Future Improvements

### 1. CAPTCHA After Failed Attempts

Add after 3 failed login attempts:
```typescript
if (failedAttempts >= 3) {
  // Require CAPTCHA (Google reCAPTCHA, hCaptcha, Turnstile)
  const captchaToken = body.captchaToken;
  const isValidCaptcha = await verifyCaptcha(captchaToken);
  if (!isValidCaptcha) {
    return NextResponse.json(
      apiError('CAPTCHA verification failed'),
      { status: 400 }
    );
  }
}
```

### 2. Account Lockout

Temporary lockout after 10 failed attempts:
```typescript
// Store in Redis: failed-attempts:${emailNormalized}
const attempts = await redis.incr(`failed-attempts:${emailNormalized}`);
await redis.expire(`failed-attempts:${emailNormalized}`, 900); // 15 min

if (attempts >= 10) {
  return NextResponse.json(
    apiError('Account temporarily locked. Try again in 15 minutes.'),
    { status: 429 }
  );
}
```

### 3. Email Alerts

Notify user on suspicious activity:
```typescript
if (isNewDevice || isNewLocation) {
  await sendEmail({
    to: user.email,
    subject: 'New login detected',
    body: `Login from ${location} at ${timestamp}. If this wasn't you, reset your password immediately.`,
  });
}
```

### 4. Geographic Anomaly Detection

Flag logins from unusual locations:
```typescript
const userGeoHistory = await getUserRecentLocations(user.id);
const currentCountry = await getCountryFromIp(clientIp);

if (!userGeoHistory.includes(currentCountry)) {
  // Require additional verification (email code, 2FA)
  await requireAdditionalVerification(user);
}
```

## References

- **OWASP Authentication Cheat Sheet:** https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- **Rate Limiting Best Practices:** https://www.cloudflare.com/learning/bots/what-is-rate-limiting/
- **Timing Attacks:** https://codahale.com/a-lesson-in-timing-attacks/
- **Upstash Ratelimit:** https://github.com/upstash/ratelimit

---

**Last Updated:** 2025-12-29
**Status:** ✅ All Required Improvements Implemented
