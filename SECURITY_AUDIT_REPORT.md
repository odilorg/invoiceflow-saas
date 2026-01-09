# Security Audit Report - InvoiceFlow SaaS

**Audit Date:** 2026-01-09
**Auditor:** Claude Code Security Audit
**Codebase:** InvoiceFlow SaaS - Invoice Follow-up Automation Platform
**Technology Stack:** Next.js 13.4.19, TypeScript, Prisma, PostgreSQL, Brevo Email API, Lemon Squeezy Billing

---

## Executive Summary

This comprehensive security audit evaluated the InvoiceFlow SaaS application across multiple attack vectors including authentication, authorization, injection attacks, XSS, CSRF, dependency vulnerabilities, and data protection mechanisms. The application demonstrates **strong security fundamentals** with proper authentication implementation, timing-safe password verification, and comprehensive input validation. However, **critical vulnerabilities in dependencies** require immediate attention.

### Risk Summary

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 **CRITICAL** | 2 | Outdated Next.js with known CVEs, Missing CSRF token validation |
| 🟠 **HIGH** | 3 | Template injection risk, Weak CSP, Console logging exposure |
| 🟡 **MEDIUM** | 4 | Email enumeration, Missing CORS policy, Secrets in logs, next-auth unused |
| 🟢 **LOW** | 2 | Rate limit bypass potential, Missing security headers |

---

## 🔴 CRITICAL SEVERITY VULNERABILITIES

### 1. Outdated Next.js Framework with Known CVEs

**Severity:** CRITICAL
**Location:** `package.json:28`
**CVSS Score:** 7.5-8.6 (High to Critical)

**Description:**
The application uses Next.js 13.4.19, which has **multiple known security vulnerabilities**:

- **GHSA-fr5h-rqp8-mj6g**: Server-Side Request Forgery (SSRF) in Server Actions (CVSS 7.5)
- **GHSA-77r5-gw3j-2mpf**: HTTP Request Smuggling (CVSS 7.5)
- **GHSA-fq54-2j52-jc42**: Denial of Service (DoS) condition (CVSS 7.5)
- **GHSA-c59h-r6p8-q9wc**: Missing cache-control header leading to CDN caching issues

**Impact:**
- Attackers could perform SSRF attacks to access internal services
- HTTP request smuggling could bypass security controls
- DoS attacks could render the application unavailable
- CDN caching issues could expose stale/sensitive data

**Evidence:**
```bash
npm audit
# Shows: next 13.4.19 -> needs upgrade to >=14.1.1 or >=13.5.1
```

**Recommendation:**
```bash
# URGENT: Update Next.js immediately
npm install next@latest
# Or minimum safe version
npm install next@14.1.1
```

**References:**
- https://github.com/advisories/GHSA-fr5h-rqp8-mj6g
- https://github.com/advisories/GHSA-77r5-gw3j-2mpf

---

### 2. Missing CSRF Token Validation on State-Changing Operations

**Severity:** CRITICAL
**Location:** All POST/PATCH/DELETE API routes
**CWE:** CWE-352 (Cross-Site Request Forgery)

**Description:**
While the application uses `SameSite=Lax` cookies which provide **partial CSRF protection**, it lacks explicit CSRF token validation for state-changing operations. SameSite=Lax **does NOT protect against**:
- GET-based CSRF (if any state changes happen via GET)
- Cross-site POST from top-level navigations
- Attacks from subdomains (if attacker controls a subdomain)
- Browsers that don't fully support SameSite

**Vulnerable Endpoints:**
- `POST /api/invoices` - Create invoice
- `PATCH /api/invoices/[id]` - Update invoice
- `DELETE /api/invoices/[id]` - Delete invoice
- `POST /api/auth/login` - Login (session creation)
- `POST /api/billing/checkout` - Payment initiation

**Attack Scenario:**
```html
<!-- Attacker's malicious site -->
<form action="https://invoice.billza.app/api/invoices" method="POST">
  <input name="clientEmail" value="attacker@evil.com">
  <input name="amount" value="10000">
  <input name="clientName" value="Victim">
  <!-- ... other fields ... -->
</form>
<script>document.forms[0].submit();</script>
```

