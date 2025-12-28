'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

const CURRENT_VERSION_KEY = 'app_build_version';
const DISMISSED_VERSION_KEY = 'dismissed_build_version';

export function VersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [serverVersion, setServerVersion] = useState<string>('');
  const router = useRouter();
  const checkIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const checkVersion = async () => {
      try {
        // Check server version
        const response = await fetch('/api/version', {
          cache: 'no-store',
          headers: {
            'X-Client-Build-Id': localStorage.getItem(CURRENT_VERSION_KEY) || 'unknown',
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        const newServerVersion = data.version;
        const clientVersion = localStorage.getItem(CURRENT_VERSION_KEY);
        const dismissedVersion = localStorage.getItem(DISMISSED_VERSION_KEY);

        // Only show update if:
        // 1. We have a stored client version (not first visit)
        // 2. Server version is different from client version
        // 3. User hasn't dismissed this specific version update in this session
        if (clientVersion && clientVersion !== newServerVersion && dismissedVersion !== newServerVersion) {
          setUpdateAvailable(true);
          setServerVersion(newServerVersion);
        } else if (!clientVersion) {
          // First visit - store the version silently
          localStorage.setItem(CURRENT_VERSION_KEY, newServerVersion);
        }
      } catch (error) {
        console.error('Version check failed:', error);
      }
    };

    // Check version on mount
    checkVersion();

    // Set up polling with jitter
    const setupPolling = () => {
      // Clear existing interval if any
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }

      // Add random jitter of ±30 seconds to prevent synchronized requests
      const jitter = (Math.random() - 0.5) * 60 * 1000; // -30s to +30s
      const pollInterval = 5 * 60 * 1000 + jitter; // 5 minutes ± 30 seconds

      checkIntervalRef.current = setInterval(() => {
        // Only check if page is visible
        if (document.visibilityState === 'visible') {
          checkVersion();
        }
      }, pollInterval);
    };

    setupPolling();

    // Handle visibility change - pause/resume polling
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = undefined;
      } else if (document.visibilityState === 'visible' && !checkIntervalRef.current) {
        checkVersion(); // Check immediately when page becomes visible
        setupPolling(); // Restart polling
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleRefresh = () => {
    // Store the new version as current
    if (serverVersion) {
      localStorage.setItem(CURRENT_VERSION_KEY, serverVersion);
      localStorage.removeItem(DISMISSED_VERSION_KEY); // Clear dismissed flag
    }

    // Version-based refresh: Add version query param and reload
    const url = new URL(window.location.href);
    url.searchParams.set('v', serverVersion || Date.now().toString());

    // Navigate to the versioned URL (this forces a full reload)
    window.location.href = url.toString();
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
    // Remember that we dismissed this specific version
    if (serverVersion) {
      localStorage.setItem(DISMISSED_VERSION_KEY, serverVersion);
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium">
              New version available!
            </p>
            <p className="mt-1 text-sm opacity-90">
              Please refresh to get the latest updates and bug fixes.
            </p>
            <div className="mt-3 flex space-x-3">
              <button
                onClick={handleRefresh}
                className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-blue-50 transition-colors"
              >
                Refresh Now
              </button>
              <button
                onClick={handleDismiss}
                className="text-white opacity-80 hover:opacity-100 text-sm"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}