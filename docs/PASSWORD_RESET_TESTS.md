# Password Reset Flow - Manual Test Cases

## Overview

This document describes the manual test cases for the password reset flow. All tests should pass in both development and production environments.

## Prerequisites

- Application running on port 3005 (or your configured port)
- Database accessible and migrations applied
- PM2 logs accessible for dev mode email verification

## Test Environment Setup

### Development Mode
```bash
# Ensure app is running
pm2 restart invoice-followup
pm2 logs invoice-followup --lines 50
```

### Production Mode
- Email provider configured (Resend/SendGrid)
- Environment variable `EMAIL_PROVIDER_CONFIGURED=true`

---

## Test Case 1: Complete Password Reset Flow (Happy Path)

### Step 1: Create Test User
```bash
curl -X POST http://localhost:3005/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"Test1234","name":"Test User"}'
```

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "testuser@example.com",
      "name": "Test User"
    }
  }
}
```

### Step 2: Request Password Reset
```bash
curl -X POST http://localhost:3005/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com"}'
```

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "message": "If an account exists with this email, password reset instructions have been sent."
  }
}
```

**Dev Mode - Check PM2 Logs:**
```bash
pm2 logs invoice-followup --lines 50
```

Look for output like:
```
========== EMAIL (DEV MODE) ==========
To: testuser@example.com
Subject: Reset Your Password - InvoiceFlow
Reset URL: http://127.0.0.1:45653/reset-password?token=bfeacf4e062205c18d14c2f1cf0ea037284861ec56c029351ecedd92d40ffe6a
======================================
```

**Production Mode - Check Email:**
- Email should arrive at `testuser@example.com`
- Contains reset link with token

### Step 3: Reset Password with Token
```bash
# Extract token from PM2 logs or email
TOKEN="bfeacf4e062205c18d14c2f1cf0ea037284861ec56c029351ecedd92d40ffe6a"

curl -X POST http://localhost:3005/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"password\":\"NewPassword123\"}"
```

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "message": "Password has been reset successfully. You can now log in with your new password."
  }
}
```

### Step 4: Verify Login with New Password
```bash
curl -X POST http://localhost:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"NewPassword123"}'
```

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "testuser@example.com",
      "name": "Test User"
    }
  }
}
```

**✅ Test Pass Criteria:**
- All curl commands return expected results
- Dev mode logs show email output with reset URL
- Old password no longer works
- New password works for login

---

## Test Case 2: Token Cannot Be Reused

### Steps
1. Complete Test Case 1 (use token once)
2. Try to use the same token again:

```bash
curl -X POST http://localhost:3005/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"password\":\"AnotherPassword123\"}"
```

**Expected Result:**
```json
{
  "success": false,
  "error": "Reset token has already been used. Please request a new password reset."
}
```

**✅ Test Pass Criteria:**
- Second use of token is rejected with appropriate error message
- Password is NOT changed by second attempt

---

## Test Case 3: Expired Token

### Steps
1. Request password reset
2. Wait 61 minutes (or modify token `expiresAt` in database to past date)
3. Try to use token:

```bash
curl -X POST http://localhost:3005/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"password\":\"NewPassword123\"}"
```

**Expected Result:**
```json
{
  "success": false,
  "error": "Reset token has expired. Please request a new password reset."
}
```

**Manual Database Method (faster testing):**
```bash
ssh -i /home/odil/projects/id_rsa -p 2222 root@62.72.22.205

# Connect to database
psql -U invoice_user -d invoice_db

# Find and expire token
UPDATE "PasswordResetToken"
SET "expiresAt" = NOW() - INTERVAL '1 hour'
WHERE "tokenHash" = 'YOUR_TOKEN_HASH';
```

**✅ Test Pass Criteria:**
- Expired token is rejected with appropriate error message
- Password is NOT changed

---

## Test Case 4: Invalid Token

### Steps
```bash
curl -X POST http://localhost:3005/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"invalid-token-12345","password":"NewPassword123"}'
```

**Expected Result:**
```json
{
  "success": false,
  "error": "Invalid or expired reset token"
}
```

**✅ Test Pass Criteria:**
- Invalid token is rejected with appropriate error message
- No database changes occur

---

## Test Case 5: Email Enumeration Prevention

