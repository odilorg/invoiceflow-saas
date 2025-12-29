'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormSection, FormField, FormInput, FormSelect, FormToggle } from '@/components/form';
import { H2, SUBTLE, ERROR } from '@/lib/ui/tokens';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  planStatus: string;
  createdAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Preferences (stored in localStorage for now)
  const [preferences, setPreferences] = useState({
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    timezone: 'UTC',
    emailNotifications: true,
  });

  useEffect(() => {
    loadProfile();
    loadPreferences();
  }, []);

  async function loadProfile() {
    try {
      const res = await fetch('/api/auth/update-profile');

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to load profile');
      }

      const data = await res.json();
      setProfile(data);
      setFormData(prev => ({
        ...prev,
        name: data.name || '',
        email: data.email || '',
      }));
    } catch (err) {
      setError('Failed to load profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function loadPreferences() {
    const saved = localStorage.getItem('userPreferences');
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (err) {
        console.error('Failed to load preferences:', err);
      }
    }
  }

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update profile');
        return;
      }

      setProfile(data.user);
      setMessage('Profile updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update password');
        return;
      }

      setMessage('Password updated successfully');
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to update password');
    } finally {
      setSaving(false);
    }
  }

  function handlePreferencesUpdate(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
    setMessage('Preferences saved successfully');
    setTimeout(() => setMessage(''), 3000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className={`mt-3 ${SUBTLE}`}>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl lg:text-3xl font-semibold text-foreground mb-6">Account Settings</h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-card rounded-lg border border-border p-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'security'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            Security
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'preferences'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            Preferences
          </button>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-4 bg-muted/50 border border-border text-foreground px-4 py-3 rounded-lg text-sm">
            ✓ {message}
          </div>
        )}
        {error && (
          <div className={`mb-4 ${ERROR} px-4 py-3 rounded-lg text-sm`}>
            {error}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className={`${H2} mb-6`}>Profile Information</h2>
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <FormSection fullWidth>
                <FormField id="name" label="Full Name" hint="Optional display name">
                  <FormInput
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your name"
                    disabled={saving}
                    autoTrim
                  />
                </FormField>

                <FormField id="email" label="Email Address" required hint="Cannot be changed">
                  <FormInput
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={true}
                  />
                </FormField>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">Account Type</label>
                  <div className="px-4 py-2.5 bg-muted border border-border rounded-lg">
                    <span className="text-foreground font-medium">
                      {profile?.planStatus === 'FREE' ? 'Free Plan' : 'Premium Plan'}
                    </span>
                    {profile?.planStatus === 'FREE' && (
                      <span className={`${SUBTLE} ml-2`}>
                        (Upgrade for unlimited invoices)
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">Member Since</label>
                  <div className="px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground">
                    {profile && new Date(profile.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </FormSection>

              <button
                type="submit"
                disabled={saving}
                className="w-full h-11 bg-foreground text-background rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className={`${H2} mb-6`}>Change Password</h2>
            <form onSubmit={handlePasswordChange} className="space-y-6">
              <FormSection fullWidth>
                <FormField id="current-password" label="Current Password" required>
                  <FormInput
                    id="current-password"
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                    disabled={saving}
                  />
                </FormField>

                <FormField id="new-password" label="New Password" required hint="Must be at least 6 characters">
                  <FormInput
                    id="new-password"
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    disabled={saving}
                    minLength={6}
                  />
                </FormField>

                <FormField id="confirm-password" label="Confirm New Password" required>
                  <FormInput
                    id="confirm-password"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    disabled={saving}
                  />
                </FormField>
              </FormSection>

              <button
                type="submit"
                disabled={saving}
                className="w-full h-11 bg-foreground text-background rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-2">Security Tips</h3>
              <ul className={`space-y-1 ${SUBTLE}`}>
                <li>• Use a unique password that you don't use elsewhere</li>
                <li>• Consider using a password manager</li>
                <li>• Enable two-factor authentication when available</li>
              </ul>
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className={`${H2} mb-6`}>Preferences</h2>
            <form onSubmit={handlePreferencesUpdate} className="space-y-6">
              <FormSection fullWidth>
                <FormField id="currency" label="Default Currency">
                  <FormSelect
                    id="currency"
                    value={preferences.currency}
                    onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
                    options={[
                      { value: 'USD', label: 'USD - US Dollar' },
                      { value: 'EUR', label: 'EUR - Euro' },
                      { value: 'GBP', label: 'GBP - British Pound' },
                      { value: 'JPY', label: 'JPY - Japanese Yen' },
                      { value: 'AUD', label: 'AUD - Australian Dollar' },
                      { value: 'CAD', label: 'CAD - Canadian Dollar' },
                    ]}
                  />
                </FormField>

                <FormField id="date-format" label="Date Format">
                  <FormSelect
                    id="date-format"
                    value={preferences.dateFormat}
                    onChange={(e) => setPreferences({ ...preferences, dateFormat: e.target.value })}
                    options={[
                      { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                      { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                      { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                    ]}
                  />
                </FormField>

                <FormField id="timezone" label="Timezone">
                  <FormSelect
                    id="timezone"
                    value={preferences.timezone}
                    onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                    options={[
                      { value: 'UTC', label: 'UTC' },
                      { value: 'America/New_York', label: 'Eastern Time (US)' },
                      { value: 'America/Chicago', label: 'Central Time (US)' },
                      { value: 'America/Denver', label: 'Mountain Time (US)' },
                      { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
                      { value: 'Europe/London', label: 'London' },
                      { value: 'Europe/Paris', label: 'Paris' },
                      { value: 'Asia/Tokyo', label: 'Tokyo' },
                      { value: 'Asia/Shanghai', label: 'Shanghai' },
                      { value: 'Australia/Sydney', label: 'Sydney' },
                    ]}
                  />
                </FormField>

                <FormToggle
                  id="email-notifications"
                  label="Email Notifications"
                  checked={preferences.emailNotifications}
                  onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                  hint="Receive updates about your account and invoices"
                />
              </FormSection>

              <button
                type="submit"
                className="w-full h-11 bg-foreground text-background rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all font-medium"
              >
                Save Preferences
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}