If a logged-in user visits this page via top-level navigation, the invoice could be created.

**Current Protection:**
- ✅ `SameSite=Lax` cookie attribute (lib/auth.ts:64)
- ❌ No CSRF token generation/validation
- ❌ No double-submit cookie pattern
- ❌ No custom header validation

**Recommendation:**

**Option 1: Double-Submit Cookie Pattern (Recommended)**
```typescript
// lib/csrf.ts
import crypto from 'crypto';
import { cookies } from 'next/headers';

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';

export async function generateCsrfToken(): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  (await cookies()).set(CSRF_COOKIE, token, {
    httpOnly: false, // Must be readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  return token;
}

export async function verifyCsrfToken(req: NextRequest): Promise<boolean> {
  const cookieToken = (await cookies()).get(CSRF_COOKIE)?.value;
  const headerToken = req.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken) return false;
  return crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  );
}
```

**Option 2: Require Custom Header**
```typescript
// Simpler approach - require custom header for all state-changing ops
export function requireCustomHeader(req: NextRequest): boolean {
  const customHeader = req.headers.get('x-requested-with');
  return customHeader === 'XMLHttpRequest' ||
         req.headers.get('content-type')?.includes('application/json');
}
```

**Implementation:**
- Generate CSRF token on page load
- Include token in all fetch requests as header
- Validate token on all POST/PATCH/DELETE operations
- Rotate token after successful state changes

---

## 🟠 HIGH SEVERITY ISSUES

### 3. Template Injection Vulnerability in Email Rendering

**Severity:** HIGH
**Location:** `lib/followups.ts:42-62`, `app/api/cron/run-followups/route.ts:199`
**CWE:** CWE-94 (Improper Control of Generation of Code)

**Description:**
The template rendering system uses simple string replacement without proper sanitization. While the template variables are controlled by the user's own invoice data, the email body is converted to HTML using naive `\n` to `<br>` replacement without HTML escaping.

**Vulnerable Code:**
```typescript
// app/api/cron/run-followups/route.ts:199
const htmlBody = followUp.body.replace(/\n/g, '<br>');
```

**Attack Scenario:**
If a user enters malicious content in invoice fields:
```javascript
// Invoice creation with XSS payload
{
  "clientName": "<script>alert('XSS')</script>",
  "notes": "<img src=x onerror=alert(document.cookie)>",
  "invoiceNumber": "INV-<iframe src='evil.com'></iframe>-001"
}
```

When the email is rendered, the HTML tags are **not escaped**, potentially executing JavaScript in email clients that allow it.

**Current State:**
- ❌ No HTML escaping in `renderTemplate()` function
- ❌ Raw HTML injection via newline replacement
- ✅ Variables are user's own data (limited impact - self-XSS mostly)

**Impact:**
- Email clients may execute embedded scripts
- Phishing attacks using rendered email templates
- Self-XSS (user attacking themselves, limited but still a vulnerability)

**Recommendation:**

```typescript
// lib/followups.ts - Add HTML escaping
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderTemplate(
  template: string,
  variables: Record<string, string | undefined | null>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    if (value === undefined || value === null || value === '') {
      const placeholderOnly = new RegExp(`^\\s*\\{${key}\\}\\s*$`, 'gm');
      result = result.replace(placeholderOnly, '');
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), '');
    } else {
      // ESCAPE HTML before replacement
      const safeValue = escapeHtml(value);
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), safeValue);
    }
  }
  result = result.replace(/\n\n\n+/g, '\n\n');
  return result.trim();
}

// app/api/cron/run-followups/route.ts - Fix HTML conversion
const htmlBody = escapeHtml(followUp.body).replace(/\n/g, '<br>');
// Or better: Use a proper markdown/text-to-html library
```

**Alternative:** Use a template engine with auto-escaping (e.g., Handlebars with htmlEscape helper, or marked.js for markdown).

---

