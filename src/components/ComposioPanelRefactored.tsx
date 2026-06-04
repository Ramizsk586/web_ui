import React from 'react';
import { motion } from 'motion/react';
import { Server } from 'lucide-react';

const TOOLKIT_TOOL_COUNTS: Record<string, number> = {
  gmail: 43,
  googlesheets: 36,
  googlecalendar: 32,
  slack: 38,
  github: 65,
  notion: 28,
  trello: 24,
  discord: 20,
  clickup: 45,
  asana: 32,
  jira: 40,
  hubspot: 35,
  salesforce: 50,
  zoom: 15,
};

const renderBrandLogo = (slug: string) => {
  const normalized = slug.toLowerCase();
  
  if (normalized.includes('gmail')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-red-500/10 dark:bg-rose-500/10 flex items-center justify-center shrink-0 border border-red-500/20 dark:border-rose-500/10">
        <span className="text-xl">📧</span>
      </div>
    );
  }
  if (normalized.includes('googlesheets') || normalized.includes('sheet')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20 dark:border-emerald-555/10">
        <span className="text-xl">📊</span>
      </div>
    );
  }
  if (normalized.includes('googlecalendar') || normalized.includes('calendar')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20 dark:border-blue-555/10">
        <span className="text-xl">📅</span>
      </div>
    );
  }
  if (normalized.includes('slack')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/20 dark:border-purple-555/10">
        <span className="text-xl">💬</span>
      </div>
    );
  }
  if (normalized.includes('github')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-zinc-800/10 dark:bg-zinc-100/10 flex items-center justify-center shrink-0 border border-zinc-500/20">
        <span className="text-xl">🐙</span>
      </div>
    );
  }
  if (normalized.includes('notion')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-zinc-650/10 dark:bg-zinc-200/5 flex items-center justify-center shrink-0 border border-zinc-500/20">
        <span className="text-xl">📓</span>
      </div>
    );
  }
  if (normalized.includes('trello')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0 border border-sky-500/20 dark:border-sky-555/10">
        <span className="text-xl">📋</span>
      </div>
    );
  }
  if (normalized.includes('discord')) {
    return (
      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 dark:border-indigo-555/10">
        <span className="text-xl">🎮</span>
      </div>
    );
  }

  // Fallback icon for any other integration
  return (
    <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-zinc-800/60 flex items-center justify-center shrink-0 border border-blue-500/10 dark:border-zinc-700/50">
      <span className="text-xl">🛠️</span>
    </div>
  );
};

