import React from 'react';
import { motion } from 'motion/react';
import { X, Code, Sparkles, Server, Key, Brain } from 'lucide-react';

interface RoleConfig {
  provider: string;
  key: string;
  endpoint: string;
  model: string;
}

interface CoderSettingsPanelProps {
  agentApiKeys: {
    planner: RoleConfig;
    coder: RoleConfig;
    linter: RoleConfig;
    fallback: RoleConfig;
  };
  setAgentApiKeys: (updated: any) => void;
  onClose: () => void;
}

export const CoderSettingsPanel: React.FC<CoderSettingsPanelProps> = ({
  agentApiKeys,
  setAgentApiKeys,
  onClose,
}) => {
  const roles = [
    { key: 'planner', label: 'Planner Role (Evaluation & Roadmap)', desc: 'Responsible for evaluating prompts, formulating plans, and designing the software roadmap' },
    { key: 'coder', label: 'Coder Role (File Writes & Code Edits)', desc: 'Responsible for generating clean, modular code components and running surgical text replaces' },
    { key: 'linter', label: 'Linter Role (Syntax & Types verifier)', desc: 'Responsible for checking compilation logs, syntax validity, and verifying strict TS code health' },
    { key: 'fallback', label: 'Fallback Role (Recovery & Healing)', desc: 'Alternative recovery engine triggered on syntax failures to restore the workspace to compile-safe state' }
  ];

  const handleProviderChange = (roleKey: string, provider: string) => {
    const current = agentApiKeys[roleKey as keyof typeof agentApiKeys] || { provider: 'gemini', model: '', key: '', endpoint: '' };
    const updated = {
      ...agentApiKeys,
      [roleKey]: { ...current, provider }
    };
    setAgentApiKeys(updated);
    localStorage.setItem('lumina_agent_apikeys', JSON.stringify(updated));
  };

  const handleFieldChange = (roleKey: string, field: 'model' | 'key' | 'endpoint', value: string) => {
    const current = agentApiKeys[roleKey as keyof typeof agentApiKeys] || { provider: 'gemini', model: '', key: '', endpoint: '' };
    const updated = {
      ...agentApiKeys,
      [roleKey]: { ...current, [field]: value }
    };
    setAgentApiKeys(updated);
    localStorage.setItem('lumina_agent_apikeys', JSON.stringify(updated));
  };

  return (
    <motion.div
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      className="w-full md:w-[400px] border-l border-[#e8dfc7] dark:border-[#35332f] bg-[#FAF9F5] dark:bg-[#1d1c1a] h-full flex flex-col shrink-0 overflow-hidden shadow-2xl z-50 transition-colors duration-300"
    >
      {/* Header */}
      <div className="p-5 border-b border-[#ebdcb9]/60 dark:border-[#2d2c29] flex items-center justify-between bg-[#f4f2eb] dark:bg-[#181716]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#d97756]/15 dark:bg-[#d97756]/10 rounded-lg">
            <Code size={16} className="text-[#d97756]" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-[#191919] dark:text-white uppercase tracking-wider">AI Agent Hub Panel</h3>
            <p className="text-[10px] text-[#8a8170] dark:text-[#a5a29a] font-medium font-sans">Configure pipeline orchestrator models</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-[#ebdcb9]/40 dark:hover:bg-[#2d2c29] rounded-lg text-[#827d73] dark:text-[#9e9b95] hover:text-[#191919] dark:hover:text-white transition-colors cursor-pointer"
        >
          <X size={15} />
        </button>
      </div>

      {/* Body scroll */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        <p className="text-xs text-[#7c7365] dark:text-[#acaba4] leading-relaxed">
          Define unique model configurations for each pipeline role to balance precision and performance.
        </p>

        <div className="space-y-5">
          {roles.map((role) => {
            const conf = agentApiKeys[role.key as keyof typeof agentApiKeys] || { provider: 'gemini', model: '', key: '', endpoint: '' };
            return (
              <div 
                key={role.key} 
                className="p-4 rounded-xl border border-[#ebdcb9]/60 dark:border-[#2a2926] bg-[#fdfdfc] dark:bg-[#151413] shadow-xs space-y-4"
              >
                <div>
                  <h4 className="text-[11px] font-extrabold text-[#8f6244] dark:text-[#df9e7e] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Sparkles size={12} className="text-[#d97756]" />
                    <span>{role.label}</span>
                  </h4>
                  <p className="text-[10px] text-[#8a8170] dark:text-[#94918a] leading-normal">{role.desc}</p>
                </div>

                <div className="space-y-3">
                  {/* Provider Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-[#8a8170] dark:text-[#918e88] block uppercase tracking-wider mb-1 font-sans">Provider</label>
                      <select
                        value={conf.provider}
                        onChange={(e) => handleProviderChange(role.key, e.target.value)}
                        className="w-full h-8 px-2.5 bg-[#FAF9F5] dark:bg-[#1f1e1c] border border-[#ebdcb9] dark:border-[#33312e] rounded-lg text-xs outline-none focus:border-[#d97756] font-sans text-[#191919] dark:text-[#e0deda] font-semibold"
                      >
                        <option value="gemini">Google Gemini</option>
                        <option value="deepseek">DeepSeek AI</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic Claude</option>
                        <option value="ollama">Ollama (Local)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-[#8a8170] dark:text-[#918e88] block uppercase tracking-wider mb-1 font-sans">Model Name</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={conf.model}
                          onChange={(e) => handleFieldChange(role.key, 'model', e.target.value)}
                          className="w-full h-8 pl-6.5 pr-2 bg-[#FAF9F5] dark:bg-[#1f1e1c] border border-[#ebdcb9] dark:border-[#33312e] rounded-lg text-xs font-mono text-[#8f6244] dark:text-[#df9e7e] focus:border-[#d97756] outline-none"
                          placeholder="e.g. gemini-2.5-pro"
                        />
                        <Brain size={10} className="absolute left-2.5 top-2.5 text-[#8a8170] dark:text-[#807b71]" />
                      </div>
                    </div>
                  </div>

                  {/* Secrets */}
                  <div>
                    <label className="text-[9px] font-bold text-[#8a8170] dark:text-[#918e88] block uppercase tracking-wider mb-1 font-sans">Secrets Authorization Token</label>
                    <div className="relative">
                      <input
                        type="password"
                        value={conf.key}
                        onChange={(e) => handleFieldChange(role.key, 'key', e.target.value)}
                        className="w-full h-8 pl-6.5 pr-2 bg-[#FAF9F5] dark:bg-[#1f1e1c] border border-[#ebdcb9] dark:border-[#33312e] rounded-lg text-xs font-mono text-[#8f6244] dark:text-[#df9e7e] focus:border-[#d97756] outline-none"
                        placeholder="sk-**********************"
                      />
                      <Key size={10} className="absolute left-2.5 top-2.5 text-[#8a8170] dark:text-[#807b71]" />
                    </div>
                  </div>

                  {/* Endpoint */}
                  <div>
                    <label className="text-[9px] font-bold text-[#8a8170] dark:text-[#918e88] block uppercase tracking-wider mb-1 font-sans">Base Routing Endpoint</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={conf.endpoint}
                        onChange={(e) => handleFieldChange(role.key, 'endpoint', e.target.value)}
                        className="w-full h-8 pl-6.5 pr-2 bg-[#FAF9F5] dark:bg-[#1f1e1c] border border-[#ebdcb9] dark:border-[#33312e] rounded-lg text-[10px] font-mono text-[#8f6244] dark:text-[#df9e7e] focus:border-[#d97756] outline-none"
                        placeholder="https://api.example.com"
                      />
                      <Server size={10} className="absolute left-2.5 top-2.5 text-[#8a8170] dark:text-[#807b71]" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