### 4. Weak Content Security Policy (CSP)

**Severity:** HIGH
**Location:** `middleware.ts:8-18`
**CWE:** CWE-693 (Protection Mechanism Failure)

**Description:**
The CSP allows `'unsafe-inline'` and `'unsafe-eval'` for scripts, which **significantly weakens XSS protection**. While this is required for Next.js, it defeats much of the purpose of CSP.

**Current CSP:**
```typescript
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // ⚠️ WEAK
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.lemonsqueezy.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');
```

**Issues:**
1. **`'unsafe-inline'`** - Allows inline scripts, enabling XSS
2. **`'unsafe-eval'`** - Allows `eval()`, `new Function()`, enabling code injection
3. **No `nonce` or `hash`** - No way to selectively allow safe inline scripts
4. **`img-src https:`** - Allows loading images from ANY HTTPS site (tracking pixels)

**Impact:**
- XSS attacks can bypass CSP and execute arbitrary JavaScript
- Image tracking pixels can leak user data to external sites
- Inline event handlers can execute malicious code

**Recommendation:**

**Option 1: Use CSP Nonces (Best Practice for Next.js)**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export function middleware(request: NextRequest) {
  const nonce = crypto.randomBytes(16).toString('base64');

  const CSP_DIRECTIVES = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`, // Use nonce
    "style-src 'self' 'unsafe-inline'", // Styles can keep unsafe-inline
    "img-src 'self' data: https://trusted-cdn.com", // Restrict to trusted domains
    "font-src 'self' data:",
    "connect-src 'self' https://api.lemonsqueezy.com https://api.brevo.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ');

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', CSP_DIRECTIVES);
  response.headers.set('X-Nonce', nonce); // Pass nonce to app
  return response;
}
```

Then use the nonce in your app:
```typescript
// app/layout.tsx
export default function RootLayout({ children }) {
  const nonce = headers().get('X-Nonce') || '';
  return (
    <html>
      <head>
        <script nonce={nonce} src="/scripts/app.js" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Option 2: Add Report-Only Mode First**
```typescript
// Test CSP changes without breaking functionality
response.headers.set('Content-Security-Policy-Report-Only', strictCSP);
response.headers.set('Content-Security-Policy', currentCSP);
```

**Additional Improvements:**
- Add `object-src 'none'` (block plugins)
- Add `worker-src 'self'` (control web workers)
- Add `manifest-src 'self'` (PWA manifest)
- Add CSP reporting endpoint to monitor violations

---

### 5. Excessive Console Logging May Expose Sensitive Data

**Severity:** HIGH
**Location:** Multiple API routes (32 occurrences across 12 files)
**CWE:** CWE-532 (Insertion of Sensitive Information into Log File)

**Description:**
The application uses `console.log()` and `console.error()` extensively across API routes. While most logging is careful to mask emails, there's risk of accidentally logging sensitive data in error contexts.

**Findings:**
- ✅ Email masking in `lib/email.ts:50` (`maskEmail()` function)
- ✅ Password excluded from login error logs (`lib/auth/login/route.ts:89`)
- ❌ Generic error logging may leak request bodies
- ❌ No centralized logging with automatic redaction
- ❌ Production logs may contain PII (names, amounts, invoice numbers)

**Vulnerable Examples:**
```typescript
// app/api/webhooks/lemon-squeezy/route.ts:319
console.error('Webhook processing error:', error);
// Could log full webhook payload including customer emails, payment info

// app/api/auth/forgot-password/route.ts:101
console.error('[FORGOT_PASSWORD_ERROR]', error);
// Could log email addresses in certain error scenarios
```

**Attack Scenario:**
- Logs stored in monitoring systems (CloudWatch, DataDog, etc.)
- Developer/operator access to logs
- Log aggregation exposes PII to unauthorized personnel
- Compliance violations (GDPR, CCPA require PII minimization)

**Recommendation:**

**Create Centralized Logging with Redaction:**
```typescript
// lib/logger.ts (enhanced)
interface LogContext {
  userId?: string;
  email?: string;
  invoiceId?: string;
  amount?: number;
  error?: unknown;
  [key: string]: unknown;
}

const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'apiKey', 'passwordHash'];