### Step 1: Request Reset for Non-Existent Email
```bash
curl -X POST http://localhost:3005/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@example.com"}'
```

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "message": "If an account exists with this email, password reset instructions have been sent."
  }
}
```

**Important:** Response should be IDENTICAL to existing user (Test Case 1, Step 2)

### Step 2: Verify No Token Created
```bash
# Check PM2 logs - should NOT see email output for non-existent user
pm2 logs invoice-followup --lines 20
```

**Expected Result:**
- No email logged for non-existent user
- No `PasswordResetToken` created in database
- Response time similar to existing user (no timing attack)

**✅ Test Pass Criteria:**
- Same generic success message for both existing and non-existent emails
- No tokens created for non-existent users
- No indication whether email exists or not

---

## Test Case 6: Rate Limiting

### Steps
```bash
# Send 11 requests rapidly
for i in {1..11}; do
  curl -X POST http://localhost:3005/api/auth/forgot-password \
    -H "Content-Type: application/json" \
    -d '{"email":"testuser@example.com"}'
  echo "\nRequest $i completed"
done
```

**Expected Result (11th request):**
```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "reset": 1640995200000
}
```

**✅ Test Pass Criteria:**
- First 10 requests succeed (200 OK)
- 11th request fails with 429 status code
- Rate limit applies per IP + email combination

---

## Test Case 7: Password Validation

### Step 1: Too Short Password
```bash
curl -X POST http://localhost:3005/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"password\":\"Short1\"}"
```

**Expected Result:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

### Step 2: No Uppercase
```bash
curl -X POST http://localhost:3005/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"password\":\"lowercase123\"}"
```

**Expected Result:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "password",
      "message": "Password must contain at least one uppercase letter"
    }
  ]
}
```

### Step 3: No Number
```bash
curl -X POST http://localhost:3005/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"password\":\"NoNumbers\"}"
```

**Expected Result:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "password",
      "message": "Password must contain at least one number"
    }
  ]
}
```

**✅ Test Pass Criteria:**
- All invalid passwords are rejected with specific validation errors
- Password is NOT changed
- Token remains valid for subsequent attempts (until successfully used)

---

## Test Case 8: Session Invalidation on Password Reset

### Step 1: Create User and Login
```bash
# Register
curl -X POST http://localhost:3005/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"sessiontest@example.com","password":"Test1234","name":"Session Test"}' \
  -c cookies.txt

# Verify session cookie exists
cat cookies.txt
```

### Step 2: Request Password Reset and Reset Password
```bash
# Request reset
curl -X POST http://localhost:3005/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"sessiontest@example.com"}'

# Extract token from logs
TOKEN="..."

# Reset password
curl -X POST http://localhost:3005/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"password\":\"NewPassword123\"}"
```

### Step 3: Verify Old Session Invalid
```bash
# Try to access protected endpoint with old session cookie
curl -X GET http://localhost:3005/api/invoices \
  -b cookies.txt
```

**Expected Result:**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**✅ Test Pass Criteria:**
- Old session cookie no longer works after password reset
- User must login again with new password
- All sessions for user are deleted from database

---

## Test Case 9: Browser UI Flow

### Step 1: Navigate to Login Page
1. Open browser: `http://localhost:3005/login`
2. Click "Forgot Password?" link

### Step 2: Request Password Reset
1. Enter email: `testuser@example.com`
2. Click "Send Reset Link"
3. See success message: "If an account exists with this email, password reset instructions have been sent."

### Step 3: Get Reset Link
**Dev Mode:**
```bash
pm2 logs invoice-followup --lines 50
# Copy the reset URL from logs
```

**Production Mode:**
- Check email inbox
- Click reset link in email

### Step 4: Reset Password
1. Browser opens reset page: `http://localhost:3005/reset-password?token=...`
2. Enter new password: `NewPassword123`
3. Confirm password: `NewPassword123`
4. Click "Reset Password"
5. See success message: "Password reset successful! Redirecting to login..."
6. Auto-redirect to `/login` after 2 seconds

### Step 5: Login with New Password
1. Enter email: `testuser@example.com`
2. Enter new password: `NewPassword123`
3. Click "Login"
4. Successfully redirected to `/dashboard`

**✅ Test Pass Criteria:**
- All UI interactions work smoothly
- Success/error messages display correctly
- Auto-redirect works after successful reset
- Login succeeds with new password

---

## Test Case 10: Multiple Reset Requests

### Steps
```bash
# Request reset #1
curl -X POST http://localhost:3005/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com"}'

# Get token #1 from logs
TOKEN1="..."

# Request reset #2 (immediately after)
curl -X POST http://localhost:3005/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com"}'

# Get token #2 from logs
TOKEN2="..."

# Try to use token #1 (should fail - old token deleted)
curl -X POST http://localhost:3005/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN1\",\"password\":\"NewPassword123\"}"

# Try to use token #2 (should succeed)
curl -X POST http://localhost:3005/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN2\",\"password\":\"NewPassword123\"}"
```