export function ComposioPanelRefactored() {
  const [apiKey, setApiKey] = React.useState(() => localStorage.getItem('COMPOSIO_API_KEY') || '');
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isEnabled, setIsEnabled] = React.useState(false);
  const [toolkits, setToolkits] = React.useState<any[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [verifyError, setVerifyError] = React.useState<string | null>(null);
  const authPollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const [showKeyForm, setShowKeyForm] = React.useState(false);

  // Expanded Tools Drawer States
  const [expandedToolsSlug, setExpandedToolsSlug] = React.useState<string | null>(null);
  const [expandedToolsList, setExpandedToolsList] = React.useState<any[]>([]);
  const [loadingTools, setLoadingTools] = React.useState(false);

  React.useEffect(() => () => { if (authPollRef.current) clearInterval(authPollRef.current); }, []);

  const saveKey = (val: string) => {
    setApiKey(val);
    setVerifyError(null);
    localStorage.setItem('COMPOSIO_API_KEY', val);
  };

  const verifyKey = async () => {
    if (!apiKey) return;
    setIsVerifying(true);
    setVerifyError(null);
    try {
      const r = await fetch('/api/composio/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const data = await r.json();
      if (data.enabled) {
        setIsEnabled(true);
        fetchToolkits();
      } else {
        setIsEnabled(false);
        setVerifyError(data.error || 'Invalid API key');
      }
    } catch (err) {
      setVerifyError('Failed to connect to server');
      setIsEnabled(false);
    }
    setIsVerifying(false);
  };

  const fetchToolkits = React.useCallback(async () => {
    try {
      const r = await fetch('/api/composio/toolkits');
      const data = await r.json();
      setToolkits(data.toolkits || []);
    } catch {}
    setLoaded(true);
  }, []);

  const connect = async (slug: string) => {
    setBusy(slug);
    try {
      const r = await fetch(`/api/composio/toolkits/${slug}/authorize`, { method: 'POST' });
      if (!r.ok) { setBusy(null); return; }
      const { redirectUrl } = await r.json();
      if (!redirectUrl) { setBusy(null); return; }
      const w = 600, h = 700;
      const left = window.screenX + (window.outerWidth - w) / 2;
      const top = window.screenY + (window.outerHeight - h) / 2;
      const popup = window.open(redirectUrl, 'composio-auth', `width=${w},height=${h},left=${left},top=${top}`);
      if (authPollRef.current) clearInterval(authPollRef.current);
      authPollRef.current = setInterval(async () => {
        if (!popup || popup.closed) {
          if (authPollRef.current) { clearInterval(authPollRef.current); authPollRef.current = null; }
          await fetch('/api/composio/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey }),
          });
          await fetchToolkits();
          setBusy(null);
        }
      }, 800);
    } catch { setBusy(null); }
  };

  const disconnect = async (slug: string, connectionId: string) => {
    setBusy(`${slug}:${connectionId}`);
    try {
      await fetch(`/api/composio/toolkits/${slug}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });
      await fetchToolkits();
    } catch {}
    setBusy(null);
  };

  const toggleShowTools = async (slug: string) => {
    if (expandedToolsSlug === slug) {
      setExpandedToolsSlug(null);
      setExpandedToolsList([]);
      return;
    }
    setExpandedToolsSlug(slug);
    setLoadingTools(true);
    try {
      const r = await fetch(`/api/composio/toolkit-tools/${slug}`);
      if (r.ok) {
        const data = await r.json();
        setExpandedToolsList(data.tools || []);
      } else {
        setExpandedToolsList([]);
      }
    } catch {
      setExpandedToolsList([]);
    } finally {
      setLoadingTools(false);
    }
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-emerald-500',
      INITIATED: 'bg-amber-500',
      INITIALIZING: 'bg-amber-500',
      EXPIRED: 'bg-rose-500',
      FAILED: 'bg-rose-500',
    };
    return colors[status] || 'bg-zinc-500';
  };

  // Auto verify if key is stored
  React.useEffect(() => {
    if (apiKey) {
      verifyKey();
    }
  }, []);

  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 text-left font-sans">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            COMPOSIO TOOLKITS
            <span className="text-xs font-semibold bg-blue-500/10 text-blue-600 dark:bg-sky-400/10 dark:text-sky-300 px-2 py-0.5 rounded-full">
              {toolkits.filter(t => t.connections.some((c: any) => c.status === 'ACTIVE')).length}
            </span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            <strong>READY TO CONNECT</strong> Composio-managed OAuth — click Connect
          </p>
        </div>
        <button
          onClick={() => setShowKeyForm(!showKeyForm)}
          className="self-start md:self-center px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer bg-white dark:bg-zinc-900/40"
        >
          <svg className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{showKeyForm ? 'Hide API Key' : 'Configure API Key'}</span>
        </button>
      </div>

      {(!isEnabled || showKeyForm) && (
        <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <Server size={16} className="text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 font-sans">Composio API Key Configuration</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-sans">COMPOSIO_API_KEY</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => saveKey(e.target.value)}
                placeholder="Get a key at app.composio.dev/developers"
                className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 dark:focus:border-zinc-600 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 font-mono"
              />
              <button
                onClick={verifyKey}
                disabled={isVerifying || !apiKey}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                {isVerifying ? 'Verifying...' : 'Verify'}
              </button>
            </div>
            <span className="text-[10px] text-zinc-500 font-sans">
              Get your API key at{' '}
              <a href="https://app.composio.dev/developers" target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-sky-400 dark:hover:text-sky-300 underline transition-colors">
                app.composio.dev/developers
              </a>
            </span>
            {verifyError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <span className="text-xs text-rose-500 dark:text-rose-400 font-sans">{verifyError}</span>
              </div>
            )}
            {isEnabled && !verifyError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-sans">API key verified successfully</span>
              </div>
            )}
          </div>
        </div>
      )}

      {isEnabled && (
        <div className="space-y-4">
          {!loaded ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 animate-pulse" />
              ))}
            </div>
          ) : toolkits.length > 0 ? (
            <div className="grid gap-3">
              {toolkits.map((t: any) => {
                const activeConnections = t.connections.filter((c: any) => c.status === 'ACTIVE');
                const hasActive = activeConnections.length > 0;
                const toolsCount = TOOLKIT_TOOL_COUNTS[t.slug] || 30;
                const isExpanded = expandedToolsSlug === t.slug;

                return (
                  <div key={t.slug} className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        {renderBrandLogo(t.slug)}
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 font-sans">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">{t.displayName}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono font-medium">{t.slug}</span>
                            <button
                              onClick={() => toggleShowTools(t.slug)}
                              className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 dark:text-sky-400 dark:hover:text-sky-300 underline underline-offset-2 transition-colors cursor-pointer"
                            >
                              {isExpanded ? 'Hide tools' : `Show ${toolsCount} tools`}
                            </button>
                          </div>
                        </div>
                      </div>

                      {!hasActive && (
                        <button
                          onClick={() => connect(t.slug)}
                          disabled={busy === t.slug}
                          className="shrink-0 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-sm transition-colors cursor-pointer"
                        >
                          {busy === t.slug ? 'Connecting...' : 'Connect'}
                        </button>
                      )}
                    </div>

                    <div className="mt-2 text-left font-sans">
                      {t.connections.length > 0 ? (
                        <div className="space-y-2 mt-3 pl-9.5">
                          {t.connections.map((c: any) => (
                            <div key={c.id} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-150 dark:border-zinc-800">
                              <span className={`w-2 h-2 rounded-full ${statusColor(c.status)} shrink-0`} />
                              <span className="text-xs text-zinc-700 dark:text-zinc-300 font-semibold truncate max-w-[15rem] text-left">
                                {c.alias || c.accountLabel || c.accountEmail || `Account`}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                                c.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                c.status === 'EXPIRED' || c.status === 'FAILED' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-450' :
                                'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              }`}>
                                {c.status}
                              </span>
                              <div className="flex-1" />
                              <div className="flex items-center gap-3 shrink-0">
                                <button
                                  onClick={async () => {
                                    const alias = prompt('Enter a new alias/name for this connection:', c.alias || '');
                                    if (alias !== null) {
                                      setBusy(c.id);
                                      try {
                                        await fetch(`/api/composio/connections/${c.id}/rename`, {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ alias }),
                                        });
                                        await fetchToolkits();
                                      } catch {}
                                      setBusy(null);
                                    }
                                  }}
                                  disabled={busy === c.id}
                                  className="text-[11px] font-semibold text-zinc-500 hover:text-blue-500 underline transition-colors cursor-pointer"
                                >
                                  Rename
                                </button>
                                <button
                                  onClick={() => disconnect(t.slug, c.id)}
                                  disabled={busy === `${t.slug}:${c.id}`}
                                  className="px-3 py-1.5 text-[11px] font-semibold text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                                >
                                  {busy === `${t.slug}:${c.id}` ? '...' : 'Disconnect'}
                                </button>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => connect(t.slug)}
                            disabled={busy === t.slug}
                            className="text-xs font-semibold text-zinc-500 hover:text-[#0284c7] transition-colors cursor-pointer flex items-center gap-1 mt-1.5"
                          >
                            + Add another account
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-400 dark:text-zinc-500 pl-9.5 mt-0.5">
                          Not connected
                        </div>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pl-9.5 text-left transition-all font-sans">
                        <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl p-4.5 space-y-3 max-h-72 overflow-y-auto custom-scrollbar">
                          <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Available Actions</h4>
                          {loadingTools ? (
                            <div className="flex items-center gap-2 py-4 justify-center text-xs text-zinc-500">
                              <svg className="animate-spin h-3.5 w-3.5 text-blue-500" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              <span>Loading tools from Composio...</span>
                            </div>
                          ) : expandedToolsList.length > 0 ? (
                            <div className="grid gap-2">
                              {expandedToolsList.map((tool: any, idx: number) => (
                                <div key={idx} className="border border-zinc-150 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg p-2.5 flex flex-col gap-1">
                                  <span className="text-[11px] font-bold text-blue-600 dark:text-sky-450 font-mono">{tool.name}</span>
                                  <span className="text-xs text-zinc-650 dark:text-zinc-400 font-medium leading-relaxed">{tool.description}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-500 italic block py-2">No tools connected. Secure connection to Composio established.</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No toolkits found. Make sure COMPOSIO_API_KEY is set in the server environment.</p>
          )}
        </div>
      )}
    </motion.div>
  );
}
