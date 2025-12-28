# InvoiceFlow - User Guide

**Automated invoice follow-up emails made simple.**

---

## Getting Started

### 1. Sign Up & Login
1. Visit https://invoice.jahongir-travel.uz
2. Click **Sign Up** to create your account
3. Enter your email and password
4. Login to access your dashboard

---

## Dashboard Overview

After logging in, you'll see your main dashboard with:

- **Unpaid Invoices** - Total pending invoices
- **Outstanding Amount** - Total money owed
- **Overdue Invoices** - Invoices past due date
- **Paid This Month** - Successful payments

The dashboard shows your most urgent overdue invoices and recent follow-up activity.

---

## Managing Invoices

### Creating an Invoice

1. Click **Invoices** in the sidebar
2. Click **+ Create Invoice** (top right on desktop, + button bottom right on mobile)
3. Fill in the details:
   - **Client Name** - Who you're invoicing
   - **Client Email** - Where to send follow-ups
   - **Invoice Number** - Your reference (e.g., INV-001)
   - **Amount** - Invoice total
   - **Currency** - USD, EUR, GBP, or UZS
   - **Due Date** - When payment is due
   - **Notes** (optional) - Link to your invoice PDF or payment page
4. Click **Create Invoice**

### Viewing & Managing Invoices

**Filters:**
- **All** - View all invoices
- **Pending** - Unpaid invoices
- **Paid** - Completed invoices
- **Overdue** - Past due date

**Actions:**
- **View Details** - See full invoice info and follow-up history
- **Mark Paid** - Update status when payment received
- **Delete** - Remove invoice (careful!)

### Invoice Detail Page

Click any invoice to:
- View complete invoice information
- See all scheduled and sent follow-ups
- Edit invoice details
- Change status (Pending/Paid/Cancelled)
- Add notes or invoice links

---

## Email Templates

Templates are the emails sent to your clients.

### Creating a Template

1. Click **Templates** in the sidebar
2. Click **+ Create Template**
3. Fill in:
   - **Template Name** - Internal reference (e.g., "Friendly Reminder")
   - **Subject Line** - Email subject (can use variables)
   - **Email Body** - Your message (can use variables)
   - **Set as default** - Use for new invoices automatically

### Using Variables

Templates support dynamic variables that get replaced with real data:

- `{clientName}` - Client's name
- `{amount}` - Invoice amount
- `{currency}` - Currency code
- `{dueDate}` - Due date
- `{invoiceNumber}` - Invoice reference
- `{daysOverdue}` - How many days overdue (for overdue emails)
- `{invoiceLink}` - Link from invoice notes field

**Example:**
```
Subject: Reminder: Invoice {invoiceNumber} due soon

Hi {clientName},

This is a friendly reminder that invoice {invoiceNumber} for {currency} {amount} is due on {dueDate}.

{invoiceLink}

Best regards
```

### Managing Templates

- **Edit** - Update template content
- **Delete** - Remove template
- **Default** - One template can be marked as default

---

## Follow-up Schedules

Schedules define **when** follow-up emails are sent.

### Creating a Schedule

1. Click **Schedules** in the sidebar
2. Click **+ Create Schedule**
3. Enter:
   - **Schedule Name** - e.g., "Standard Follow-up"
   - **Active** - Turn on/off without deleting
   - **Set as default** - Use for new invoices

### Adding Follow-up Steps

Each schedule has multiple steps:

1. Click **+ Add Step**
2. Set **Days after due date**:
   - `0` = On the due date
   - `3` = 3 days after due date
   - `7` = 1 week after due date
3. Choose which **Template** to send
4. Add more steps as needed

**Example Schedule:**
- Step 1: Day 0 (due date) - "Payment Due Today" template
- Step 2: Day 3 - "Friendly Reminder" template
- Step 3: Day 7 - "Urgent: Payment Overdue" template
- Step 4: Day 14 - "Final Notice" template

### Managing Schedules

- **Edit** - Modify schedule and steps
- **Delete** - Remove schedule
- **Active/Inactive** - Enable or disable without deleting
- **Default** - One schedule is used for all new invoices

---

## Email Activity

View all sent follow-up emails and their status.

### Viewing Activity