function redactSensitive(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;

  const redacted = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field))) {
      redacted[key] = '[REDACTED]';
    } else if (key === 'email') {
      redacted[key] = maskEmail(value as string);
    } else if (typeof value === 'object') {
      redacted[key] = redactSensitive(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export function logError(message: string, context: LogContext = {}) {
  const redactedContext = redactSensitive(context);

  if (process.env.NODE_ENV === 'production') {
    // Send to external logging service with structured format
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      ...redactedContext,
    }));
  } else {
    console.error(`[ERROR] ${message}`, redactedContext);
  }
}

export function logInfo(message: string, context: LogContext = {}) {
  // Similar with INFO level
}
```

**Usage:**
```typescript
// Replace all console.error with
import { logError } from '@/lib/logger';

try {
  // ... operation ...
} catch (error) {
  logError('Webhook processing failed', {
    userId: user.id,
    error: error instanceof Error ? error.message : 'Unknown',
    // Do NOT include full webhook payload
  });
}
```

---

## 🟡 MEDIUM SEVERITY ISSUES

### 6. User Enumeration via Login Endpoint

**Severity:** MEDIUM
**Location:** `app/api/auth/login/route.ts:52-72`
**CWE:** CWE-203 (Observable Discrepancy)

**Description:**
While the login endpoint uses **timing-safe password comparison** with a dummy hash when the user is not found, there's a potential timing difference between database queries for existing vs. non-existing users.

**Current Protection:**
```typescript
// lib/auth/login/route.ts:52-64
const user = await prisma.user.findUnique({ where: { email: emailNormalized } });

let isValidPassword = false;
if (user) {
  isValidPassword = await verifyPassword(password, user.passwordHash);
} else {
  // Dummy hash to match timing
  await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
}
```

**Subtle Issue:**
The database query time for `findUnique()` might be measurably different when:
- User exists (returns data)
- User doesn't exist (returns null)

An attacker could perform timing analysis over many requests to enumerate valid emails.

**Additional Enumeration Vectors:**
1. **Password Reset Endpoint** (`/api/auth/forgot-password`)
   - Always returns success, even for non-existent emails ✅ (Good)
   - But timing might differ for DB lookup vs. no-op

2. **Registration Endpoint** (`/api/auth/register`)
   - Returns specific error if email already exists ❌ (Enumeration risk)
   - Should return generic "Unable to create account" message

**Impact:**
- Attackers can build list of valid user emails
- Targeted phishing campaigns
- Credential stuffing attacks (knowing which emails to try)

**Recommendation:**

**1. Ensure Constant-Time Login:**
```typescript
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, rememberMe } = loginSchema.parse(body);
    const emailNormalized = email.toLowerCase().trim();
    const clientIp = getClientIp(req);

    // Rate limiting...
    const ipRateCheck = await checkRateLimit(authRateLimit, `login-ip:${clientIp}`, 'auth');
    if (!ipRateCheck.success) {
      return NextResponse.json(commonErrors.rateLimit(ipRateCheck.reset), { status: 429 });
    }

    // ALWAYS query database (even if we won't use it)
    const user = await prisma.user.findUnique({
      where: { email: emailNormalized },
    });

    // ALWAYS run bcrypt verification (constant time)
    const hashToVerify = user?.passwordHash || DUMMY_PASSWORD_HASH;
    const isValidPassword = await bcrypt.compare(password, hashToVerify);

    // ALWAYS wait same amount before responding
    await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay

    // Check if authentication succeeded
    if (!user || !isValidPassword) {
      return NextResponse.json(
        apiError('Invalid credentials'),
        { status: 401 }
      );
    }

    // Create session...
    await createSession(user.id, rememberMe);
    return NextResponse.json(
      apiSuccess({ user: { id: user.id, email: user.email, name: user.name } })
    );
  } catch (error) {
    // ...
  }
}
```

**2. Fix Registration Enumeration:**
```typescript
// app/api/auth/register/route.ts
// Instead of:
const existing = await prisma.user.findUnique({ where: { email: emailNormalized } });
if (existing) {
  return NextResponse.json(
    { error: 'Email already registered' }, // ❌ Leaks information
    { status: 400 }
  );
}

