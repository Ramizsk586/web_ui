import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight, ArrowLeft, MessageCircle, PlugZap, Database, Check, SkipForward } from 'lucide-react';

interface UserProfile {
  name: string;
  age: number;
  avatar: string;
  dob: string;
  location: string;
}

interface OnboardingModalProps {
  onComplete: (profile: UserProfile) => void;
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
    subtitle: 'Optionally add your Composio API key so Lumina can connect external tools later.',
    icon: <PlugZap size={28} className="!text-[#09090b]" />
  },
  convex: {
    title: 'Convex Environment',
    subtitle: 'Paste your existing Convex environment values here. Do not use `npx` setup in this flow.',
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
  return value
    .split(/[\n,]/)
    .map(item => item.trim())
    .filter(Boolean);
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loginName, setLoginName] = useState('');
  const [loginAge, setLoginAge] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramAllowlist, setTelegramAllowlist] = useState('');
  const [composioApiKey, setComposioApiKey] = useState(() => localStorage.getItem('COMPOSIO_API_KEY') || '');
  const [convexDeployment, setConvexDeployment] = useState(() => localStorage.getItem('CONVEX_DEPLOYMENT') || '');
  const [convexUrl, setConvexUrl] = useState(() => localStorage.getItem('VITE_CONVEX_URL') || localStorage.getItem('convex_vite_url') || '');
  const [errorText, setErrorText] = useState('');
  const [isSavingEnv, setIsSavingEnv] = useState(false);

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;
  const canGoBack = currentStepIndex > 0;

  const finishOnboarding = () => {
    const ageNum = parseInt(loginAge, 10);
    onComplete(buildProfile(loginName, ageNum));
  };

  const upsertEnvValue = (content: string, key: string, value: string) => {
    const normalized = content.replace(/\r\n/g, '\n');
    const nextLine = `${key}=${value.replace(/\r?\n/g, '\\n')}`;
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    if (pattern.test(normalized)) {
      return normalized.replace(pattern, nextLine);
    }
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
      if (readRes.ok) {
        const data = await readRes.json();
        content = data.content || '';
      }
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

    if (!writeRes.ok) {
      throw new Error('Failed to write .env.local');
    }
  };

  const saveTelegramConfig = async () => {
    const config: TelegramConfig = {
      botToken: telegramToken.trim(),
      allowlist: parseAllowlist(telegramAllowlist),
      webhookUrl: '',
      isConnected: false
    };
    localStorage.setItem(TELEGRAM_STORAGE_KEY, JSON.stringify(config));
    await writeEnvLocal({
      TELEGRAM_BOT_TOKEN: config.botToken,
      TELEGRAM_ALLOWLIST: config.allowlist.join(',')
    });
  };

  const saveComposioKey = async () => {
    const key = composioApiKey.trim();
    localStorage.setItem('COMPOSIO_API_KEY', key);
    await writeEnvLocal({
      COMPOSIO_API_KEY: key
    });
  };

  const saveConvexConfig = async () => {
    const deployment = convexDeployment.trim();
    const url = convexUrl.trim();
    localStorage.setItem('CONVEX_DEPLOYMENT', deployment);
    localStorage.setItem('VITE_CONVEX_URL', url);
    localStorage.setItem('convex_vite_url', url);
    await writeEnvLocal({
      CONVEX_DEPLOYMENT: deployment,
      VITE_CONVEX_URL: url
    });
  };

  const goNext = async () => {
    setErrorText('');

    if (currentStep === 'profile') {
      if (!loginName.trim()) {
        setErrorText('Please enter a valid name.');
        return;
      }
      const ageNum = parseInt(loginAge, 10);
      if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
        setErrorText('Please enter a valid age (1-120).');
        return;
      }
    }

    try {
      setIsSavingEnv(true);

      if (currentStep === 'telegram') {
        await saveTelegramConfig();
      }

      if (currentStep === 'composio') {
        await saveComposioKey();
      }

      if (currentStep === 'convex') {
        await saveConvexConfig();
        finishOnboarding();
        return;
      }

      setCurrentStepIndex((prev) => prev + 1);
    } catch (error) {
      setErrorText('Could not save setup values to .env.local.');
    } finally {
      setIsSavingEnv(false);
    }
  };

  const handleSkip = async () => {
    setErrorText('');

    try {
      setIsSavingEnv(true);

      if (currentStep === 'telegram') {
        localStorage.setItem(TELEGRAM_STORAGE_KEY, JSON.stringify({
          botToken: '',
          allowlist: [],
          webhookUrl: '',
          isConnected: false
        }));
        await writeEnvLocal({
          TELEGRAM_BOT_TOKEN: '',
          TELEGRAM_ALLOWLIST: ''
        });
      }

      if (currentStep === 'composio') {
        localStorage.setItem('COMPOSIO_API_KEY', '');
        await writeEnvLocal({
          COMPOSIO_API_KEY: ''
        });
      }

      if (currentStep === 'convex') {
        finishOnboarding();
        return;
      }

      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      }
    } catch (error) {
      setErrorText('Could not update .env.local while skipping this step.');
    } finally {
      setIsSavingEnv(false);
    }
  };

  const meta = stepMeta[currentStep];

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
          {currentStep === 'profile' && (
            <>
              <div className="space-y-2">
                <label htmlFor="login-name-input" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest pl-1">
                  Name
                </label>
                <input
                  id="login-name-input"
                  type="text"
                  required
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full h-12 px-4 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-xl text-sm outline-none transition-all focus:ring-4 focus:ring-zinc-800/40 text-white placeholder-zinc-500"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="login-age-input" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest pl-1">
                  Age
                </label>
                <input
                  id="login-age-input"
                  type="number"
                  required
                  min="1"
                  max="120"
                  value={loginAge}
                  onChange={(e) => setLoginAge(e.target.value)}
                  placeholder="Enter your age"
                  className="w-full h-12 px-4 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-xl text-sm outline-none transition-all focus:ring-4 focus:ring-zinc-800/40 text-white placeholder-zinc-500"
                />
              </div>
            </>
          )}

          {currentStep === 'telegram' && (
            <>
              <div className="space-y-2">
                <label htmlFor="telegram-token-input" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest pl-1">
                  Telegram Bot Token
                </label>
                <input
                  id="telegram-token-input"
                  type="password"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="Paste your bot token"
                  className="w-full h-12 px-4 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-xl text-sm outline-none transition-all focus:ring-4 focus:ring-zinc-800/40 text-white placeholder-zinc-500"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="telegram-allowlist-input" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest pl-1">
                  Allowlist User IDs
                </label>
                <textarea
                  id="telegram-allowlist-input"
                  value={telegramAllowlist}
                  onChange={(e) => setTelegramAllowlist(e.target.value)}
                  placeholder="One Telegram user ID per line, or separate with commas"
                  className="w-full min-h-28 px-4 py-3 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-xl text-sm outline-none transition-all focus:ring-4 focus:ring-zinc-800/40 text-white placeholder-zinc-500 resize-none"
                />
                <p className="text-xs text-zinc-500 pl-1">
                  Saved to `.env.local` as `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALLOWLIST`.
                </p>
              </div>
            </>
          )}

          {currentStep === 'composio' && (
            <>
              <div className="space-y-2">
                <label htmlFor="composio-key-input" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest pl-1">
                  Composio API Key
                </label>
                <input
                  id="composio-key-input"
                  type="password"
                  value={composioApiKey}
                  onChange={(e) => setComposioApiKey(e.target.value)}
                  placeholder="Get a key from app.composio.dev"
                  className="w-full h-12 px-4 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-xl text-sm outline-none transition-all focus:ring-4 focus:ring-zinc-800/40 text-white placeholder-zinc-500"
                />
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-emerald-400">
                    <Check size={16} />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-200">You can skip this now and connect Composio later from settings.</p>
                    <p className="text-xs text-zinc-500 mt-1">The key is saved to `.env.local` as `COMPOSIO_API_KEY`. It does not trigger verification yet.</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {currentStep === 'convex' && (
            <>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-sm text-amber-100">Do not use `npx` in this setup panel.</p>
                <p className="text-xs text-amber-200/70 mt-1">
                  Create or manage your Convex project outside this onboarding flow, then paste the environment values here into `.env.local`.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="convex-deployment-input" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest pl-1">
                  Convex Deployment
                </label>
                <input
                  id="convex-deployment-input"
                  type="text"
                  value={convexDeployment}
                  onChange={(e) => setConvexDeployment(e.target.value)}
                  placeholder="e.g. bright-forest-123"
                  className="w-full h-12 px-4 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-xl text-sm outline-none transition-all focus:ring-4 focus:ring-zinc-800/40 text-white placeholder-zinc-500"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="convex-url-input" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest pl-1">
                  VITE_CONVEX_URL
                </label>
                <input
                  id="convex-url-input"
                  type="text"
                  value={convexUrl}
                  onChange={(e) => setConvexUrl(e.target.value)}
                  placeholder="https://your-project.convex.cloud"
                  className="w-full h-12 px-4 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-xl text-sm outline-none transition-all focus:ring-4 focus:ring-zinc-800/40 text-white placeholder-zinc-500"
                />
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-xs text-zinc-400 space-y-1">
                <p>We will save these values to:</p>
                <p><code>CONVEX_DEPLOYMENT</code></p>
                <p><code>VITE_CONVEX_URL</code></p>
                <p><code>convex_vite_url</code></p>
              </div>
            </>
          )}

          {errorText && (
            <div className="text-xs text-rose-500 font-medium pl-1 animate-pulse">
              {errorText}
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <div className="flex gap-3">
            {canGoBack && (
              <button
                type="button"
                onClick={() => {
                  setErrorText('');
                  setCurrentStepIndex((prev) => prev - 1);
                }}
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
                Skip
              </button>
            )}
          </div>

          <button
            id="login-submit-button"
            type="button"
            onClick={goNext}
            disabled={isSavingEnv}
            className="min-w-44 h-12 px-6 !bg-[#ffffff] !text-[#09090b] hover:!bg-[#e4e4e7] active:scale-[0.98] transition-all rounded-xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(255,255,255,0.08)]"
          >
            {isSavingEnv ? 'Saving...' : isLastStep ? 'Finish Setup' : currentStep === 'profile' ? 'Initialize Profile' : 'Continue'}
            <ArrowRight size={16} strokeWidth={2.5} className="!text-[#09090b]" />
          </button>
        </div>
      </motion.div>

      {/* Progress indicators outside the modal */}
      <div className="mt-8 flex gap-2">
        {steps.map((step, index) => (
          <div
            key={step}
            className={`h-2 w-16 rounded-full transition-all ${index <= currentStepIndex ? 'bg-white' : 'bg-zinc-800'}`}
          />
        ))}
      </div>
    </div>
  );
}
