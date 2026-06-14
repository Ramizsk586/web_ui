import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles, ArrowRight, ArrowLeft, MessageCircle, PlugZap,
  Database, Check, SkipForward, Terminal, RefreshCw, CheckCircle2,
  Loader2, AlertCircle
} from 'lucide-react';

interface UserProfile {
  name: string;
  age: number;
  avatar: string;
  dob: string;
  location: string;
}

interface OnboardingModalProps {
  onComplete: (profile: UserProfile) => void;
  initialStep?: StepId;
  autoBypass?: boolean;
}

type StepId = 'profile' | 'telegram' | 'composio' | 'convex';

interface TelegramConfig {
  botToken: string;
  allowlist: string[];
  webhookUrl: string;
  isConnected: boolean;
}

const TELEGRAM_STORAGE_KEY = 'lumina_telegram_config';
const steps: StepId[] = ['profile', 'telegram', 'composio', 'convex'];

const stepMeta: Record<StepId, { title: string; subtitle: string; icon: React.ReactNode }> = {
  profile: {
    title: 'Welcome to Lumina',
    subtitle: 'Create your profile to initialize your persistent AI workspace.',
    icon: <Sparkles size={28} className="!text-[#09090b]" />
  },
  telegram: {
    title: 'Telegram Bot Setup',
    subtitle: 'Optionally connect a Telegram bot and define which users can access it.',
    icon: <MessageCircle size={28} className="!text-[#09090b]" />
  },
  composio: {
    title: 'Composio API',
    subtitle: 'Optionally add your Composio API key so Lumina can connect external tools.',
    icon: <PlugZap size={28} className="!text-[#09090b]" />
  },
  convex: {
    title: 'Convex Environment',
    subtitle: 'Run the guided setup to connect your Convex backend automatically.',
    icon: <Database size={28} className="!text-[#09090b]" />
  }
};