// Use:
try {
  const user = await prisma.user.create({ data: { email, passwordHash, name } });
  // Success...
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    // Unique constraint violation - email exists
    return NextResponse.json(
      { error: 'Unable to create account' }, // ✅ Generic message
      { status: 400 }
    );
  }
  // Other error...
}
```

**3. Rate Limiting (Already Implemented ✅)**
The dual rate limiting (per-IP and per-IP+email) already helps limit enumeration attacks.

---

### 7. Missing CORS Policy Configuration

**Severity:** MEDIUM
**Location:** Next.js configuration and API routes
**CWE:** CWE-942 (Permissive Cross-domain Policy)

**Description:**
The application **does not explicitly configure CORS headers**, relying on Next.js defaults. This could allow unintended cross-origin API access.

**Current State:**
- ❌ No explicit CORS headers set
- ❌ No `Access-Control-Allow-Origin` restrictions
- ✅ Cookie-based auth provides some protection (cookies not sent cross-origin)
- ✅ SameSite=Lax prevents CSRF in many scenarios

**Risk Scenarios:**
1. **Public API endpoints** (if any) accessible from any origin
2. **Sensitive data leakage** via CORS misconfiguration
3. **CORS + XSS** combination attacks

**Currently Vulnerable Endpoints:**
- `GET /api/health` - Public endpoint, should be accessible
- `GET /api/version` - Public endpoint, should be accessible
- All other endpoints require authentication but have no CORS policy

**Recommendation:**

**Add Explicit CORS Headers:**
```typescript
// middleware.ts - Add CORS policy
function applyCorsHeaders(req: NextRequest, res: NextResponse) {
  const origin = req.headers.get('origin');
  const allowedOrigins = [
    'https://invoice.billza.app',
    'https://www.invoice.billza.app',
  ];

  // Only allow same-origin or explicitly allowed origins
  if (origin && allowedOrigins.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // For preflight requests
  if (req.method === 'OPTIONS') {
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
    res.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
    return new NextResponse(null, { status: 204, headers: res.headers });
  }

  return res;
}

export function middleware(request: NextRequest) {
  // ... existing logic ...
  const response = NextResponse.next();
  applySecurityHeaders(response);
  return applyCorsHeaders(request, response);
}
```

**For Public Endpoints Only:**
```typescript
// app/api/health/route.ts
export async function GET(req: NextRequest) {
  const response = NextResponse.json({ status: 'healthy', ... });
  response.headers.set('Access-Control-Allow-Origin', '*'); // Public endpoint
  return response;
}
```

---

### 8. Environment Variables May Leak in Error Messages

**Severity:** MEDIUM
**Location:** `lib/billing/config.ts:70`, error handlers
**CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)

**Description:**
Several configuration files include environment variables with fallback values that could leak production URLs or configuration details in error scenarios.

**Vulnerable Code:**
```typescript
// lib/billing/config.ts:70
export const config = {
  urls: {
    app: process.env.APP_URL || 'https://invoice.jahongir-travel.uz', // ⚠️ Hardcoded fallback
  },
  // ...
}
```

**Issues:**
1. Hardcoded production URL in fallback
2. Error messages might expose configuration paths
3. 500 errors might leak stack traces with env vars

**Recommendation:**

**1. Remove Hardcoded Secrets:**
```typescript
// lib/billing/config.ts
export const config = {
  urls: {
    app: process.env.APP_URL || (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('APP_URL environment variable is required in production');
      }
      return 'http://localhost:3005'; // Safe dev fallback
    })(),
  },
  // Validate all required env vars at startup
  validate() {
    const required = ['APP_URL', 'BREVO_API_KEY', 'LEMON_SQUEEZY_API_KEY', 'CRON_SECRET'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  },
};

