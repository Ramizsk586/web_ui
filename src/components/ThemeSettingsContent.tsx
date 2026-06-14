import React from 'react';
import { motion } from 'motion/react';
import { useTheme } from '../themes';
import { 
  Palette, 
  Check, 
  RefreshCw, 
  Type, 
  Sliders, 
  Layers 
} from 'lucide-react';
import type { ThemeColors } from '../themes/types';

const FONTS = [
  { id: '"Inter", sans-serif', name: 'Inter Sans', desc: 'Sleek, highly legible, modern feel' },
  { id: "'Playfair Display', Georgia, serif", name: 'Playfair Serif', desc: 'Elegant, distinguished, intellectual feel' },
  { id: "'JetBrains Mono', monospace", name: 'JetBrains Mono', desc: 'Technical, clean, precise engineering vibes' },
  { id: '"Outfit", sans-serif', name: 'Outfit Display', desc: 'Futuristic, bold geometric styling' }
];

const RADIUSES = [
  { id: '0px', name: 'Sharp (0px)', desc: 'Brutalist cyber look' },
  { id: '6px', name: 'Compact (6px)', desc: 'Professional tech-client look' },
  { id: '12px', name: 'Sleek (12px)', desc: 'Modern balanced look' },
  { id: '20px', name: 'Pill (20px)', desc: 'Playful organic look' }
];

const COLOR_KEYS: { key: keyof ThemeColors; label: string; desc: string }[] = [
  { key: 'accent', label: 'Accent Highlight', desc: 'Buttons, borders & visual cues' },
  { key: 'background', label: 'Base Canvas', desc: 'Outer body background' },
  { key: 'surface', label: 'Primary Surface', desc: 'Central workspace & primary panels' },
  { key: 'sidebar', label: 'Navigation Panel', desc: 'Sidebar background' },
  { key: 'primary', label: 'Primary Text', desc: 'Headers & important text elements' },
  { key: 'border', label: 'Dividers & Borders', desc: 'Separating lines with low structural weight' }
];

interface ThemeSettingsContentProps {
  compact?: boolean;
}