**Expected Results:**
- Token #1 fails with "Invalid or expired reset token"
- Token #2 succeeds with success message

**✅ Test Pass Criteria:**
- Only the most recent token is valid
- Old unused tokens are automatically deleted when new reset is requested
- This prevents token accumulation in database

---

## Security Verification Checklist

- [ ] Tokens are generated with `crypto.randomBytes(32)` (64 hex chars)
- [ ] Only SHA-256 hash is stored in database (not plaintext token)
- [ ] Tokens expire after 1 hour
- [ ] Tokens can only be used once (`usedAt` timestamp)
- [ ] Generic success message prevents email enumeration
- [ ] Rate limiting prevents brute force attacks (10 requests/minute per IP+email)
- [ ] All user sessions are invalidated on password reset
- [ ] Password validation enforces strong passwords (8+ chars, uppercase, number)
- [ ] Email addresses are normalized (toLowerCase + trim)
- [ ] HTTPS enforced in production (check X-Forwarded-Proto header)

---

## Troubleshooting

### Issue: No email in PM2 logs
**Check:**
```bash
pm2 logs invoice-followup --lines 100 | grep "EMAIL (DEV MODE)"
```

**Solution:**
- Ensure `NODE_ENV !== 'production'` or `EMAIL_PROVIDER_CONFIGURED` is not set
- Check PM2 is actually running the latest code: `pm2 restart invoice-followup`
- Verify build is recent: `cd /domains/invoice.jahongir-travel.uz && pnpm build`

### Issue: "Invalid or expired reset token" for valid token
**Check database:**
```bash
psql -U invoice_user -d invoice_db
SELECT "id", "userId", "expiresAt", "usedAt", "createdAt"
FROM "PasswordResetToken"
ORDER BY "createdAt" DESC LIMIT 5;
```

**Possible Causes:**
- Token already used (check `usedAt`)
- Token expired (check `expiresAt`)
- Token hash mismatch (ensure token is exactly as generated)

### Issue: Rate limit triggering unexpectedly
**Solution:**
- Wait 60 seconds between test runs
- Use different IP addresses or emails for testing
- Clear rate limit cache if using Redis

### Issue: Session not invalidated after password reset
**Check database:**
```bash
psql -U invoice_user -d invoice_db
SELECT COUNT(*) FROM "Session" WHERE "userId" = 'USER_ID_HERE';
```

**Should return:** `0` (all sessions deleted)

**If not:** Check transaction in `reset-password` route is executing properly

---

## Performance Benchmarks

### Expected Response Times (Dev Mode)
- Forgot password request: < 200ms
- Reset password: < 300ms (includes transaction)
- Token validation: < 50ms

### Database Queries
- Forgot password: 2-3 queries (find user, delete old tokens, create new token)
- Reset password: 4 queries in transaction (find token, update user, update token, delete sessions)

### Rate Limit Storage
- In-memory: Fast but doesn't persist across restarts
- Redis (recommended for production): < 10ms overhead

---

## Cleanup After Testing

```bash
# Delete test users
psql -U invoice_user -d invoice_db

DELETE FROM "User" WHERE email IN ('testuser@example.com', 'sessiontest@example.com');
-- Cascade will delete sessions, password reset tokens, etc.
```

---

## Production Checklist

Before deploying to production:

- [ ] Configure email provider (Resend/SendGrid)
- [ ] Set `EMAIL_PROVIDER_CONFIGURED=true` in environment
- [ ] Verify HTTPS is enforced
- [ ] Test email delivery to real email addresses
- [ ] Set up monitoring for password reset failures
- [ ] Configure rate limiting with Redis (for multi-instance deployments)
- [ ] Set up alerts for high rate limit rejections (possible attack)
- [ ] Test from production domain (not localhost)
- [ ] Verify reset URLs contain correct production domain
- [ ] Test on mobile devices (responsive UI)
- [ ] Check email rendering in multiple clients (Gmail, Outlook, Apple Mail)

---

## Notes

- **Token Format**: 64 hexadecimal characters (32 bytes of entropy)
- **Token Storage**: SHA-256 hash only (never plaintext)
- **Token Lifetime**: 1 hour (3600000 milliseconds)
- **Rate Limit**: 10 requests per minute per IP+email combination
- **Password Requirements**: 8+ characters, at least one uppercase letter, at least one number
- **Session Invalidation**: All sessions deleted on password reset (user must re-login everywhere)
- **Email Normalization**: `email.toLowerCase().trim()` applied to all email inputs

---

**Last Updated:** 2025-12-29
**Test Status:** All test cases pass ✅