// app/layout.tsx or next.config.js
config.validate(); // Fail fast on startup
```

**2. Sanitize Error Messages:**
```typescript
// lib/api-error-handler.ts
export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // Remove file paths and env var references
    return error.message
      .replace(/\/home\/[^\s]+/g, '[PATH]')
      .replace(/process\.env\.\w+/g, '[ENV]')
      .replace(/[A-Z_]+_API_KEY/g, '[API_KEY]');
  }
  return 'An unexpected error occurred';
}
```

---

### 9. Unused Dependencies (next-auth)

**Severity:** MEDIUM
**Location:** `package.json:29`
**CWE:** CWE-1104 (Use of Unmaintained Third Party Components)

**Description:**
The application includes `next-auth@4.22.1` in dependencies but **does not use it**. The authentication is implemented using a custom session-based system.

**Issues:**
1. **Increased attack surface** - Unused code that could have vulnerabilities
2. **Supply chain risk** - Unnecessary dependency updates
3. **Bundle size** - Wasted bandwidth and storage
4. **Confusion** - Developers might think NextAuth is in use

**Recommendation:**
```bash
# Remove unused dependency
npm uninstall next-auth

# Also check for other unused dependencies
npm install -g depcheck
depcheck
```

**Also Remove if Unused:**
- `resend` (using Brevo instead)
- `nodemailer` (using Brevo API instead)

---

## 🟢 LOW SEVERITY ISSUES

### 10. Rate Limiting Bypass via Distributed IPs

**Severity:** LOW
**Location:** `lib/rate-limit.ts`, `lib/request-utils.ts:8-28`
**CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)

**Description:**
Rate limiting is IP-based, which can be bypassed by attackers using:
- VPN/proxy rotation
- Distributed botnets
- Cloud provider IP ranges

**Current Implementation:**
```typescript
// lib/request-utils.ts:8
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim(); // Takes first IP
  }
  // ... other headers ...
  return 'unknown';
}
```

**Issues:**
1. `X-Forwarded-For` can be spoofed if not behind trusted proxy
2. No verification that the IP is from a trusted proxy chain
3. Attacker could supply multiple IPs to evade limits

**Recommendation:**

**1. Validate Proxy Chain:**
```typescript
// lib/request-utils.ts
export function getClientIp(req: NextRequest): string {
  // Only trust X-Forwarded-For if behind Cloudflare/nginx
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp && process.env.CLOUDFLARE_ENABLED === 'true') {
    return cfConnectingIp.trim(); // Cloudflare-provided, trusted
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp && process.env.NGINX_PROXY === 'true') {
    return realIp.trim(); // Nginx Real-IP, trusted
  }

  // Fallback: take last IP in X-Forwarded-For (closest to our server)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[ips.length - 1]; // Last IP is most trustworthy
  }

  return 'unknown';
}
```

**2. Add User-Based Rate Limiting (Already Partially Implemented ✅):**
The app already has per-user rate limits in addition to per-IP, which is good defense-in-depth.

**3. Consider CAPTCHA for Sensitive Endpoints:**
```typescript
// For login/register after 3 failed attempts
if (failedAttempts >= 3) {
  requireCaptcha = true;
}
```

---

### 11. Missing Subresource Integrity (SRI) for External Resources

**Severity:** LOW
**Location:** External script/style loading
**CWE:** CWE-353 (Missing Support for Integrity Check)

**Description:**
If the application loads any external JavaScript/CSS files from CDNs, they should include SRI hashes to prevent tampering.

**Current State:**
- No external CDN resources found in current audit
- Tailwind CSS is bundled, not CDN-loaded ✅
- Next.js scripts are self-hosted ✅

**Recommendation:**
If external resources are added in the future:
```html
<script
  src="https://cdn.example.com/library.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous"
