import { useEffect, useMemo, useState } from "react";
import {
  Settings2,
  RefreshCw,
  Cloud,
  UserCog,
  BrainCircuit,
  BellRing,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";

import { settingsApi } from "../../api/adminApi";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(v)) return true;
    if (["false", "0", "no", "off"].includes(v)) return false;
  }
  return false;
};

const safeDateTime = (value) => {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleString();
};

const SettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [savingSystem, setSavingSystem] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [checkingCloudinary, setCheckingCloudinary] = useState(false);

  const [settings, setSettings] = useState(null);

  const [systemForm, setSystemForm] = useState({
    emotionTrackingEnabled: true,
    captureIntervalSeconds: 120,
  });

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    avatarUrl: "",
    timezone: "UTC",
    emailAlerts: true,
    platformAlerts: true,
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await settingsApi.getSystem();
      const payload = response?.data || null;

      setSettings(payload);

      setSystemForm({
        emotionTrackingEnabled: toBoolean(payload?.emotionTrackingEnabled),
        captureIntervalSeconds: Number(payload?.captureIntervalSeconds || 120),
      });

      setProfileForm({
        fullName: payload?.adminProfile?.fullName || "",
        email: payload?.adminProfile?.email || "",
        avatarUrl: payload?.adminProfile?.avatarUrl || "",
        timezone: payload?.adminProfile?.timezone || "UTC",
        emailAlerts: toBoolean(payload?.adminProfile?.notificationPreferences?.emailAlerts),
        platformAlerts: toBoolean(
          payload?.adminProfile?.notificationPreferences?.platformAlerts,
        ),
      });
    } catch (error) {
      toast.error(error?.message || "Failed to load settings");
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const cloudinaryConfigured = Boolean(settings?.cloudinaryConfigured);
  const cloudinaryLastCheckedAt = settings?.cloudinaryLastCheckedAt;

  const stats = useMemo(
    () => [
      {
        label: "Emotion Tracking",
        value: systemForm.emotionTrackingEnabled ? "Enabled" : "Disabled",
        tone: systemForm.emotionTrackingEnabled ? "success" : "warning",
      },
      {
        label: "Capture Interval",
        value: `${Number(systemForm.captureIntervalSeconds || 0)} sec`,
        tone: "info",
      },
      {
        label: "Cloudinary",
        value: cloudinaryConfigured ? "Configured" : "Not Configured",
        tone: cloudinaryConfigured ? "success" : "danger",
      },
    ],
    [systemForm, cloudinaryConfigured],
  );

  const handleSaveSystemSettings = async () => {
    const interval = Number(systemForm.captureIntervalSeconds);

    if (!Number.isInteger(interval) || interval < 10 || interval > 3600) {
      toast.error("Capture interval must be an integer between 10 and 3600 seconds");
      return;
    }

    setSavingSystem(true);
    try {
      await settingsApi.updateEmotionTracking({
        emotionTrackingEnabled: Boolean(systemForm.emotionTrackingEnabled),
        captureIntervalSeconds: interval,
      });

      toast.success("System settings updated successfully");
      await loadSettings();
    } catch (error) {
      toast.error(error?.message || "Failed to update system settings");
    } finally {
      setSavingSystem(false);
    }
  };

  const handleSaveProfileSettings = async () => {
    if (!profileForm.fullName.trim() || profileForm.fullName.trim().length < 2) {
      toast.error("Full name must be at least 2 characters");
      return;
    }

    if (!profileForm.email.trim()) {
      toast.error("Email is required");
      return;
    }

    const emailPattern = /^\S+@\S+\.\S+$/;
    if (!emailPattern.test(profileForm.email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (profileForm.avatarUrl.trim()) {
      try {
        new URL(profileForm.avatarUrl.trim());
      } catch {
        toast.error("Avatar URL must be a valid URL");
        return;
      }
    }

    setSavingProfile(true);
    try {
      await settingsApi.updateProfile({
        adminProfile: {
          fullName: profileForm.fullName.trim(),
          email: profileForm.email.trim().toLowerCase(),
          avatarUrl: profileForm.avatarUrl.trim(),
          timezone: profileForm.timezone.trim() || "UTC",
          notificationPreferences: {
            emailAlerts: Boolean(profileForm.emailAlerts),
            platformAlerts: Boolean(profileForm.platformAlerts),
          },
        },
      });

      toast.success("Admin profile settings updated successfully");
      await loadSettings();
    } catch (error) {
      toast.error(error?.message || "Failed to update profile settings");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRefreshCloudinaryStatus = async () => {
    setCheckingCloudinary(true);
    try {
      await settingsApi.refreshCloudinaryStatus();
      toast.success("Cloudinary status refreshed");
      await loadSettings();
    } catch (error) {
      toast.error(error?.message || "Failed to refresh Cloudinary status");
    } finally {
      setCheckingCloudinary(false);
    }
  };

  if (loading && !settings) {
    return <Loader label="Loading settings..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage system-wide preferences, emotion tracking behavior, Cloudinary integration status, and admin profile settings."
        stats={stats}
        actions={
          <button
            type="button"
            onClick={loadSettings}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Reload
          </button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="card rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Emotion Tracking</h3>
          <p className="mt-1 text-sm text-slate-500">
            Configure tracking and capture interval for emotion analytics.
          </p>
        </article>

        <article className="card rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Cloud className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Cloudinary Status</h3>
          <p className="mt-1 text-sm text-slate-500">
            Validate media service configuration for lesson video uploads.
          </p>
        </article>

        <article className="card rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <UserCog className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Admin Profile</h3>
          <p className="mt-1 text-sm text-slate-500">
            Update profile and notification preferences for admin account behavior.
          </p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="card rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Settings2 className="h-4.5 w-4.5 text-indigo-600" />
            Emotion Tracking Settings
          </h2>

          <div className="space-y-4">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(systemForm.emotionTrackingEnabled)}
                onChange={(e) =>
                  setSystemForm((prev) => ({
                    ...prev,
                    emotionTrackingEnabled: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Enable Emotion Tracking
            </label>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Capture Interval (seconds)
              </label>
              <input
                type="number"
                min="10"
                max="3600"
                step="1"
                value={systemForm.captureIntervalSeconds}
                onChange={(e) =>
                  setSystemForm((prev) => ({
                    ...prev,
                    captureIntervalSeconds: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <p className="mt-1 text-xs text-slate-500">
                Recommended: 100–120 seconds for balanced performance and accuracy.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveSystemSettings}
              disabled={savingSystem}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {savingSystem ? "Saving..." : "Save Tracking Settings"}
            </button>
          </div>
        </article>

        <article className="card rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Cloud className="h-4.5 w-4.5 text-sky-600" />
            Cloudinary Configuration Status
          </h2>

          <div className="space-y-4 text-sm">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Current Status</p>
              <p
                className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                  cloudinaryConfigured
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {cloudinaryConfigured ? "Configured" : "Not Configured"}
              </p>

              <p className="mt-3 text-xs text-slate-500">
                Last Checked: {safeDateTime(cloudinaryLastCheckedAt)}
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefreshCloudinaryStatus}
              disabled={checkingCloudinary}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4" />
              {checkingCloudinary ? "Checking..." : "Refresh Cloudinary Status"}
            </button>
          </div>
        </article>
      </section>

      <section className="card rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
          <UserCog className="h-4.5 w-4.5 text-emerald-600" />
          Admin Profile Preferences
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</label>
            <input
              type="text"
              value={profileForm.fullName}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Avatar URL (optional)
            </label>
            <input
              type="url"
              value={profileForm.avatarUrl}
              onChange={(e) =>
                setProfileForm((prev) => ({ ...prev, avatarUrl: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Timezone</label>
            <input
              type="text"
              value={profileForm.timezone}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, timezone: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <BellRing className="h-4 w-4 text-indigo-600" />
            <input
              type="checkbox"
              checked={Boolean(profileForm.emailAlerts)}
              onChange={(e) =>
                setProfileForm((prev) => ({ ...prev, emailAlerts: e.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Email Alerts
          </label>

          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <BellRing className="h-4 w-4 text-indigo-600" />
            <input
              type="checkbox"
              checked={Boolean(profileForm.platformAlerts)}
              onChange={(e) =>
                setProfileForm((prev) => ({ ...prev, platformAlerts: e.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Platform Alerts
          </label>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={handleSaveProfileSettings}
            disabled={savingProfile}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {savingProfile ? "Saving..." : "Save Profile Settings"}
          </button>
        </div>
      </section>
    </div>
  );
};

export default SettingsPage;
