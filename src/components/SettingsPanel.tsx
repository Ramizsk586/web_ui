import React, { useEffect, useState } from "react";

interface ToggleSetting {
  kind: "toggle";
  key: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
}

interface TimezoneSetting {
  kind: "timezone";
  key: string;
  label: string;
  description: string;
}

type Setting = ToggleSetting | TimezoneSetting;

const SETTINGS: Setting[] = [
  {
    kind: "toggle",
    key: "proactive_enabled",
    label: "Proactive email surfacing",
    description:
      "Watch new Gmail messages. When something important arrives, you'll get a Telegram notice. Turn off to silence the watcher entirely without disconnecting Gmail.",
    defaultEnabled: true,
  },
  {
    kind: "timezone",
    key: "user_timezone",
    label: "Your timezone",
    description:
      "Used for deadline checks, 'today', and any time-of-day reasoning. The agent can also update this via Telegram when you tell it your timezone.",
  },
];

const COMMON_TIMEZONES: Array<{ value: string; label: string }> = [
  { value: "America/New_York", label: "America/New_York (Eastern)" },
  { value: "America/Chicago", label: "America/Chicago (Central)" },
  { value: "America/Denver", label: "America/Denver (Mountain)" },
  { value: "America/Phoenix", label: "America/Phoenix (Arizona)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (Pacific)" },
  { value: "America/Anchorage", label: "America/Anchorage (Alaska)" },
  { value: "Pacific/Honolulu", label: "Pacific/Honolulu (Hawaii)" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "Europe/Paris", label: "Europe/Paris" },
  { value: "Europe/Berlin", label: "Europe/Berlin" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata" },
  { value: "Australia/Sydney", label: "Australia/Sydney" },
  { value: "UTC", label: "UTC" },
];

interface SettingsPanelProps {
  convex?: {
    settings: Record<string, string>;
    setSetting: (key: string, value: string) => Promise<void>;
    clearSetting: (key: string) => Promise<void>;
  };
}

export function SettingsPanel({ convex }: SettingsPanelProps) {
  const settings = convex?.settings || {};

  return (
    <div className="flex flex-col h-full -m-5">
      <div
        className="shrink-0 border-b px-5 py-3.5 flex items-center justify-between backdrop-blur-md"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-header-bg)' }}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--theme-secondary)' }}>
            Agent Settings
          </h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'var(--theme-surface-alt)', color: 'var(--theme-muted)' }}>
            {SETTINGS.length} configuration(s)
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {SETTINGS.map((s) =>
          s.kind === "toggle" ? (
            <ToggleRow key={s.key} setting={s} convex={convex} />
          ) : (
            <TimezoneRow key={s.key} setting={s} convex={convex} />
          )
        )}
      </div>
    </div>
  );
}

