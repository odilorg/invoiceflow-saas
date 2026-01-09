# Next.js Upgrade Checklist (13.4.19 → 13.5.6)

## Pre-Upgrade

- [ ] Commit all current changes
- [ ] Create backup branch: `git checkout -b backup-before-nextjs-upgrade`
- [ ] Document current npm versions: `npm list next react react-dom > versions-before.txt`
- [ ] Run tests to establish baseline: `npm test`

## Upgrade Steps

```bash
# 1. Update Next.js to 13.5.6 (fixes security CVEs)
npm install next@13.5.6

# 2. Verify React versions are compatible
npm install react@18.2.0 react-dom@18.2.0

# 3. Check for peer dependency warnings
npm list

# 4. Rebuild
npm run build
```

## Post-Upgrade Testing

### 1. Build & Development Server
- [ ] `npm run build` - succeeds without errors
- [ ] `npm run dev` - dev server starts on port 3005
- [ ] No deprecation warnings in console
- [ ] Hot reload works correctly

### 2. Authentication Flow
- [ ] Login works (`/login`)
- [ ] Registration works (`/register`)
- [ ] Logout works
- [ ] Session persists after page refresh
- [ ] Password reset flow (`/reset-password`)
- [ ] Protected routes redirect to login when not authenticated

### 3. Core Features
- [ ] Dashboard loads (`/dashboard`)
- [ ] Create invoice works
- [ ] Edit invoice works
- [ ] Delete invoice works
- [ ] View invoice details
- [ ] Invoice list pagination
- [ ] Create/edit templates
- [ ] Create/edit schedules
- [ ] Billing page loads
- [ ] Settings page works

### 4. API Endpoints
- [ ] `GET /api/invoices` - returns invoice list
- [ ] `POST /api/invoices` - creates invoice
- [ ] `PATCH /api/invoices/[id]` - updates invoice
- [ ] `DELETE /api/invoices/[id]` - deletes invoice
- [ ] `GET /api/auth/me` - returns current user
- [ ] `GET /api/health` - health check works
- [ ] `GET /api/billing/status` - billing status

### 5. Middleware & Security
- [ ] Security headers present in responses
- [ ] Rate limiting works (test with multiple rapid requests)
- [ ] Protected routes blocked without auth
- [ ] CORS behaves as expected
- [ ] Cookies set correctly (check browser DevTools)

### 6. Cron & Email
- [ ] Test cron endpoint with CRON_SECRET
- [ ] Email sending works (check logs in dev mode)
- [ ] Follow-up generation works

### 7. Error Handling
- [ ] 404 pages display correctly
- [ ] Error boundaries catch errors
- [ ] Loading states show correctly
- [ ] API errors return proper status codes

### 8. Performance
- [ ] Page load times comparable to before
- [ ] No memory leaks in dev server
- [ ] Build size similar to before (`du -sh .next/`)

## Known Changes in 13.5.6

### What Changed from 13.4.19
1. **`experimental.appDir` no longer needed** (App Router is stable)
2. **Security fixes** for SSRF, HTTP smuggling, DoS
3. **Improved error messages** in development
4. **Better caching behavior** (no breaking changes)

### What's Safe to Leave As-Is
- Your `next.config.js` works with or without `experimental.appDir`
- All App Router patterns remain the same
- Metadata API unchanged
- Server Components/Client Components unchanged
- API routes unchanged
- Middleware unchanged

## Rollback Plan (If Issues Found)

```bash
# If something breaks, rollback immediately:
git checkout backup-before-nextjs-upgrade
npm install
npm run build
```

Or reinstall previous version:
```bash
npm install next@13.4.19
npm run build
```

## Optional: Update to Next.js 14.x Later

After 13.5.6 is stable, you can consider 14.x:

```bash
# Check for major breaking changes first
npm install next@14.1.1
```

**Major changes in Next.js 14:**
- Turbopack (dev server) - opt-in
- Server Actions improvements - backwards compatible
- Partial Prerendering - opt-in
- Image optimization changes - mostly backwards compatible

But **NOT required** - 13.5.6 is fully supported and secure.

## Success Criteria

- ✅ All tests pass
- ✅ No console errors in development
- ✅ Production build succeeds
- ✅ All user flows work as before
- ✅ No performance degradation
- ✅ Security vulnerabilities fixed (run `npm audit`)

## References

- [Next.js 13.5 Release Notes](https://nextjs.org/blog/next-13-5)
- [Next.js Upgrade Guide](https://nextjs.org/docs/upgrading)
- [Security Advisory GHSA-fr5h-rqp8-mj6g](https://github.com/advisories/GHSA-fr5h-rqp8-mj6g)