></script>
```

Generate SRI hashes:
```bash
curl https://cdn.example.com/library.js | openssl dgst -sha384 -binary | openssl base64 -A
```

---

## ✅ POSITIVE SECURITY FINDINGS

The application demonstrates **strong security fundamentals** in several areas:

### Authentication & Session Management ✅
1. **Timing-Safe Password Verification** (lib/auth.ts:34)
   - Uses bcrypt with cost factor 10
   - Dummy hash for non-existent users prevents timing attacks
   - Constant-time comparison for tokens

2. **Secure Session Tokens** (lib/auth.ts:45-70)
   - Cryptographically secure random tokens (32 bytes)
   - SHA-256 hashing before storage
   - HttpOnly cookies prevent XSS token theft
   - Secure flag enabled in production
   - SameSite=Lax provides CSRF protection

3. **Password Reset Security** (lib/auth.ts)
   - Tokens expire after 1 hour
   - One-time use enforcement (usedAt timestamp)
   - All sessions invalidated on password change

### Input Validation ✅
1. **Zod Schema Validation** - All API endpoints
   - Email format validation (RFC 5322)
   - Positive number validation for amounts
   - Required field enforcement
   - Type safety via TypeScript

2. **SQL Injection Protection** ✅
   - Prisma ORM with parameterized queries
   - No raw SQL found (except safe health check: `SELECT 1`)
   - No string concatenation in queries

### Authorization ✅
1. **Ownership Validation** (app/api/invoices/[id]/route.ts)
   - All resource access checked against userId
   - No direct ID access without ownership verification
   - IDOR prevention via `where: { id, userId: user.id }`

2. **Plan-Based Access Control** (lib/billing/subscription-service.ts)
   - Transaction-safe quota checking
   - UTC-aware usage tracking
   - Proper downgrade handling

### Webhook Security ✅
1. **HMAC Signature Validation** (app/api/webhooks/lemon-squeezy/route.ts:12-35)
   - Timing-safe signature comparison
   - Length check before comparison (DoS prevention)
   - Idempotency via event_id storage

2. **Cron Authentication** (lib/request-utils.ts:54-59)
   - Bearer token with timing-safe comparison
   - Rate limiting (1 per minute)

### Security Headers ✅
1. **Comprehensive Header Set** (middleware.ts:31-52)
   - X-Frame-Options: DENY (clickjacking protection)
   - X-Content-Type-Options: nosniff (MIME sniffing protection)
   - Referrer-Policy: strict-origin-when-cross-origin
   - Permissions-Policy: camera=(), microphone=(), geolocation=()
   - HSTS in production (31536000 seconds = 1 year)

### Data Protection ✅
1. **Email Masking in Logs** (lib/email.ts:50)
   ```typescript
   function maskEmail(email: string): string {
     const [local, domain] = email.split('@');
     const maskedLocal = local.slice(0, 2) + '***';
     return `${maskedLocal}@${domain}`;
   }
   ```

2. **Sender Email Validation** (lib/email.ts:30-44)
   - Hardcoded sender enforcement
   - Blocks "jahongir" domain
   - Requires @billza.app sender

### Rate Limiting ✅
1. **Multi-Layer Rate Limiting** (lib/rate-limit.ts)
   - Auth endpoints: 10/min per IP+email
   - API endpoints: 60/min per user
   - Write operations: 30/min per user
   - Cron endpoints: 1/min global
   - Fallback to in-memory when Redis unavailable

### Error Handling ✅
1. **Centralized Error Handler** (lib/api-error-handler.ts)
   - Consistent error format
   - No stack traces in production responses
   - Proper HTTP status codes

---

## PRIORITY RECOMMENDATIONS

### Immediate Actions (Within 24 Hours)

1. **[CRITICAL] Update Next.js Framework**
   ```bash
   npm install next@14.1.1
   npm audit fix
   npm test  # Verify no breaking changes
   ```

2. **[CRITICAL] Implement CSRF Token Validation**
   - Generate CSRF tokens on page load
   - Validate on all POST/PATCH/DELETE operations
   - Use double-submit cookie pattern or custom header requirement

3. **[HIGH] Fix Template HTML Injection**
   - Add HTML escaping to `renderTemplate()` function
   - Escape variables before string replacement
   - Use proper text-to-HTML conversion (not naive \n to <br>)

### Short-Term Actions (Within 1 Week)

4. **[HIGH] Strengthen Content Security Policy**
   - Implement CSP nonces for inline scripts
   - Remove `'unsafe-inline'` and `'unsafe-eval'`
   - Add CSP reporting endpoint
   - Test in report-only mode first

5. **[MEDIUM] Implement Centralized Logging with Redaction**
   - Create logger utility with automatic PII masking
   - Replace all console.log/error calls
   - Configure structured logging for production

6. **[MEDIUM] Fix User Enumeration Issues**
   - Add constant-time delay to login
   - Change registration error message to generic
   - Ensure password reset timing is consistent

### Medium-Term Actions (Within 1 Month)

7. **[MEDIUM] Add Explicit CORS Policy**
   - Define allowed origins
   - Implement CORS middleware
   - Restrict cross-origin access to API

8. **[LOW] Security Hardening**
   - Remove unused dependencies (next-auth, resend, nodemailer)
   - Add startup validation for required env vars
   - Implement SRI if external resources added
   - Add CAPTCHA for auth endpoints after repeated failures

9. **[ONGOING] Security Monitoring**
   - Set up npm audit in CI/CD pipeline
   - Configure security headers monitoring
   - Implement CSP violation reporting
   - Regular dependency updates

---

## COMPLIANCE CONSIDERATIONS

### GDPR / Data Protection
- ✅ Email masking in logs
- ✅ Right to deletion (invoice delete endpoint)
- ⚠️ Consider data retention policies
- ⚠️ Add consent management for email collection
- ⚠️ Implement data export functionality

### PCI DSS (If Handling Payments)
- ✅ No card data stored (using Lemon Squeezy)
- ✅ TLS enforced in production (HSTS)
- ⚠️ Ensure Lemon Squeezy integration is PCI compliant

---

## SECURITY TESTING RECOMMENDATIONS

### Penetration Testing Checklist
- [ ] Run automated OWASP ZAP scan
- [ ] Test CSRF protection after implementation
- [ ] Verify rate limiting cannot be bypassed
- [ ] Test session fixation attacks
- [ ] Verify IDOR protection on all resources
- [ ] Test XSS in all input fields
- [ ] Verify SQL injection protection
- [ ] Test authentication bypass attempts
- [ ] Check for sensitive data exposure in responses
- [ ] Verify webhook signature validation

### Security Tools to Run
```bash
# Dependency vulnerabilities
npm audit
npm audit fix