function SettingShell({
  label,
  description,
  debugLine,
  control,
}: {
  label: string;
  description: string;
  debugLine: string;
  control: React.ReactNode;
}) {
  return (
    <div
      className="border rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all duration-300 hover:shadow-lg backdrop-blur-sm"
      style={{
        background: 'var(--theme-surface-alt, rgba(255, 255, 255, 0.03))',
        borderColor: 'var(--theme-border)',
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold tracking-wide" style={{ color: 'var(--theme-primary)' }}>
          {label}
        </div>
        <div className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--theme-muted)' }}>
          {description}
        </div>
        <div className="text-[10px] font-mono mt-3 opacity-60" style={{ color: 'var(--theme-secondary)' }}>
          {debugLine}
        </div>
      </div>
      <div className="shrink-0 w-full md:w-auto flex md:justify-end">{control}</div>
    </div>
  );
}

function ToggleRow({
  setting,
  convex,
}: {
  setting: ToggleSetting;
  convex: SettingsPanelProps["convex"];
}) {
  const settings = convex?.settings || {};
  const value = settings[setting.key];

  const enabled = value === undefined ? setting.defaultEnabled : value !== "false";

  async function toggle() {
    if (!convex) return;
    await convex.setSetting(setting.key, enabled ? "false" : "true");
  }

  const debugLine = `settings.${setting.key} = "${enabled ? "true" : "false"}"`;

  return (
    <SettingShell
      label={setting.label}
      description={setting.description}
      debugLine={debugLine}
      control={
        <button
          onClick={toggle}
          role="switch"
          aria-checked={enabled}
          aria-label={`Toggle ${setting.label}`}
          className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer shadow-inner"
          style={{
            background: enabled ? 'linear-gradient(135deg, #10B981, #059669)' : '#4B5563',
          }}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
              enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      }
    />
  );
}

function TimezoneRow({
  setting,
  convex,
}: {
  setting: TimezoneSetting;
  convex: SettingsPanelProps["convex"];
}) {
  const settings = convex?.settings || {};
  const stored = settings[setting.key] || null;

  const [draft, setDraft] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    setDraft(stored ?? "");
  }, [stored]);

  useEffect(() => {
    function tick() {
      const tz = stored ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
      try {
        const d = new Date();
        const fmt = new Intl.DateTimeFormat(undefined, {
          timeZone: tz,
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        });
        setNow(fmt.format(d));
      } catch {
        setNow("(invalid timezone)");
      }
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [stored]);

  async function save(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Pick a timezone or clear to reset.");
      return;
    }
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: trimmed });
    } catch {
      setError(`"${trimmed}" isn't a recognized IANA timezone.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (convex) {
        await convex.setSetting(setting.key, trimmed);
      }
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    setSaving(true);
    setError(null);
    try {
      if (convex) {
        await convex.clearSetting(setting.key);
      }
      setDraft("");
    } finally {
      setSaving(false);
    }
  }

  const debugLine = `settings.${setting.key} = ${
    stored === null ? "(unset, falling back to server zone)" : `"${stored}"`
  }${now ? ` · local time: ${now}` : ""}`;

  return (
    <SettingShell
      label={setting.label}
      description={setting.description}
      debugLine={debugLine}
      control={
        <div className="flex flex-col items-end gap-2 w-full md:min-w-[280px]">
          <div className="flex items-center gap-2 w-full">
            <select
              value={COMMON_TIMEZONES.some((t) => t.value === draft) ? draft : ""}
              onChange={(e) => setDraft(e.target.value)}
              disabled={saving}
              className="text-xs px-2.5 py-2 border rounded-xl flex-1 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all"
              style={{
                background: 'var(--theme-bg, rgba(0,0,0,0.2))',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-primary)',
              }}
            >
              <option value="" style={{ background: 'var(--theme-bg)', color: '#9CA3AF' }}>— select common timezone —</option>
              {COMMON_TIMEZONES.map((t) => (
                <option key={t.value} value={t.value} style={{ background: 'var(--theme-bg)', color: 'var(--theme-primary)' }}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 w-full">
            <input
              type="text"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setError(null);
              }}
              placeholder="or paste IANA ID e.g. America/Chicago"
              disabled={saving}
              className="text-xs px-2.5 py-2 border rounded-xl flex-1 font-mono focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all"
              style={{
                background: 'var(--theme-bg, rgba(0,0,0,0.2))',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-primary)',
              }}
            />
            <button
              onClick={() => save(draft)}
              disabled={saving || draft.trim() === (stored ?? "")}
              className="text-xs px-3.5 py-2 rounded-xl disabled:opacity-50 transition-all font-semibold shadow-md active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                color: '#FFF',
              }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          {stored !== null && (
            <button
              onClick={clear}
              disabled={saving}
              className="text-[11px] px-2.5 py-1.5 rounded-lg border transition-all hover:bg-[rgba(255,255,255,0.05)] active:scale-95"
              style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-muted)' }}
            >
              Reset to default
            </button>
          )}
          {error && <div className="text-[11px] text-rose-400 font-medium animate-pulse">{error}</div>}
        </div>
      }
    />
  );
}
