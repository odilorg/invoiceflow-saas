'use client';

import { useTheme } from './theme-provider';
import { useEffect, useState } from 'react';

/**
 * Theme selector dropdown for Settings page
 * Allows choosing between System (default), Light, and Dark modes
 */
export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse w-full" />
    );
  }

  return (
    <div className="space-y-2">
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent transition-all"
      >
        <option value="system">System (Auto-detect)</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        This is your default theme. You can switch instantly anytime from the top bar.
      </p>
    </div>
  );
}
