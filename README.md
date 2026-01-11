# InvoiceFlow - Automated Invoice Follow-Up SaaS

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)

**Automated invoice follow-up system that helps businesses get paid faster** by sending scheduled email reminders based on customizable templates and schedules.

🌐 **Live:** https://billza.app

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture Overview](#-architecture-overview)
- [Database Schema](#-database-schema)
- [Project Structure](#-project-structure)
- [Setup Guide](#-setup-guide)
- [Environment Variables](#-environment-variables)
- [Security Features](#-security-features)
- [Business Logic](#-business-logic)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)

---

## 🚀 Features

### Core Features
- ✅ **Automated Email Reminders** - Scheduled follow-ups based on invoice due dates
- ✅ **Custom Templates** - Friendly, Neutral, and Firm email templates (fully editable)
- ✅ **Flexible Scheduling** - Multi-step reminder schedules (e.g., day 0, 3, 7, 14)
- ✅ **Invoice Management** - Full CRUD with status tracking (Pending, Paid, Overdue, Cancelled)
- ✅ **Activity Dashboard** - Real-time stats, upcoming reminders, recent activity
- ✅ **Usage Limits** - Free plan (5 invoices), Starter/Pro (unlimited)

### Authentication & Security
- ✅ **Session-based Auth** - Custom implementation with httpOnly cookies
- ✅ **Remember Me** - 7-day vs 30-day session duration
- ✅ **Password Reset** - Email-based password recovery flow
- ✅ **Rate Limiting** - Upstash Redis-based rate limiting (5 attempts/15min)
- ✅ **Input Validation** - Zod schemas on all endpoints
- ✅ **CSRF Protection** - SameSite cookies + secure headers

### Billing & Subscriptions
- ✅ **Lemon Squeezy Integration** - Checkout, webhooks, customer portal
- ✅ **3-Tier Pricing** - Free, Starter, Pro plans
- ✅ **Webhook Processing** - Subscription lifecycle events
- ✅ **Usage Tracking** - Invoice count limits per plan

### Blog
- ✅ **File-Based Blog** - Markdown posts with frontmatter metadata
- ✅ **Static Generation** - Pre-rendered blog pages for SEO
- ✅ **SEO Optimized** - Dynamic metadata for each post
- ✅ **Responsive Design** - Mobile-friendly blog layout

### UX Enhancements
- ✅ **Dark Mode** - System/Light/Dark theme with persistence
- ✅ **Toast Notifications** - Success/error feedback
- ✅ **Responsive Design** - Mobile-first UI with Tailwind CSS
- ✅ **FAB Navigation** - Mobile quick actions
- ✅ **Real-time Validation** - Client-side form validation

---

## 🛠 Tech Stack

### Frontend
- **Framework:** Next.js 13.4.19 (App Router)
- **UI:** React 18.2.0, TypeScript 5.1.6
- **Styling:** Tailwind CSS 3.3.3
- **Forms:** React Hook Form 7.45.0 + Zod 3.21.4
- **Testing:** Jest 29.5.0 + React Testing Library 14.0.0

### Backend
- **Runtime:** Node.js 18+
- **Database:** PostgreSQL 14+ with Prisma ORM 5.0.0
- **Auth:** Custom session-based (bcryptjs 2.4.3)
- **Email:** Brevo API (@getbrevo/brevo 3.0.1)
- **Billing:** Lemon Squeezy
- **Rate Limiting:** Upstash Redis (@upstash/ratelimit 2.0.7)

### DevOps
- **Deployment:** PM2 (process manager)
- **Web Server:** Nginx (reverse proxy)
- **SSL:** Let's Encrypt (Certbot)
- **Cron:** System crontab or external service

---

## 🏗 Architecture Overview

### App Router Structure (Next.js 13)

```
app/
├── (protected)/           # Protected routes (requires auth)
│   └── dashboard/        # All dashboard pages
├── api/                  # API routes (RESTful)
│   ├── auth/            # Authentication endpoints
│   ├── invoices/        # Invoice CRUD
│   ├── templates/       # Template management
│   ├── schedules/       # Schedule management
│   ├── billing/         # Billing & subscriptions
│   ├── cron/            # Scheduled jobs
│   └── webhooks/        # External webhooks (Lemon Squeezy)
├── login/               # Public login page
├── register/            # Public registration
└── page.tsx             # Landing page
```

### Authentication Flow

1. **Login:** Email/password → bcrypt verification → session creation
2. **Session:** Stored in PostgreSQL with SHA-256 hashed token
3. **Cookie:** httpOnly, secure (prod), SameSite=Lax
4. **Middleware:** Route protection via `middleware.ts`
5. **Logout:** Session deleted from DB + cookie cleared

### Email Reminder Flow

```
1. User creates invoice → Auto-generate follow-ups based on schedule
2. Cron job runs daily → Query pending follow-ups (scheduledDate <= today)
3. Send emails via Brevo API → Update follow-up status to SENT
4. Log results → EmailLog table for auditing
5. Mark invoice reminders complete when all sent
```

### Billing Flow (Lemon Squeezy)

```
1. User clicks "Upgrade" → POST /api/billing/checkout → Lemon Squeezy checkout URL
2. User completes payment → Lemon Squeezy webhook → POST /api/webhooks/lemon-squeezy
3. Webhook creates/updates Subscription → Update User.planStatus
4. User gets access to unlimited invoices
```

---

## 🗄 Database Schema

### Core Models

**User** - Authentication and profile
- `email` (unique), `passwordHash`, `name`, `planStatus` (FREE/STARTER/PRO)
- Relations: invoices, templates, schedules, sessions, subscription

**Invoice** - Customer invoices
- `clientName`, `clientEmail`, `amount`, `currency`, `dueDate`, `status`
- Reminder tracking: `lastReminderSentAt`, `remindersCompleted`, `remindersEnabled`
- Relations: user, schedule, followUps

**Template** - Email templates
- `name`, `subject`, `body` (supports variables: `{clientName}`, `{amount}`, `{dueDate}`, `{invoiceNumber}`, `{daysOverdue}`)
- Relations: user, scheduleSteps

**Schedule** - Reminder schedules
- `name`, `isActive`, `isDefault`
- Relations: user, steps, invoices

**ScheduleStep** - Individual reminder steps
- `dayOffset` (days from due date), `order`, `templateId`
- Relations: schedule, template

**FollowUp** - Scheduled reminders
- `invoiceId`, `templateId`, `scheduledDate`, `status` (PENDING/SENT/SKIPPED)
- `subject`, `body` (rendered at creation time)
- Relations: invoice, logs

**EmailLog** - Audit trail
- `followUpId`, `recipientEmail`, `sentAt`, `success`, `errorMessage`

### Billing Models

**Subscription** - User subscriptions
- `providerSubscriptionId` (Lemon Squeezy ID), `status`, `renewsAt`, `isActive`
- Relations: user, billingEvents

**BillingEvent** - Webhook audit
- `providerEventId`, `providerEventType`, `providerPayload`, `processedAt`

### Security Models

**Session** - Authentication sessions
- `tokenHash` (SHA-256), `expiresAt`, `revokedAt`
- Relations: user

**PasswordResetToken** - Password recovery
- `tokenHash` (SHA-256), `expiresAt`, `usedAt`
- Relations: user

---

## 📁 Project Structure

```
billza-app/
├── app/                          # Next.js App Router
│   ├── (protected)/             # Protected routes group
│   │   └── dashboard/
│   │       ├── layout.tsx       # Dashboard layout (server component)
│   │       ├── DashboardShellClient.tsx  # Client shell (sidebar, header)
│   │       ├── page.tsx         # Dashboard home (stats, charts)
│   │       ├── invoices/
│   │       │   ├── page.tsx     # Invoice list
│   │       │   └── [id]/page.tsx  # Invoice detail
│   │       ├── activity/page.tsx   # Activity feed
│   │       ├── templates/page.tsx  # Template management
│   │       ├── schedules/page.tsx  # Schedule management
│   │       ├── settings/page.tsx   # User settings
│   │       └── billing/page.tsx    # Billing & subscriptions
│   ├── api/                     # API routes
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── register/route.ts
│   │   │   ├── logout/route.ts
│   │   │   ├── forgot-password/route.ts
│   │   │   ├── reset-password/route.ts
│   │   │   └── update-profile/route.ts
│   │   ├── invoices/
│   │   │   ├── route.ts         # GET (list), POST (create)
│   │   │   └── [id]/route.ts    # GET, PATCH, DELETE
│   │   ├── templates/route.ts   # Template CRUD
│   │   ├── schedules/route.ts   # Schedule CRUD
│   │   ├── billing/
│   │   │   ├── checkout/route.ts  # Create checkout session
│   │   │   ├── portal/route.ts    # Customer portal URL
│   │   │   ├── status/route.ts    # Subscription status
│   │   │   └── usage/route.ts     # Usage limits
│   │   ├── cron/
│   │   │   └── run-followups/route.ts  # Daily cron job
│   │   ├── webhooks/
│   │   │   └── lemon-squeezy/route.ts  # Billing webhooks
│   │   ├── dashboard/
│   │   │   └── stats/route.ts   # Dashboard statistics
│   │   └── version/route.ts     # Version check
│   ├── billing/
│   │   ├── success/page.tsx     # Payment success redirect
│   │   └── cancel/page.tsx      # Payment cancelled redirect
│   ├── login/page.tsx           # Login page
│   ├── register/page.tsx        # Registration page
│   ├── reset-password/page.tsx  # Password reset
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Landing page
│   └── middleware.ts            # Route protection
├── components/                   # Reusable UI components
│   ├── form/                    # Form components
│   │   ├── FormErrorBanner.tsx
│   │   ├── FormField.tsx
│   │   └── FormLabel.tsx
│   ├── Badge.tsx                # Status badges
│   ├── ConfirmDialog.tsx        # Delete confirmations
│   ├── EntityListCard.tsx       # Generic list card
│   ├── HelpBox.tsx              # Help tooltips
│   ├── Toast.tsx                # Toast notifications
│   ├── ToastProvider.tsx        # Toast context
│   ├── UsageCounter.tsx         # Invoice usage display
│   ├── theme-provider.tsx       # Dark mode provider
│   ├── theme-toggle.tsx         # Theme switcher
│   └── version-check.tsx        # Version mismatch detector
├── lib/                         # Shared utilities
│   ├── auth.ts                  # Auth helpers (session, password)
│   ├── db.ts                    # Prisma client singleton
│   ├── email.ts                 # Brevo email sender
│   ├── followups.ts             # Follow-up generation logic
│   ├── invoice-validation.ts    # Invoice validation schemas
│   ├── rate-limit.ts            # Upstash rate limiter
│   ├── api-response.ts          # Standardized API responses
│   ├── api-error-handler.ts     # Error handling utility
│   ├── constants.ts             # App constants
│   ├── performance.ts           # Performance logging
│   ├── reminder-state.ts        # Reminder state machine
│   ├── seed-defaults.ts         # Default templates/schedules
│   ├── help-content.ts          # Help text content
│   ├── billing/                 # Billing utilities
│   │   ├── config.ts            # Lemon Squeezy config
│   │   └── webhook-handler.ts   # Webhook processing
│   └── ui/                      # UI utilities
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── seed.ts                  # Database seeding
├── __tests__/                   # Test suite
│   ├── lib/                     # Unit tests
│   │   ├── auth.test.ts
│   │   ├── followups.test.ts
│   │   └── validation.test.ts
│   └── components/              # Integration tests
│       ├── DashboardPage.test.tsx
│       ├── InvoicesPage.test.tsx
│       └── ...
├── scripts/
│   └── seed-existing-users.ts   # Migration script
├── public/                      # Static assets
├── .env                         # Environment variables
├── .env.example                 # Env template
├── next.config.js               # Next.js config
├── tailwind.config.js           # Tailwind config
├── tsconfig.json                # TypeScript config
├── jest.config.js               # Jest config
├── package.json                 # Dependencies
└── README.md                    # This file
```

---

## 🔧 Setup Guide

### Prerequisites

- **Node.js** 18+ and pnpm (or npm)
- **PostgreSQL** 14+
- **Brevo** account (for sending emails)
- **Lemon Squeezy** account (for billing, optional)
- **Upstash** Redis account (for rate limiting)

### 1. Clone and Install

```bash
git clone https://github.com/odilorg/invoiceflow-saas.git
cd invoiceflow-saas
pnpm install
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb invoice_followup

# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# Seed default templates and demo user
pnpm db:seed
```

**Seeded data:**
- Demo user: `demo@invoiceflow.com` / `demo123456`
- 3 templates: Friendly, Neutral, Firm
- 1 default schedule: Day 0, 3, 7, 14

### 3. Environment Variables

See [Environment Variables](#-environment-variables) section below.

### 4. Run Development Server

```bash
pnpm dev
```

Open http://localhost:3005

### 5. Build for Production

```bash
pnpm build
pnpm start
```

---

## 🌍 Environment Variables

Create `.env` file in project root:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/invoice_followup"

# Email (Brevo)
BREVO_API_KEY="xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
EMAIL_FROM="Invoice Reminders <no-reply@yourdomain.com>"

# Cron Secret (generate with: openssl rand -hex 32)
CRON_SECRET="your-secure-random-secret-here"

# Billing (Lemon Squeezy)
LEMON_STORE_ID="12345"
LEMON_API_KEY="sk_xxxxxxxxxxxx"
LEMON_WEBHOOK_SECRET="whsec_xxxxxxxxxxxx"
LEMON_STARTER_MONTHLY_VARIANT_ID="123456"
LEMON_STARTER_YEARLY_VARIANT_ID="123457"
LEMON_PRO_MONTHLY_VARIANT_ID="123458"
LEMON_PRO_YEARLY_VARIANT_ID="123459"

# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token-here"

# App URLs
NEXT_PUBLIC_APP_URL="https://billza.app"
NEXT_PUBLIC_VERSION="1.0.0"

# Node Environment
NODE_ENV="production"  # or "development"
```

### Getting API Keys

**Brevo (Email):**
1. Sign up at https://www.brevo.com
2. Go to Settings → API Keys → Create new API key
3. Verify sender email/domain in Settings → Senders

**Lemon Squeezy (Billing):**
1. Sign up at https://lemonsqueezy.com
2. Create store and products
3. Get API key from Settings → API
4. Get variant IDs from product URLs
5. Create webhook pointing to `https://yourdomain.com/api/webhooks/lemon-squeezy`

**Upstash (Rate Limiting):**
1. Sign up at https://upstash.com
2. Create Redis database
3. Copy REST URL and token from database details

---

## 🔐 Security Features

### Authentication

✅ **Password Hashing** - bcrypt with 10 rounds
✅ **Session Tokens** - Cryptographically secure (crypto.randomBytes)
✅ **Token Storage** - SHA-256 hashed in database (plaintext never stored)
✅ **Session Expiration** - 7 days (unchecked) / 30 days (remember me)
✅ **Session Revocation** - Logout deletes session from DB
✅ **Cookie Security** - httpOnly, secure (prod), SameSite=Lax

### Rate Limiting

✅ **Login Protection** - 5 attempts per 15 minutes (per IP)
✅ **API Rate Limits** - 100 requests per minute (per user)
✅ **Email Rate Limits** - Max 3 emails per follow-up per day
✅ **Upstash Redis** - Distributed rate limiting

### Input Validation

✅ **Zod Schemas** - All API endpoints validate input
✅ **Email Validation** - RFC-compliant email regex
✅ **SQL Injection Protection** - Prisma parameterized queries
✅ **XSS Protection** - React auto-escaping + CSP headers

### CSRF Protection

✅ **SameSite Cookies** - Prevents cross-site attacks
✅ **Origin Validation** - Webhook signature verification
✅ **POST-only Mutations** - No sensitive GET requests

### Data Protection

✅ **Secrets Never Exposed** - No client-side env vars
✅ **Error Sanitization** - No stack traces in production
✅ **Audit Logs** - EmailLog table tracks all sent emails
✅ **Soft Deletes** - Session revocation preserves history

---

## 💼 Business Logic

### Invoice Reminder System

**Follow-up Generation:**
1. User creates invoice → System finds active schedule (or default)
2. Generate FollowUp records for each schedule step
3. Calculate `scheduledDate = invoice.dueDate + step.dayOffset`
4. Render email body with variable substitution at creation time

**Reminder Sending (Cron Job):**
1. Query: `status = PENDING AND scheduledDate <= today`
2. For each follow-up:
   - Send email via Brevo API
   - Create EmailLog record
   - Update FollowUp.status to SENT
   - Update Invoice.lastReminderSentAt
3. If all follow-ups sent → Mark Invoice.remindersCompleted = true

**Reminder State Management:**
- **Due Date Change:** Recalculate all pending follow-ups
- **Mark as Paid:** Skip all pending follow-ups
- **Pause Reminders:** Set Invoice.remindersEnabled = false
- **Resume Reminders:** Regenerate follow-ups from current date

### Usage Limits

**Free Plan:**
- 5 invoices maximum
- Check: `SELECT COUNT(*) FROM Invoice WHERE userId = ? AND status != 'CANCELLED'`
- Block invoice creation if count >= 5

**Starter/Pro Plans:**
- Unlimited invoices
- Set User.planStatus via webhook when subscription activates

### Template Variables

Supported placeholders in email templates:
- `{clientName}` → Invoice.clientName
- `{amount}` → Invoice.amount (formatted with currency)
- `{dueDate}` → Invoice.dueDate (formatted as "Jan 15, 2025")
- `{invoiceNumber}` → Invoice.invoiceNumber
- `{daysOverdue}` → Calculated from dueDate (only if overdue)

Example:
```
Subject: Reminder: Invoice {invoiceNumber} payment due

Hi {clientName},

This is a friendly reminder that Invoice {invoiceNumber} for {amount}
was due on {dueDate}.

Please process payment at your earliest convenience.

Best regards,
Your Company
```

### Subscription Lifecycle

**Webhook Events Handled:**
- `subscription_created` → Create Subscription record
- `subscription_updated` → Update status, renewsAt
- `subscription_payment_success` → Activate subscription
- `subscription_cancelled` → Set endsAt, keep active until end
- `subscription_expired` → Deactivate, set User.planStatus = FREE

---

## 📡 API Documentation

### Authentication Endpoints

**POST /api/auth/register**
```json
Request:
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"  // optional
}

Response (200):
{
  "success": true,
  "data": {
    "user": {
      "id": "clx...",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

**POST /api/auth/login**
```json
Request:
{
  "email": "user@example.com",
  "password": "password123",
  "rememberMe": true  // optional, default true
}

Response (200):
{
  "success": true,
  "data": {
    "user": {
      "id": "clx...",
      "email": "user@example.com"
    }
  }
}
```

**POST /api/auth/logout**
```json
Response (200):
{
  "success": true
}
```

### Invoice Endpoints

**GET /api/invoices**
```
Headers: Cookie: session_token=...

Response (200):
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "clientName": "Acme Corp",
      "clientEmail": "billing@acme.com",
      "amount": 1500.00,
      "currency": "USD",
      "invoiceNumber": "INV-001",
      "dueDate": "2025-01-15T00:00:00Z",
      "status": "PENDING",
      "followUps": [
        {
          "id": "clx...",
          "scheduledDate": "2025-01-15T00:00:00Z",
          "status": "PENDING",
          "subject": "Reminder: Invoice INV-001 payment due"
        }
      ]
    }
  ]
}
```

**POST /api/invoices**
```json
Request:
{
  "clientName": "Acme Corp",
  "clientEmail": "billing@acme.com",
  "amount": 1500.00,
  "currency": "USD",
  "invoiceNumber": "INV-001",
  "dueDate": "2025-01-15",
  "scheduleId": "clx...",  // optional, uses default if omitted
  "notes": "Net 30 payment terms"  // optional
}

Response (201):
{
  "success": true,
  "data": {
    "id": "clx...",
    "clientName": "Acme Corp",
    ...
  }
}
```

**PATCH /api/invoices/:id**
```json
Request:
{
  "status": "PAID",  // optional
  "dueDate": "2025-01-20",  // optional
  "notes": "Updated notes"  // optional
}

Response (200):
{
  "success": true,
  "data": { ... }
}
```

**DELETE /api/invoices/:id**
```
Response (200):
{
  "success": true
}
```

### Cron Endpoint

**POST /api/cron/run-followups**
```
Headers:
  Authorization: Bearer YOUR_CRON_SECRET

Response (200):
{
  "success": true,
  "data": {
    "processed": 5,
    "sent": 4,
    "failed": 1,
    "details": [
      {
        "followUpId": "clx...",
        "invoiceNumber": "INV-001",
        "clientEmail": "billing@acme.com",
        "status": "sent"
      }
    ]
  }
}
```

---

## 🚀 Deployment

### Production Deployment (PM2 + Nginx)

**1. Build Application**
```bash
cd /var/www/billza-app
pnpm install
pnpm build
```

**2. Start with PM2**
```bash
pm2 start npm --name "billza-app" -- start
pm2 save
pm2 startup
```

**3. Nginx Configuration**
```nginx
# /etc/nginx/sites-available/billza.app.conf
server {
    server_name billza.app;

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/billza.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/billza.app/privkey.pem;
}

server {
    if ($host = billza.app) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name billza.app;
    return 404;
}
```

**4. Enable Site and Reload Nginx**
```bash
ln -s /etc/nginx/sites-available/billza.app.conf /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

**5. SSL Certificate (Let's Encrypt)**
```bash
certbot --nginx -d billza.app
```

**6. Setup Cron Job**
```bash
crontab -e
```

Add:
```cron
# Run follow-ups daily at 9 AM
0 9 * * * curl -X POST https://billza.app/api/cron/run-followups -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### PM2 Management Commands

```bash
pm2 list                    # List all processes
pm2 logs billza-app   # View logs
pm2 restart billza-app  # Restart app
pm2 stop billza-app   # Stop app
pm2 delete billza-app # Delete app
pm2 monit                   # Real-time monitoring
```

---

## 🧪 Testing

### Run Tests

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # Coverage report
```

### Test Coverage

**Unit Tests (`__tests__/lib/`):**
- ✅ `auth.test.ts` - Password hashing, session creation
- ✅ `followups.test.ts` - Follow-up generation logic
- ✅ `validation.test.ts` - Zod schema validation
- ✅ `constants.test.ts` - Default values

**Integration Tests (`__tests__/components/`):**
- ✅ `DashboardPage.test.tsx` - Dashboard rendering
- ✅ `InvoicesPage.test.tsx` - Invoice CRUD
- ✅ `TemplatesPage.test.tsx` - Template management
- ✅ `SchedulesPage.test.tsx` - Schedule management
- ✅ `ActivityPage.test.tsx` - Activity feed

**Coverage Goals:**
- Unit tests: >80%
- Integration tests: >60%
- E2E tests: Critical paths (login, create invoice, send reminder)

---

## 🐛 Troubleshooting

### Common Issues

**"Too many login attempts"**
- Rate limiting is working correctly
- Wait 15 minutes or restart app: `pm2 restart billza-app`

**Emails not sending**
1. Verify Brevo API key: `echo $BREVO_API_KEY`
2. Check sender email verified in Brevo dashboard
3. Test manually:
   ```bash
   curl -X POST http://localhost:3005/api/cron/run-followups \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```
4. Check logs: `pm2 logs billza-app --lines 100`

**Database connection errors**
1. Verify DATABASE_URL in `.env`
2. Check PostgreSQL running: `systemctl status postgresql`
3. Test connection: `npx prisma db pull`

**Build errors**
1. Clear Next.js cache: `rm -rf .next`
2. Reinstall dependencies: `rm -rf node_modules && pnpm install`
3. Regenerate Prisma client: `pnpm db:generate`

**Session expires too quickly**
- Check `SESSION_DURATION_SHORT` in `lib/auth.ts` (default 7 days)
- Ensure "Remember me" checkbox works (should be 30 days)

**Follow-ups not being generated**
1. Check invoice has scheduleId set (or default schedule exists)
2. Query: `SELECT * FROM Schedule WHERE isDefault = true LIMIT 1`
3. If no default: Run `pnpm db:seed`

**Lemon Squeezy webhook not working**
1. Verify webhook URL: `https://yourdomain.com/api/webhooks/lemon-squeezy`
2. Check webhook secret matches `.env`
3. View webhook logs in Lemon Squeezy dashboard
4. Check BillingEvent table: `SELECT * FROM BillingEvent ORDER BY createdAt DESC`

---

## 📊 Performance Optimizations

### Database Indexes

All hot paths have composite indexes:
- `Invoice`: `[userId, createdAt]`, `[userId, status]`, `[status, remindersEnabled]`
- `FollowUp`: `[status, scheduledDate]` (critical for cron job)
- `Session`: `[tokenHash]` (auth lookup)
- `Template`: `[userId, createdAt]`

### Query Optimization

**Invoice List (Dashboard):**
```typescript
// Optimized query with selective includes
const invoices = await prisma.invoice.findMany({
  where: { userId },
  include: {
    followUps: {
      where: { status: 'PENDING' },
      orderBy: { scheduledDate: 'asc' },
      take: 1  // Only next reminder
    }
  },
  orderBy: { createdAt: 'desc' }
});
```

**Cron Job Query:**
```typescript
// Uses composite index [status, scheduledDate]
const pendingFollowUps = await prisma.followUp.findMany({
  where: {
    status: 'PENDING',
    scheduledDate: { lte: new Date() }
  },
  include: { invoice: true }
});
```

---

## 📝 Roadmap

### Planned Features

- [ ] **Multi-language Support** - i18n for email templates
- [ ] **SMS Reminders** - Twilio integration
- [ ] **Recurring Invoices** - Auto-create monthly/yearly invoices
- [ ] **Payment Links** - Stripe/PayPal integration
- [ ] **Analytics Dashboard** - Charts, trends, insights
- [ ] **Team Collaboration** - Multi-user accounts
- [ ] **API Access** - Public REST API for integrations
- [ ] **Zapier Integration** - Connect to 5000+ apps
- [ ] **Mobile App** - React Native iOS/Android

### Security Roadmap

- [ ] **"Log out from all devices"** - Revoke all sessions
- [ ] **Active Sessions Management** - View/revoke individual sessions
- [ ] **2FA (TOTP)** - Authenticator app support
- [ ] **Audit Logs** - User action tracking
- [ ] **IP Whitelisting** - Restrict access by IP

---

## 📄 License

Proprietary - All rights reserved

---

## 🤝 Support

For technical issues or questions:
- **Email:** support@jahongir-travel.uz
- **GitHub Issues:** https://github.com/odilorg/invoiceflow-saas/issues

---

## 👨‍💻 Development Team

**Developer:** Odil Khamidov
**Company:** Jahongir Travel
**Version:** 1.0.0
**Last Updated:** December 2025

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Brevo API Docs](https://developers.brevo.com/)
- [Lemon Squeezy Webhooks](https://docs.lemonsqueezy.com/api/webhooks)
- [Upstash Redis](https://docs.upstash.com/redis)

---

**Built with ❤️ using Next.js, Prisma, and Tailwind CSS**


---

## Blog System

Billza includes a file-based blog system for content marketing and SEO.

### Blog Structure

```
content/
  blog/
    getting-started-with-billza.md
    invoice-follow-up-best-practices.md
    freelancer-invoicing-mistakes.md

app/
  blog/
    page.tsx           # Blog index
    [slug]/
      page.tsx         # Individual blog post

lib/
  blog.ts              # Blog utilities
```

### Creating a New Blog Post

1. Create a new `.md` file in `content/blog/`:

```markdown
---
title: "Your Blog Post Title"
slug: "your-blog-post-slug"
date: "2025-01-15"
excerpt: "A brief description of your post for previews and SEO."
author: "Billza Team"
tags: ["invoicing", "tips", "business"]
---

# Your Blog Post Title

Your content goes here...
```

2. Build and deploy:

```bash
pnpm build
pm2 restart billza-app
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | The post title |
| `slug` | Yes | URL-friendly identifier |
| `date` | Yes | Publication date (YYYY-MM-DD) |
| `excerpt` | Yes | Short description for previews |
| `author` | Yes | Author name |
| `tags` | No | Array of tags for categorization |

### Blog URLs

- Blog Index: `https://billza.app/blog`
- Blog Post: `https://billza.app/blog/{slug}`

### SEO Features

- Dynamic title and meta description per post
- OpenGraph tags for social sharing
- Twitter card support
- Semantic HTML structure

### Dependencies

- `gray-matter` - Parses frontmatter metadata
- `remark` - Processes Markdown content
- `remark-html` - Converts Markdown to HTML
