import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
  onComplete: (profile: { name: string; age: number; avatar: string; dob: string; location: string }) => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [loginName, setLoginName] = useState('');
  const [loginAge, setLoginAge] = useState('');
  const [errorText, setErrorText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginName.trim()) {
      setErrorText('Please enter a valid name.');
      return;
    }
    const ageNum = parseInt(loginAge);
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      setErrorText('Please enter a valid age (1-120).');
      return;
    }

    const updatedProfile = {
      name: loginName.trim(),
      age: ageNum,
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(loginName.trim())}`,
      dob: '',
      location: 'Local Workspace'
    };

    onComplete(updatedProfile);
  };

  return (
    <div id="login-page-container" className="flex flex-col items-center justify-center min-h-screen bg-[#060608] text-white p-6 relative overflow-hidden font-sans select-none w-full">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

      {/* Floating particles background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10%" cy="20%" r="2" fill="#3b82f6" className="animate-pulse" style={{ animationDuration: '3s' }} />
          <circle cx="85%" cy="15%" r="1.5" fill="#a855f7" className="animate-pulse" style={{ animationDuration: '4s' }} />
          <circle cx="75%" cy="80%" r="2" fill="#3b82f6" className="animate-pulse" style={{ animationDuration: '5s' }} />
          <circle cx="20%" cy="75%" r="1" fill="#c084fc" className="animate-pulse" style={{ animationDuration: '3s' }} />
        </svg>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-zinc-900/60 backdrop-blur-2xl border border-zinc-800/80 rounded-3xl p-8 shadow-2xl relative z-10 flex flex-col items-center text-center"
      >
        {/* Logo */}
        <div className="w-14 h-14 rounded-2xl !bg-[#ffffff] !text-[#09090b] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.15)]">
          <Sparkles size={28} className="!text-[#09090b]" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-white mb-2 font-sans select-none">
          Welcome to Lumina
        </h1>
        <p className="text-sm text-zinc-400 mb-8 font-sans select-none max-w-xs">
          Create your profile to initialize your persistent AI workspace.
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-5 text-left">
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

          {errorText && (
            <div className="text-xs text-rose-500 font-medium pl-1 animate-pulse">
              {errorText}
            </div>
          )}

          <button
            id="login-submit-button"
            type="submit"
            className="w-full h-12 mt-4 !bg-[#ffffff] !text-[#09090b] hover:!bg-[#e4e4e7] active:scale-[0.98] transition-all rounded-xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(255,255,255,0.08)]"
          >
            Initialize Profile
            <ArrowRight size={16} strokeWidth={2.5} className="!text-[#09090b]" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
