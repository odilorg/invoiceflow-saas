# Invoice Follow-Up SaaS

Automatic invoice follow-up reminders to help you get paid faster.

## Features

- 📧 **Automated Email Reminders** - Send follow-up emails automatically based on your schedule
- 📅 **Flexible Scheduling** - Customize reminder timing (e.g., day 0, 3, 7, 14 after due date)
- 📝 **Email Templates** - Friendly, Neutral, and Firm templates (fully editable)
- 💰 **Billing Integration** - Lemon Squeezy for Pro plan upgrades
- 🔒 **Secure** - Password hashing, rate limiting, session management
- 🎯 **Free Plan** - Up to 5 invoices (unlimited for Pro users)

## Tech Stack

- **Framework:** Next.js 13.4.19 (App Router)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** Custom session-based authentication
- **Email:** Resend API
- **Billing:** Lemon Squeezy
- **Deployment:** PM2 + Nginx

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Resend account (for sending emails)
- Lemon Squeezy account (for billing, optional)

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd invoice-followup-saas
npm install
```

### 2. Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/invoice_followup

# Email (Get from https://resend.com)
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=Invoice Reminders <reminders@yourdomain.com>

# Cron Secret (generate with: openssl rand -hex 32)
CRON_SECRET=your-secure-random-secret

# Billing (Get from https://lemonsqueezy.com)
LEMON_STORE_ID=12345
LEMON_API_KEY=sk_xxxxxxxxxxxx
LEMON_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
LEMON_CHECKOUT_URL=https://yourstore.lemonsqueezy.com/checkout/buy/xxx
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (development)
npm run db:push

# OR run migrations (production)
npx prisma migrate deploy

# Seed default templates and demo user
npm run db:seed
```

This creates:
- Demo user: `demo@invoiceflow.com` / `demo123456`
- 3 default templates (Friendly, Neutral, Firm)
- Default schedule (day 0, 3, 7, 14)

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3005](http://localhost:3005)

### 5. Build for Production

```bash
npm run build
npm start
```

## Cron Job Setup

The app needs a cron job to send scheduled follow-up emails.

### Option 1: System Crontab

Add to your crontab (`crontab -e`):

```bash
# Run follow-ups daily at 9 AM
0 9 * * * curl -X POST https://yourdomain.com/api/cron/run-followups \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Option 2: External Cron Service

Use services like:
- [EasyCron](https://www.easycron.com/)
- [cron-job.org](https://cron-job.org/)
- [UptimeRobot](https://uptimerobot.com/) (with HTTP monitoring)

Configure them to POST to:
```
URL: https://yourdomain.com/api/cron/run-followups
Header: Authorization: Bearer YOUR_CRON_SECRET
Method: POST
Schedule: Daily at 9 AM (or your preferred time)
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database with defaults
```

## Project Structure

```
invoice-followup-saas/
├── app/                      # Next.js 13 App Router
│   ├── api/                  # API routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── invoices/        # Invoice CRUD
│   │   ├── templates/       # Template management
│   │   ├── schedules/       # Schedule management
│   │   ├── cron/            # Cron job endpoint
│   │   └── webhooks/        # Lemon Squeezy webhooks
│   ├── dashboard/           # Dashboard page
│   ├── login/               # Login page
│   ├── register/            # Registration page
│   └── page.tsx             # Landing page
├── lib/                      # Shared utilities
│   ├── auth.ts              # Authentication helpers
│   ├── db.ts                # Prisma client
│   ├── followups.ts         # Follow-up generation logic
│   ├── constants.ts         # App constants
│   └── rate-limit.ts        # Rate limiting
├── prisma/                   # Database
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed script
├── __tests__/               # Tests
└── package.json
```

## Security Features

- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ Rate limiting on login (5 attempts per 15 minutes)
- ✅ Server-side route protection
- ✅ Session-based authentication (30-day expiry)
- ✅ CSRF protection (httpOnly cookies)
- ✅ Input validation (Zod schemas)
- ✅ Secrets never exposed to client

## Testing

Run the test suite:

```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

Test coverage includes:
- Authentication (password hashing, verification)
- Validation schemas
- Template rendering
- Follow-up generation logic
- API endpoints

## Deployment

### PM2 (Production)

```bash
# Build
npm run build

# Start with PM2
pm2 start npm --name "invoice-followup" -- start

# Save PM2 config
pm2 save

# Auto-restart on server reboot
pm2 startup
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Troubleshooting

### "Too many login attempts"
- Rate limiting is working correctly
- Wait 15 minutes or reset via database:
  ```sql
  -- No database table for rate limit (in-memory)
  -- Just restart the app: pm2 restart invoice-followup
  ```

### Emails not sending
1. Check Resend API key is correct
2. Verify EMAIL_FROM domain is verified in Resend
3. Check cron job is running:
   ```bash
   curl -X POST http://localhost:3005/api/cron/run-followups \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```
4. Check logs: `pm2 logs invoice-followup`

### Database connection issues
1. Verify DATABASE_URL in `.env`
2. Ensure PostgreSQL is running
3. Test connection:
   ```bash
   npx prisma db pull
   ```

## License

Proprietary - All rights reserved

## Support

For issues or questions, contact support@yourdomain.com