# Static analysis
npm install -g eslint-plugin-security
eslint . --ext .ts,.tsx

# Docker security (if containerized)
docker scan invoice-app:latest

# OWASP Dependency Check
dependency-check --project InvoiceFlow --scan .
```

---

## CONCLUSION

The InvoiceFlow SaaS application has a **solid security foundation** with excellent authentication mechanisms, proper authorization checks, and comprehensive input validation. However, **critical vulnerabilities in dependencies** and **missing CSRF protection** require immediate attention.

**Overall Security Rating:** 🟡 **B- (Good with Critical Issues)**

**Key Strengths:**
- Timing-safe password operations
- Strong session management
- Comprehensive rate limiting
- Proper authorization checks (IDOR prevention)
- SQL injection protection via Prisma
- Webhook signature validation

**Critical Gaps:**
- Outdated Next.js with known CVEs
- Missing CSRF token validation
- Template injection vulnerability
- Weak Content Security Policy

**Next Steps:**
1. Update Next.js immediately (fixes CVEs)
2. Implement CSRF protection (prevents attack vector)
3. Fix template HTML escaping (prevents XSS)
4. Strengthen CSP with nonces (defense-in-depth)
5. Schedule regular security audits and dependency updates

---

**Report Generated:** 2026-01-09
**Audit Scope:** Full codebase review including authentication, authorization, input validation, dependency vulnerabilities, and API security
**Methodology:** Static code analysis, dependency scanning, manual code review, threat modeling
