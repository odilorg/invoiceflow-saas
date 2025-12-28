# Cache Clearing Guide for InvoiceFlow

## Automatic Cache Management

InvoiceFlow now includes automatic cache management features:

1. **Auto-Update Notification**: When a new version is deployed, users will see a notification prompting them to refresh
2. **Version Checking**: The app checks for updates every 5 minutes
3. **Smart Cache Headers**: API routes and dynamic content are never cached

## Manual Cache Clearing Methods

### Method 1: Hard Refresh (Recommended)
- **Windows/Linux**: `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac**: `Cmd + Shift + R`
- **Mobile**: Pull down to refresh (varies by browser)

### Method 2: Browser Developer Tools
1. Open Developer Tools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Method 3: Clear Browser Cache
#### Chrome/Edge
1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select "Cached images and files"
3. Click "Clear data"

#### Firefox
1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select "Cache"
3. Click "Clear Now"

#### Safari
1. Enable Developer menu: Preferences > Advanced > Show Develop menu
2. Click Develop > Empty Caches

### Method 4: Private/Incognito Window
Open the app in a private/incognito window for a fresh session without cache

## For Developers

### Deployment with Cache Busting
```bash
cd /domains/invoice.jahongir-travel.uz
./scripts/deploy.sh
```

### Manual Build and Deploy
```bash
# Build with new version
npm run build

# Restart with PM2
pm2 restart invoice-followup --update-env

# Clear Nginx cache (if applicable)
sudo rm -rf /var/cache/nginx/*
```

### Force All Users to Update
1. Change the build ID in `next.config.js`
2. Deploy the changes
3. Users will see update notification within 5 minutes

## Troubleshooting

### Issue: Changes not visible after deployment
**Solution**:
1. Wait for auto-update notification (appears within 5 minutes)
2. Or perform hard refresh (Ctrl+Shift+R)

### Issue: Form validation errors persist after fix
**Solution**:
1. Click the "Refresh Now" button when update notification appears
2. Or manually clear cache and refresh

### Issue: Old JavaScript code still running
**Solution**:
1. Clear browser cache completely
2. Close all tabs with the app
3. Reopen in new tab

## Technical Details

- **Build Versioning**: Each build has unique ID (timestamp-based)
- **Cache Headers**: API routes have `no-cache` directives
- **Version Check**: Client checks `/api/version` endpoint
- **Service Worker**: Automatically cleared on update notification

## Support

If cache issues persist after trying these methods:
1. Try a different browser
2. Clear cookies for invoice.jahongir-travel.uz
3. Check browser console for errors (F12)
4. Contact support with browser version and error details