function buildProfile(name: string, age: number): UserProfile {
  const trimmed = name.trim();
  return {
    name: trimmed,
    age,
    avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(trimmed)}`,
    dob: '',
    location: 'Local Workspace'
  };
}

function parseAllowlist(value: string): string[] {
  return value.split(/[\n,]/).map(item => item.trim()).filter(Boolean);
}

// ── helpers ──────────────────────────────────────────────────────────────────
function savedTelegramToken(): string {
  try {
    const raw = localStorage.getItem(TELEGRAM_STORAGE_KEY);
    if (raw) return JSON.parse(raw).botToken || '';
  } catch {}
  return '';
}

function savedTelegramAllowlist(): string {
  try {
    const raw = localStorage.getItem(TELEGRAM_STORAGE_KEY);
    if (raw) return (JSON.parse(raw).allowlist || []).join('\n');
  } catch {}
  return '';
}

interface ParsedEnv {
  telegramToken: string;
  telegramAllowlist: string;
  composioKey: string;
  convexDeployment: string;
  convexUrl: string;
}

function parseEnvLocal(content: string): ParsedEnv {
  let telegramToken = '';
  let telegramAllowlist = '';
  let composioKey = '';
  let convexDeployment = '';
  let convexUrl = '';

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const parts = trimmed.split('=');
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').split('#')[0].trim(); // strip inline comment

    if (key === 'TELEGRAM_BOT_TOKEN') telegramToken = val;
    if (key === 'TELEGRAM_ALLOWLIST') telegramAllowlist = val;
    if (key === 'COMPOSIO_API_KEY') composioKey = val;
    if (key === 'CONVEX_DEPLOYMENT') convexDeployment = val;
    if (key === 'VITE_CONVEX_URL') convexUrl = val;
    if (key === 'CONVEX_URL' && !convexUrl) convexUrl = val;
  }

  return { telegramToken, telegramAllowlist, composioKey, convexDeployment, convexUrl };
}

// ── Main component ────────────────────────────────────────────────────────────
export function OnboardingModal({ onComplete, initialStep, autoBypass = true }: OnboardingModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    if (initialStep) {
      const idx = steps.indexOf(initialStep);
      if (idx !== -1) return idx;
    }
    return 0;
  });

  // Profile
  const [loginName, setLoginName] = useState(() => {
    try {
      const saved = localStorage.getItem('lumina_user_profile');
      if (saved) return JSON.parse(saved).name || '';
    } catch {}
    return '';
  });
  const [loginAge, setLoginAge] = useState(() => {
    try {
      const saved = localStorage.getItem('lumina_user_profile');
      if (saved) {
        const a = JSON.parse(saved).age;
        return a ? String(a) : '';
      }
    } catch {}
    return '';
  });

  // Telegram — start empty; placeholders show masked saved values
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramAllowlist, setTelegramAllowlist] = useState('');
  const hasSavedTelegram = !!savedTelegramToken();

  // Composio
  const [composioApiKey, setComposioApiKey] = useState(() => localStorage.getItem('COMPOSIO_API_KEY') || '');
  const [composioStatus, setComposioStatus] = useState<'idle' | 'verifying' | 'ok' | 'error'>('idle');
  const [composioError, setComposioError] = useState('');
  const hasSavedComposio = !!localStorage.getItem('COMPOSIO_API_KEY');

  // Convex wizard state
  const [convexSetupPhase, setConvexSetupPhase] = useState<
    'idle' | 'launched' | 'polling' | 'found' | 'verified' | 'error'
  >('idle');
  const [convexDeployment, setConvexDeployment] = useState(() => localStorage.getItem('CONVEX_DEPLOYMENT') || '');
  const [convexUrl, setConvexUrl] = useState(() => localStorage.getItem('VITE_CONVEX_URL') || localStorage.getItem('convex_vite_url') || '');
  const [convexError, setConvexError] = useState('');
  const hasSavedConvex = !!(localStorage.getItem('CONVEX_DEPLOYMENT') && localStorage.getItem('VITE_CONVEX_URL'));
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Shared
  const [errorText, setErrorText] = useState('');
  const [isSavingEnv, setIsSavingEnv] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(true);
  const [autoDetectStatus, setAutoDetectStatus] = useState('Checking .env.local configuration...');
  const [telegramBypass, setTelegramBypass] = useState(false);
  const [composioBypass, setComposioBypass] = useState(false);

  // ── Auto Onboard / Verification ──
  useEffect(() => {
    let active = true;

    const runAutoDetect = async () => {
      try {
        const readRes = await fetch('/api/fs/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: '.env.local' })
        });
        if (!readRes.ok) {
          if (active) setIsAutoDetecting(false);
          return;
        }

        const data = await readRes.json();
        const content = data.content || '';
        const parsed = parseEnvLocal(content);

        // Populate fields in state
        if (parsed.telegramToken) setTelegramToken(parsed.telegramToken);
        if (parsed.telegramAllowlist) setTelegramAllowlist(parsed.telegramAllowlist);
        if (parsed.composioKey) setComposioApiKey(parsed.composioKey);
        if (parsed.convexDeployment) setConvexDeployment(parsed.convexDeployment);
        if (parsed.convexUrl) setConvexUrl(parsed.convexUrl);

        // Auto-connect requires at least a Convex setup
        if (!parsed.convexDeployment || !parsed.convexUrl) {
          if (active) setIsAutoDetecting(false);
          return;
        }



        // Everything present is valid! Save to localStorage
        if (parsed.telegramToken) {
          const config: TelegramConfig = {
            botToken: parsed.telegramToken,
            allowlist: parseAllowlist(parsed.telegramAllowlist),
            webhookUrl: '',
            isConnected: true
          };
          localStorage.setItem(TELEGRAM_STORAGE_KEY, JSON.stringify(config));
        }
        if (parsed.composioKey) {
          localStorage.setItem('COMPOSIO_API_KEY', parsed.composioKey);
        }
        localStorage.setItem('CONVEX_DEPLOYMENT', parsed.convexDeployment);
        localStorage.setItem('VITE_CONVEX_URL', parsed.convexUrl);
        localStorage.setItem('convex_vite_url', parsed.convexUrl);

        // Load profile or initialize defaults
        const savedProfile = localStorage.getItem('lumina_user_profile');
        let profileName = 'User';
        let profileAge = 25;
        if (savedProfile) {
          try {
            const p = JSON.parse(savedProfile);
            profileName = p.name || 'User';
            profileAge = p.age || 25;
          } catch {}
        }
        const profile = buildProfile(profileName, profileAge);
        localStorage.setItem('lumina_user_profile', JSON.stringify(profile));
        localStorage.setItem('lumina_profile_created', 'true');

        if (active) {
          if (autoBypass) {
            setAutoDetectStatus('Connection successful! Connecting...');
            setTimeout(() => {
              if (active) {
                onComplete(profile);
              }
            }, 1000);
          } else {
            setIsAutoDetecting(false);
          }
        }
      } catch (err) {
        if (active) setIsAutoDetecting(false);
      }
    };

    runAutoDetect();
    return () => { active = false; };
  }, [autoBypass]);

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;
  const canGoBack = currentStepIndex > 0;

  // Stop polling on unmount
  useEffect(() => () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
  }, []);

  // Reset Convex polling when leaving/entering convex step
  useEffect(() => {
    if (currentStep !== 'convex' && pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, [currentStep]);

  const finishOnboarding = () => {
    const ageNum = parseInt(loginAge, 10) || 25;
    const nameVal = loginName || 'User';
    onComplete(buildProfile(nameVal, ageNum));
  };

  // ── env.local read / write ──────────────────────────────────────────────────
  const upsertEnvValue = (content: string, key: string, value: string) => {
    const normalized = content.replace(/\r\n/g, '\n');
    const nextLine = `${key}=${value.replace(/\r?\n/g, '\\n')}`;
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    if (pattern.test(normalized)) return normalized.replace(pattern, nextLine);
    return normalized.trim() ? `${normalized.trim()}\n${nextLine}\n` : `${nextLine}\n`;
  };

  const writeEnvLocal = async (updates: Record<string, string>) => {
    let content = '';
    try {
      const readRes = await fetch('/api/fs/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: '.env.local' })
      });
      if (readRes.ok) content = (await readRes.json()).content || '';
    } catch {}

    let nextContent = content;
    Object.entries(updates).forEach(([key, value]) => {
      nextContent = upsertEnvValue(nextContent, key, value);
    });

    const writeRes = await fetch('/api/fs/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: '.env.local', content: nextContent })
    });
    if (!writeRes.ok) throw new Error('Failed to write .env.local');
  };

  // ── Save helpers ────────────────────────────────────────────────────────────
  const saveTelegramConfig = async () => {
    const token = telegramToken.trim().replace(/^TELEGRAM_BOT_TOKEN=/i, '').trim();
    const ids   = parseAllowlist(telegramAllowlist.replace(/^TELEGRAM_ALLOWLIST=/i, ''));

    // If user left fields empty and a saved config already exists → preserve it
    if (!token && !telegramAllowlist.trim() && hasSavedTelegram) return;

    if (token && !telegramBypass) {
      if (ids.length === 0) throw new Error('Please specify at least one User ID to verify.');

      // 1. Verify Bot Token
      let botUsername = 'Bot';
      try {
        const r = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        if (!r.ok) throw new Error('Invalid Telegram Bot Token. Please check the token.');
        const d = await r.json();
        botUsername = d.result?.username || 'Bot';
      } catch (e: any) {
        setTelegramBypass(true); // Allow bypass on next click
        throw new Error((e.message || 'Failed to contact Telegram API. Check your network.') + ' Click Continue again to save anyway.');
      }

      // 2. Send verification message to each user ID
      const failedIds: string[] = [];
      for (const userId of ids) {
        try {
          const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: userId,
              text: `🤖 Verification: Lumina connection established! Hello from @${botUsername}.`
            })
          });
          if (!r.ok) failedIds.push(userId);
        } catch { failedIds.push(userId); }
      }
      if (failedIds.length > 0) {
        setTelegramBypass(true); // Allow bypass on next click
        throw new Error(
          `Could not message User ID(s): ${failedIds.join(', ')}. ` +
          `Please start a chat with @${botUsername} on Telegram first, then try again. Or click Continue again to save anyway.`
        );
      }
    }

    const config: TelegramConfig = { botToken: token, allowlist: ids, webhookUrl: '', isConnected: !!token };
    localStorage.setItem(TELEGRAM_STORAGE_KEY, JSON.stringify(config));
    await writeEnvLocal({ TELEGRAM_BOT_TOKEN: token, TELEGRAM_ALLOWLIST: ids.join(',') });
  };

  const verifyComposioKey = async (key: string): Promise<void> => {
    setComposioStatus('verifying');
    setComposioError('');
    try {
      const r = await fetch('/api/composio/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });
      const data = await r.json();
      if (data.enabled) {
        setComposioStatus('ok');
      } else {
        setComposioStatus('error');
        setComposioError(data.error || 'Invalid API key');
        throw new Error(data.error || 'Composio API key is invalid.');
      }
    } catch (e: any) {
      if (composioStatus !== 'error') setComposioStatus('error');
      throw new Error(e.message || 'Failed to verify Composio API key.');
    }
  };

  const saveComposioKey = async () => {
    const key = composioApiKey.trim().replace(/^COMPOSIO_API_KEY=/i, '').trim();

    // If user left the field empty and a key is already saved → preserve it
    if (!key && hasSavedComposio) return;

    if (key && !composioBypass) {
      try {
        await verifyComposioKey(key);
      } catch (err: any) {
        setComposioBypass(true); // Allow bypass on next click
        throw new Error((err.message || 'Composio API key is invalid.') + ' Click Continue again to save anyway.');
      }
    }
    localStorage.setItem('COMPOSIO_API_KEY', key);
    await writeEnvLocal({ COMPOSIO_API_KEY: key });
  };

  // ── Convex wizard ───────────────────────────────────────────────────────────
  const launchConvexSetup = async () => {
    setConvexError('');
    setConvexSetupPhase('launched');
    try {
      await fetch('/api/convex/open-setup', { method: 'POST' });
      setConvexSetupPhase('polling');
      startPolling();
    } catch {
      setConvexSetupPhase('error');
      setConvexError('Could not open the terminal window. Please run `npm create convex@latest` manually in the project root.');
    }
  };

  const startPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const r = await fetch('/api/convex/read-env');
        const data = await r.json();
        if (data.deployment && data.url) {
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;
          setConvexDeployment(data.deployment);
          setConvexUrl(data.url);
          localStorage.setItem('CONVEX_DEPLOYMENT', data.deployment);
          localStorage.setItem('VITE_CONVEX_URL', data.url);
          localStorage.setItem('convex_vite_url', data.url);
          setConvexSetupPhase('found');
        }
      } catch {}
    }, 2500);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
    setConvexSetupPhase('idle');
  };

  const saveConvexConfig = async () => {
    const deployment = convexDeployment.trim().replace(/^CONVEX_DEPLOYMENT=/i, '').trim();
    const url        = convexUrl.trim().replace(/^VITE_CONVEX_URL=/i, '').replace(/^CONVEX_URL=/i, '').trim();
    if (!deployment && !url && hasSavedConvex) return; // preserve existing
    localStorage.setItem('CONVEX_DEPLOYMENT', deployment);
    localStorage.setItem('VITE_CONVEX_URL', url);
    localStorage.setItem('convex_vite_url', url);
    await writeEnvLocal({ CONVEX_DEPLOYMENT: deployment, VITE_CONVEX_URL: url });
  };

  // ── Navigation ──────────────────────────────────────────────────────────────
  const goNext = async () => {
    setErrorText('');
    if (currentStep === 'profile') {
      if (!loginName.trim()) { setErrorText('Please enter a valid name.'); return; }
      const ageNum = parseInt(loginAge, 10);
      if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) { setErrorText('Please enter a valid age (1-120).'); return; }
    }

    try {
      setIsSavingEnv(true);
      if (currentStep === 'telegram')  await saveTelegramConfig();
      if (currentStep === 'composio')  await saveComposioKey();
      if (currentStep === 'convex') {
        await saveConvexConfig();
        finishOnboarding();
        return;
      }
      setCurrentStepIndex(prev => prev + 1);
    } catch (e: any) {
      setErrorText(e.message || 'Could not save setup values.');
    } finally {
      setIsSavingEnv(false);
    }
  };

  // Skip: if data already exists, jump forward WITHOUT clearing it
  const handleSkip = async () => {
    setErrorText('');
    try {
      setIsSavingEnv(true);

      if (currentStep === 'telegram' && !hasSavedTelegram) {
        // No saved config — write blanks
        localStorage.setItem(TELEGRAM_STORAGE_KEY, JSON.stringify({ botToken: '', allowlist: [], webhookUrl: '', isConnected: false }));
        await writeEnvLocal({ TELEGRAM_BOT_TOKEN: '', TELEGRAM_ALLOWLIST: '' });
      }
      if (currentStep === 'composio' && !hasSavedComposio) {
        localStorage.setItem('COMPOSIO_API_KEY', '');
        await writeEnvLocal({ COMPOSIO_API_KEY: '' });
      }
      if (currentStep === 'convex') {
        finishOnboarding();
        return;
      }
      setCurrentStepIndex(prev => prev + 1);
    } catch {
      setErrorText('Could not update .env.local while skipping.');
    } finally {
      setIsSavingEnv(false);
    }
  };

  const meta = stepMeta[currentStep];

  // ── Composio status icon ────────────────────────────────────────────────────
  const ComposioStatusIcon = () => {
    if (composioStatus === 'verifying') return <Loader2 size={16} className="text-zinc-400 animate-spin" />;
    if (composioStatus === 'ok')        return <CheckCircle2 size={16} className="text-emerald-400" />;
    if (composioStatus === 'error')     return <AlertCircle  size={16} className="text-rose-400" />;
    return null;
  };

  // ── Convex wizard UI ────────────────────────────────────────────────────────
  const ConvexWizardUI = () => {
    if (convexSetupPhase === 'idle' || convexSetupPhase === 'error') {
      return (
        <div className="space-y-4">
          {hasSavedConvex && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-emerald-300">Convex already configured</p>
                <p className="text-xs text-zinc-400 mt-1 font-mono">{localStorage.getItem('CONVEX_DEPLOYMENT')}</p>
                <p className="text-xs text-zinc-400 font-mono">{localStorage.getItem('VITE_CONVEX_URL')}</p>
                <p className="text-xs text-zinc-500 mt-1">Click <strong>Finish Setup</strong> to keep these, or click <strong>Run Setup</strong> to reconfigure.</p>
              </div>
            </div>
          )}

          {convexSetupPhase === 'error' && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-400" />
              <p className="text-sm text-rose-300">{convexError}</p>
            </div>
          )}

          <button
            type="button"
            onClick={launchConvexSetup}
            className="w-full flex items-center justify-center gap-3 h-14 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-all font-semibold text-white text-sm shadow-lg"
          >
            <Terminal size={20} className="text-indigo-400" />
            {hasSavedConvex ? 'Re-run Convex Setup Wizard' : 'Run Convex Setup Wizard'}
          </button>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-xs text-zinc-400 space-y-1">
            <p className="font-medium text-zinc-300">What happens:</p>
            <p>1. A terminal window opens running <code className="text-indigo-300">npm create convex@latest</code></p>
            <p>2. Follow the prompts in the terminal to set up your project.</p>
            <p>3. Return here — this panel will auto-detect the new values from <code className="text-indigo-300">.env.local</code>.</p>
          </div>
        </div>
      );
    }

    if (convexSetupPhase === 'launched') {
      return (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <Loader2 size={36} className="text-indigo-400 animate-spin" />
          <p className="text-sm text-zinc-300 font-medium">Opening terminal…</p>
          <p className="text-xs text-zinc-500">Complete the Convex wizard in the terminal window that opened.</p>
        </div>
      );
    }

    if (convexSetupPhase === 'polling') {
      return (
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="relative">
              <Terminal size={36} className="text-indigo-400" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-indigo-400 animate-ping" />
            </div>
            <p className="text-sm text-zinc-300 font-medium">Waiting for Convex setup to complete…</p>
            <p className="text-xs text-zinc-500">Finish the wizard in the terminal. This panel will detect the values automatically.</p>
          </div>

          <button
            type="button"
            onClick={stopPolling}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-sm transition-all"
          >
            Cancel
          </button>
        </div>
      );
    }

    if (convexSetupPhase === 'found') {
      return (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-emerald-300">Convex values detected!</p>
              <p className="text-xs text-zinc-400 mt-2 font-mono">CONVEX_DEPLOYMENT={convexDeployment}</p>
              <p className="text-xs text-zinc-400 font-mono">VITE_CONVEX_URL={convexUrl}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={launchConvexSetup}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs transition-all"
          >
            <RefreshCw size={14} />
            Re-run setup
          </button>
        </div>
      );
    }

    return null;
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div id="login-page-container" className="flex flex-col items-center justify-center min-h-screen bg-[#060608] text-white p-6 relative overflow-hidden font-sans select-none w-full">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10%" cy="20%" r="2" fill="#3b82f6" className="animate-pulse" style={{ animationDuration: '3s' }} />
          <circle cx="85%" cy="15%" r="1.5" fill="#f97316" className="animate-pulse" style={{ animationDuration: '4s' }} />
          <circle cx="75%" cy="80%" r="2" fill="#38bdf8" className="animate-pulse" style={{ animationDuration: '5s' }} />
          <circle cx="20%" cy="75%" r="1" fill="#facc15" className="animate-pulse" style={{ animationDuration: '3s' }} />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-xl bg-zinc-900/95 border border-zinc-800/80 rounded-3xl p-8 shadow-2xl relative z-10"
      >
        {isAutoDetecting ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center shadow-lg relative">
              <Loader2 size={32} className="text-white animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-medium text-white">Configuring Workspace</h2>
              <p className="text-sm text-zinc-400 max-w-xs">{autoDetectStatus}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl !bg-[#ffffff] !text-[#09090b] flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.15)]">
                  {meta.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-white">{meta.title}</h1>
                    {currentStep !== 'profile' && (
                      <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 border border-zinc-700 rounded-full px-2 py-1">
                        {isSavingEnv ? 'Saving' : 'Optional'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 max-w-md">{meta.subtitle}</p>
                </div>
              </div>
            </div>

            <div className="space-y-5 text-left">
              {/* ── Profile step ── */}
              {currentStep === 'profile' && (
                <>
                  <div className="space-y-2">
                    <label htmlFor="login-name-input" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest pl-1">Name</label>
                    <input
                      id="login-name-input"
                      type="text"
                      required
                      value={loginName}
                      onChange={e => setLoginName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full h-12 px-4 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-xl text-sm outline-none transition-all focus:ring-4 focus:ring-zinc-800/40 text-white placeholder-zinc-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="login-age-input" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest pl-1">Age</label>
                    <input
                      id="login-age-input"
                      type="number"
                      required
                      min="1"
                      max="120"
                      value={loginAge}
                      onChange={e => setLoginAge(e.target.value)}
                      placeholder="Enter your age"
                      className="w-full h-12 px-4 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-xl text-sm outline-none transition-all focus:ring-4 focus:ring-zinc-800/40 text-white placeholder-zinc-500"
                    />
                  </div>
                </>
              )}

              {/* ── Telegram step ── */}
              {currentStep === 'telegram' && (
                <>
                  {hasSavedTelegram && !telegramToken && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                      <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                      <p className="text-xs text-zinc-300">
                        Telegram bot already configured. Leave fields empty and press <strong>Continue</strong> to keep your existing settings.
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label htmlFor="telegram-token-input" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest pl-1">Telegram Bot Token</label>
                    <input
                      id="telegram-token-input"
                      type="password"
                      value={telegramToken}
                      onChange={e => { setTelegramToken(e.target.value); setTelegramBypass(false); }}
                      placeholder={hasSavedTelegram ? '(saved — paste new token to replace)' : 'Paste your bot token from @BotFather'}
                      className="w-full h-12 px-4 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-xl text-sm outline-none transition-all focus:ring-4 focus:ring-zinc-800/40 text-white placeholder-zinc-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="telegram-allowlist-input" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest pl-1">Allowlist User IDs</label>
                    <textarea
                      id="telegram-allowlist-input"
                      value={telegramAllowlist}
                      onChange={e => { setTelegramAllowlist(e.target.value); setTelegramBypass(false); }}
                      placeholder={hasSavedTelegram ? '(saved — enter new IDs to replace)' : 'One Telegram user ID per line, or comma-separated'}
                      className="w-full min-h-24 px-4 py-3 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-xl text-sm outline-none transition-all focus:ring-4 focus:ring-zinc-800/40 text-white placeholder-zinc-500 resize-none"
                    />
                    <p className="text-xs text-zinc-500 pl-1">
                      When you click Continue, the bot token and each user ID will be verified via the Telegram API and a test message will be sent.
                    </p>
                  </div>
                </>
              )}

              {/* ── Composio step ── */}
              {currentStep === 'composio' && (
                <>
                  {hasSavedComposio && !composioApiKey && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                      <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                      <p className="text-xs text-zinc-300">Composio API key already saved. Leave empty and press <strong>Continue</strong> to keep it.</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label htmlFor="composio-key-input" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest pl-1">Composio API Key</label>
                    <div className="relative flex items-center">
                      <input
                        id="composio-key-input"
                        type="password"
                        value={composioApiKey}
                        onChange={e => { setComposioApiKey(e.target.value); setComposioStatus('idle'); setComposioBypass(false); }}
                        placeholder={hasSavedComposio ? '(saved — paste new key to replace)' : 'Get a key from app.composio.dev'}
                        className="w-full h-12 px-4 pr-10 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-xl text-sm outline-none transition-all focus:ring-4 focus:ring-zinc-800/40 text-white placeholder-zinc-500"
                      />
                      <span className="absolute right-3"><ComposioStatusIcon /></span>
                    </div>
                    {composioStatus === 'ok' && (
                      <p className="text-xs text-emerald-400 pl-1 flex items-center gap-1"><Check size={12} /> API key verified successfully.</p>
                    )}
                    {composioStatus === 'error' && (
                      <p className="text-xs text-rose-400 pl-1">{composioError}</p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-emerald-400"><Check size={16} /></div>
                      <div>
                        <p className="text-sm text-zinc-200">The key will be verified when you click <strong>Continue</strong>.</p>
                        <p className="text-xs text-zinc-500 mt-1">Saved as <code>COMPOSIO_API_KEY</code> in <code>.env.local</code>.</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── Convex step ── */}
              {currentStep === 'convex' && <ConvexWizardUI />}

              {/* Error text */}
              {errorText && (
                <div className="flex items-start gap-2 text-xs text-rose-400 font-medium pl-1">
                  <AlertCircle size={13} className="mt-0.5 shrink-0" />
                  <span>{errorText}</span>
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between gap-3">
              <div className="flex gap-3">
                {canGoBack && (
                  <button
                    type="button"
                    onClick={() => { setErrorText(''); setCurrentStepIndex(prev => prev - 1); }}
                    className="h-11 px-4 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all rounded-xl text-sm font-medium flex items-center justify-center gap-2 text-zinc-200"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                )}
                {currentStep !== 'profile' && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={isSavingEnv}
                    className="h-11 px-4 bg-transparent border border-zinc-800 hover:border-zinc-700 transition-all rounded-xl text-sm font-medium flex items-center justify-center gap-2 text-zinc-400 hover:text-zinc-200"
                  >
                    <SkipForward size={16} />
                    {(currentStep === 'telegram' && hasSavedTelegram) ||
                     (currentStep === 'composio' && hasSavedComposio) ||
                     (currentStep === 'convex'   && hasSavedConvex)
                      ? 'Keep Saved & Skip'
                      : 'Skip'}
                  </button>
                )}
              </div>

              <button
                id="login-submit-button"
                type="button"
                onClick={goNext}
                disabled={isSavingEnv || convexSetupPhase === 'polling' || convexSetupPhase === 'launched'}
                className="min-w-44 h-12 px-6 !bg-[#ffffff] !text-[#09090b] hover:!bg-[#e4e4e7] active:scale-[0.98] transition-all rounded-xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(255,255,255,0.08)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSavingEnv
                  ? <><Loader2 size={15} className="animate-spin !text-[#09090b]" /> Saving…</>
                  : isLastStep
                    ? 'Finish Setup'
                    : currentStep === 'profile'
                      ? 'Initialize Profile'
                      : 'Continue'
                }
                {!isSavingEnv && <ArrowRight size={16} strokeWidth={2.5} className="!text-[#09090b]" />}
              </button>
            </div>
          </>
        )}
      </motion.div>

      {/* Progress dots */}
      {!isAutoDetecting && (
        <div className="mt-8 flex gap-2">
          {steps.map((step, index) => (
            <div
              key={step}
              className={`h-2 w-16 rounded-full transition-all ${index <= currentStepIndex ? 'bg-white' : 'bg-zinc-800'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