1. Click **Activity** in the sidebar
2. See stats:
   - **Total Sent** - All emails sent
   - **Successful** - Successfully delivered
   - **Failed** - Delivery failures

### Filters

- **All** - All email logs
- **Success** - Only successful emails
- **Failed** - Only failed emails (with error messages)

### Activity Details

Each log shows:
- **Date & Time** - When email was sent
- **Recipient** - Client email address
- **Subject** - Email subject line
- **Invoice** - Related invoice number and client
- **Status** - Sent or Failed (with error reason)

---

## How Automated Follow-ups Work

### The Process

1. **Create Invoice** - Add invoice with client email and due date
2. **Assign Schedule** - Schedule is automatically assigned (default or custom)
3. **Automatic Sending** - System sends emails based on schedule:
   - On due date (Day 0)
   - 3 days after due date
   - 7 days after due date
   - etc.
4. **Track Activity** - View sent emails in Activity page
5. **Mark Paid** - Update status when client pays

### When Emails Are Sent

The system runs automatically every day and:
- Checks all pending invoices
- Looks at due dates and schedules
- Sends appropriate follow-up emails
- Logs all activity

**Note:** Emails only sent for **PENDING** invoices. Paid or cancelled invoices don't get follow-ups.

---

## Best Practices

### Email Templates

✅ **DO:**
- Keep tone professional and friendly
- Include payment instructions or invoice link
- Use all relevant variables
- Create multiple templates for different stages
- Test templates before setting as default

❌ **DON'T:**
- Use aggressive or threatening language
- Send too many emails too quickly
- Forget to include invoice details
- Use generic templates without personalization

### Follow-up Schedules

✅ **DO:**
- Start with gentle reminders
- Increase urgency gradually
- Space out emails (3-7 days between)
- Send first reminder on or before due date
- Create different schedules for different client types

❌ **DON'T:**
- Send daily emails (too aggressive)
- Wait too long for first follow-up
- Use same template for all steps
- Have too many steps (3-5 is ideal)

### Invoice Management

✅ **DO:**
- Use consistent invoice numbering
- Include invoice link in notes field
- Mark paid promptly
- Set accurate due dates
- Double-check client emails

❌ **DON'T:**
- Forget to update status when paid
- Use incorrect email addresses
- Set unrealistic due dates
- Leave notes field empty

---

## Troubleshooting

### Emails Not Sending

**Check:**
1. Invoice status is **PENDING** (not Paid/Cancelled)
2. Client email is correct
3. Schedule is **Active**
4. Due date has passed (for follow-ups after due date)
5. Check **Activity** page for error messages

### Can't Edit Invoice

- You can only edit **PENDING** invoices
- View page to change status or details

### Template Variables Not Working

- Make sure variables are exactly: `{variableName}`
- Check spelling: `{clientName}` not `{client_name}`
- Variables are case-sensitive

### Schedule Not Applying

- Check schedule is set as **Default**
- Or manually assign schedule to invoice
- Ensure schedule is **Active**

---

## Mobile App Usage

The dashboard works perfectly on mobile:

### Navigation
- **Hamburger menu** (☰) - Access all pages
- **Bottom right + button** - Quick create (invoices, templates, schedules)
- Swipe sidebar to close

### Features
- All desktop features available
- Card-based layouts for easy scrolling
- Touch-friendly buttons
- Horizontal scroll filters

---

## Account Management

### Free Plan

Includes:
- Unlimited invoices
- Unlimited templates
- Unlimited schedules
- Email activity tracking
- Full automation

### Upgrading (Future)

Premium features coming soon:
- Advanced analytics
- Custom branding
- SMS notifications
- Payment integrations
- Priority support

---

## Support

Need help?

- **Email:** support@invoiceflow.com (coming soon)
- **Documentation:** https://docs.invoiceflow.com (coming soon)

---

## Quick Start Checklist

1. ✅ Sign up and login
2. ✅ Create your first email template
3. ✅ Create a follow-up schedule with 3-4 steps
4. ✅ Set schedule as default
5. ✅ Add your first invoice
6. ✅ Wait for automated emails to send
7. ✅ Check Activity page for sent emails
8. ✅ Mark invoice as paid when received

---

**Last Updated:** December 2025
**Version:** 1.0