export function ThemeSettingsContent({ compact = false }: ThemeSettingsContentProps) {
  const { 
    theme, 
    setTheme, 
    themes, 
    setThemeColor, 
    setFontFamily, 
    setBorderRadius
  } = useTheme();

  const handleReset = () => {
    localStorage.removeItem('lumina-custom-colors');
    localStorage.removeItem('lumina-custom-font');
    localStorage.removeItem('lumina-custom-radius');
    setTheme('claude');
    window.location.reload();
  };

  const activeThemeId = theme.id;

  if (compact) {
    // Compact grid layout for settings panel
    return (
      <div className="space-y-6">
        {/* Preset Themes Grid */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-[var(--theme-accent)]" />
            <h3 className="text-xs font-bold tracking-wider uppercase text-[var(--theme-secondary)]">
              Preset Themes
            </h3>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {themes.map((t) => {
              const isActive = activeThemeId === t.id;
              return (
                <motion.button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`text-left p-3 rounded-xl border transition-all relative flex flex-col gap-2 cursor-pointer ${
                    isActive 
                      ? 'bg-[var(--theme-accent)]/10 border-[var(--theme-accent)] ring-1 ring-[var(--theme-accent)]/30' 
                      : 'bg-[var(--theme-surface-alt)] border-[var(--theme-border)] hover:border-[var(--theme-accent)]/40'
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[var(--theme-accent)] text-white flex items-center justify-center">
                      <Check size={10} strokeWidth={3} />
                    </div>
                  )}
                  <div className="text-xs font-bold font-display">{t.name}</div>
                  <div className="text-[9px] text-[var(--theme-muted)] leading-tight">
                    {t.description}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-2.5 h-2.5 rounded-full border border-white/10" style={{ backgroundColor: t.colors.background }} />
                    <span className="w-2.5 h-2.5 rounded-full border border-white/10" style={{ backgroundColor: t.colors.surface }} />
                    <span className="w-2.5 h-2.5 rounded-full border border-white/10" style={{ backgroundColor: t.colors.sidebar }} />
                    <span className="w-2.5 h-2.5 rounded-full border border-white/10" style={{ backgroundColor: t.colors.accent }} />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Custom Colors */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders size={14} className="text-[var(--theme-accent)]" />
              <h3 className="text-xs font-bold tracking-wider uppercase text-[var(--theme-secondary)]">
                Custom Colors
              </h3>
            </div>
            <span className="text-[9px] font-mono bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] px-1.5 py-0.5 rounded-full uppercase">
              {activeThemeId === 'custom' ? 'Custom' : 'Preset'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {COLOR_KEYS.map(({ key, label }) => {
              const currentColor = theme.colors[key];
              return (
                <div key={key} className="flex items-center justify-between p-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-alt)]">
                  <span className="text-[10px] font-medium text-[var(--theme-primary)] truncate pr-2">{label}</span>
                  <div className="w-5 h-5 rounded-md relative overflow-hidden border border-white/10 shrink-0">
                    <input
                      type="color"
                      value={currentColor}
                      onChange={(e) => setThemeColor(key, e.target.value)}
                      className="absolute -inset-2 w-10 h-10 cursor-pointer p-0 border-none outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Typography */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Type size={14} className="text-[var(--theme-accent)]" />
            <h3 className="text-xs font-bold tracking-wider uppercase text-[var(--theme-secondary)]">
              Display Font
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {FONTS.map((font) => {
              const activeFont = theme.font || '"Outfit", sans-serif';
              const isSelected = activeFont === font.id;
              return (
                <motion.button
                  key={font.id}
                  onClick={() => setFontFamily(font.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-[var(--theme-accent)]/10 border-[var(--theme-accent)]' 
                      : 'bg-[var(--theme-surface-alt)] border-[var(--theme-border)] hover:border-[var(--theme-accent)]/40'
                  }`}
                >
                  <span className="text-[11px] font-bold block" style={{ fontFamily: font.id }}>
                    {font.name}
                  </span>
                  <span className="text-[9px] text-[var(--theme-muted)]">{font.desc}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Corner Radius */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Palette size={14} className="text-[var(--theme-accent)]" />
            <h3 className="text-xs font-bold tracking-wider uppercase text-[var(--theme-secondary)]">
              Corner Radius
            </h3>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {RADIUSES.map((radius) => {
              const activeRadius = theme.radius || '12px';
              const isSelected = activeRadius === radius.id;
              return (
                <motion.button
                  key={radius.id}
                  onClick={() => setBorderRadius(radius.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`text-center p-2 rounded-lg border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-[var(--theme-accent)]/10 border-[var(--theme-accent)]' 
                      : 'bg-[var(--theme-surface-alt)] border-[var(--theme-border)] hover:border-[var(--theme-accent)]/40'
                  }`}
                >
                  <span className="text-[10px] font-bold block">{radius.name.split(' ')[0]}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-2 text-[10px] text-red-400 hover:text-red-300 font-mono font-bold transition-all uppercase cursor-pointer py-2 px-3 rounded-lg border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10"
        >
          <RefreshCw size={11} />
          Reset Defaults
        </button>
      </div>
    );
  }

  // Full standalone version (for drawer)
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-[var(--theme-border)] flex items-center justify-between shrink-0 bg-[var(--theme-header-bg)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--theme-accent-dim)] text-[var(--theme-accent)] flex items-center justify-center border border-[var(--theme-accent)]/20 shadow-xs">
            <Palette size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-[var(--theme-primary)] font-display uppercase">
              Theme Studio
            </h2>
            <p className="text-[10px] text-[var(--theme-muted)] leading-none font-mono">
              Engine version 1.1b
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-7 custom-scrollbar select-none">
        {/* Presets */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-[var(--theme-accent)]" />
            <h3 className="text-xs font-bold tracking-wider uppercase text-[var(--theme-secondary)]">
              Preset Themes
            </h3>
          </div>
          
          <p className="text-[11px] text-[var(--theme-muted)] leading-normal">
            Swap visual presets instantly to redefine the vibe, color accentuation, and editorial formatting.
          </p>

          <div className="grid grid-cols-1 gap-2">
            {themes.map((t) => {
              const isActive = activeThemeId === t.id;
              return (
                <motion.button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full text-left p-3 rounded-xl border transition-all relative flex flex-col gap-2 cursor-pointer ${
                    isActive 
                      ? 'bg-[var(--theme-accent)]/5 border-[var(--theme-accent)]' 
                      : 'bg-[var(--theme-surface-alt)] border-[var(--theme-border)] hover:border-[var(--theme-accent)]/40 hover:bg-[var(--theme-hover-bg)]'
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-[var(--theme-accent)] text-[var(--theme-accent-foreground)] flex items-center justify-center">
                      <Check size={10} strokeWidth={3} />
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold font-display tracking-wide">{t.name}</div>
                    <div className="text-[10px] text-[var(--theme-muted)] leading-tight mt-0.5 max-w-[280px]">
                      {t.description}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] font-mono uppercase text-[var(--theme-muted)] mr-1">Palette</span>
                    <span className="w-3.5 h-3.5 rounded-full border border-white/5 shadow-sm shrink-0" style={{ backgroundColor: t.colors.background }} />
                    <span className="w-3.5 h-3.5 rounded-full border border-white/5 shadow-sm shrink-0" style={{ backgroundColor: t.colors.surface }} />
                    <span className="w-3.5 h-3.5 rounded-full border border-white/5 shadow-sm shrink-0" style={{ backgroundColor: t.colors.sidebar }} />
                    <span className="w-3.5 h-3.5 rounded-full border border-white/5 shadow-sm shrink-0" style={{ backgroundColor: t.colors.accent }} />
                    <span className="w-3.5 h-3.5 rounded-full border border-white/5 shadow-sm shrink-0" style={{ backgroundColor: t.colors.primary }} />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Custom Colors */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders size={14} className="text-[var(--theme-accent)]" />
              <h3 className="text-xs font-bold tracking-wider uppercase text-[var(--theme-secondary)]">
                Custom Modifiers
              </h3>
            </div>
            <span className="text-[9px] font-mono bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] px-1.5 py-0.5 rounded-full uppercase">
              Active: {activeThemeId === 'custom' ? 'Custom' : 'Preset'}
            </span>
          </div>

          <p className="text-[11px] text-[var(--theme-muted)] leading-normal">
            Refining any setting automatically selects the <span className="font-semibold text-[var(--theme-primary)]">Custom Creator</span> palette.
          </p>

          <div className="space-y-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-alt)] p-4">
            {COLOR_KEYS.map(({ key, label, desc }) => {
              const currentColor = theme.colors[key];
              return (
                <div key={key} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-[var(--theme-primary)]">{label}</span>
                      <span className="block text-[10px] text-[var(--theme-muted)] leading-none mt-0.5">{desc}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-lg p-1 min-w-[90px] justify-between">
                      <span className="text-[10px] font-mono uppercase font-semibold text-[var(--theme-secondary)] pl-1.5">
                        {currentColor}
                      </span>
                      <div className="w-5 h-5 rounded-md relative overflow-hidden border border-white/10 shrink-0 shadow-xs cursor-pointer">
                        <input
                          type="color"
                          value={currentColor}
                          onChange={(e) => setThemeColor(key, e.target.value)}
                          className="absolute -inset-2 w-10 h-10 cursor-pointer p-0 border-none outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Typography */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Type size={14} className="text-[var(--theme-accent)]" />
            <h3 className="text-xs font-bold tracking-wider uppercase text-[var(--theme-secondary)]">
              Display Font Family
            </h3>
          </div>

          <p className="text-[11px] text-[var(--theme-muted)] leading-normal">
            Change the display typeface for headings, workspace titles, and dashboard controls.
          </p>

          <div className="grid grid-cols-1 gap-2">
            {FONTS.map((font) => {
              const activeFont = theme.font || '"Outfit", sans-serif';
              const isSelected = activeFont === font.id;
              return (
                <motion.button
                  key={font.id}
                  onClick={() => setFontFamily(font.id)}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-0.5 cursor-pointer ${
                    isSelected 
                      ? 'bg-[var(--theme-accent)]/5 border-[var(--theme-accent)]' 
                      : 'bg-[var(--theme-surface-alt)] border-[var(--theme-border)] hover:border-[var(--theme-accent)]/40 hover:bg-[var(--theme-hover-bg)]'
                  }`}
                >
                  <span className="text-xs font-bold" style={{ fontFamily: font.id }}>{font.name}</span>
                  <span className="text-[10px] text-[var(--theme-muted)]">{font.desc}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Corner Radius */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Palette size={14} className="text-[var(--theme-accent)]" />
            <h3 className="text-xs font-bold tracking-wider uppercase text-[var(--theme-secondary)]">
              Corner Rounding (Radius)
            </h3>
          </div>

          <p className="text-[11px] text-[var(--theme-muted)] leading-normal">
            Fine-tune the rounding intensity across buttons, chat bubbles, workspace blocks, and popup windows.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {RADIUSES.map((radius) => {
              const activeRadius = theme.radius || '12px';
              const isSelected = activeRadius === radius.id;
              return (
                <motion.button
                  key={radius.id}
                  onClick={() => setBorderRadius(radius.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  className={`text-left p-2.5 rounded-xl border transition-all flex flex-col gap-0.5 cursor-pointer ${
                    isSelected 
                      ? 'bg-[var(--theme-accent)]/5 border-[var(--theme-accent)]' 
                      : 'bg-[var(--theme-surface-alt)] border-[var(--theme-border)] hover:border-[var(--theme-accent)]/40 hover:bg-[var(--theme-hover-bg)]'
                  }`}
                >
                  <span className="text-xs font-bold">{radius.name}</span>
                  <span className="text-[9px] text-[var(--theme-muted)]">{radius.desc}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-[var(--theme-border)] bg-[var(--theme-surface-alt)] shrink-0 flex items-center justify-between">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 text-[10px] text-red-400 hover:text-red-300 font-mono font-bold transition-all uppercase cursor-pointer py-1.5 px-3 rounded-lg border border-red-500/10 hover:border-red-500/30 hover:bg-red-500/5"
        >
          <RefreshCw size={11} />
          Reset Defaults
        </button>
        <span className="text-[10px] text-[var(--theme-muted)] font-mono">Ctrl+Z to Undo</span>
      </div>
    </div>
  );
}