import React from 'react';
import { motion } from 'motion/react';
import { useTheme } from '../themes';
import { 
  X, 
  Palette, 
  Check, 
  RefreshCw, 
  Type, 
  Sliders, 
  Layers 
} from 'lucide-react';
import type { ThemeColors } from '../themes/types';

interface ThemeCustomizerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

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

export function ThemeCustomizerPanel({ isOpen, onClose }: ThemeCustomizerPanelProps) {
  const { 
    theme, 
    setTheme, 
    themes, 
    setThemeColor, 
    setFontFamily, 
    setBorderRadius,
    customThemeColors,
    customFont,
    customRadius
  } = useTheme();

  // Handle closing when striking Escape or clicking backdrop
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleReset = () => {
    // Clear custom settings
    localStorage.removeItem('lumina-custom-colors');
    localStorage.removeItem('lumina-custom-font');
    localStorage.removeItem('lumina-custom-radius');
    
    // Hard refresh to default theme 'claude'
    setTheme('claude');
    window.location.reload();
  };

  const activeThemeId = theme.id;

  return (
    <>
      {/* Drawer Overlay backdrop */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[180]"
        />
      )}

      {/* Slide-In left panel drawer */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={isOpen ? { x: 0 } : { x: '-100%' }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 180 }}
        className="fixed left-0 top-0 bottom-0 h-full w-full max-w-[400px] border-r bg-[var(--theme-surface)] text-[var(--theme-primary)] border-[var(--theme-border)] shadow-2xl z-[190] flex flex-col pointer-events-auto"
      >
        {/* Custom Header Top Bar */}
        <div className="px-5 py-4 border-b border-[var(--theme-border)] flex items-center justify-between shrink-0 bg-[var(--theme-header-bg)] rounded-tl-xl">
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

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-alt)] hover:bg-[var(--theme-hover-bg)] text-[var(--theme-secondary)] hover:text-[var(--theme-primary)] transition-all cursor-pointer"
            title="Close Panel"
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable controls list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-7 custom-scrollbar select-none">
          
          {/* Section 1: Presets selection */}
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
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all relative flex flex-col gap-2 cursor-pointer ${
                      isActive 
                        ? 'bg-[var(--theme-accent)]/5 border-[var(--theme-accent)]' 
                        : 'bg-[var(--theme-surface-alt)] border-[var(--theme-border)] hover:border-[var(--theme-accent)]/40 hover:bg-[var(--theme-hover-bg)]'
                    }`}
                  >
                    {/* Tick for active preset */}
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

                    {/* Preview palette blobs */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-mono uppercase text-[var(--theme-muted)] mr-1">Palette</span>
                      <span className="w-3.5 h-3.5 rounded-full border border-white/5 shadow-sm shrink-0" style={{ backgroundColor: t.colors.background }} title="Background" />
                      <span className="w-3.5 h-3.5 rounded-full border border-white/5 shadow-sm shrink-0" style={{ backgroundColor: t.colors.surface }} title="Surface" />
                      <span className="w-3.5 h-3.5 rounded-full border border-white/5 shadow-sm shrink-0" style={{ backgroundColor: t.colors.sidebar }} title="Sidebar" />
                      <span className="w-3.5 h-3.5 rounded-full border border-white/5 shadow-sm shrink-0" style={{ backgroundColor: t.colors.accent }} title="Accent highlight" />
                      <span className="w-3.5 h-3.5 rounded-full border border-white/5 shadow-sm shrink-0" style={{ backgroundColor: t.colors.primary }} title="Text primary" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Custom theme color creation */}
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
              Refining any setting automatically selects the <span className="font-semibold text-[var(--theme-primary)]">Custom Creator</span> palette to apply your unique overrides.
            </p>

            <div className="space-y-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-alt)] p-4">
              {COLOR_KEYS.map(({ key, label, desc }) => {
                // Get the current color value being active
                const currentColor = theme.colors[key];
                return (
                  <div key={key} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-medium text-[var(--theme-primary)]">
                          {label}
                        </span>
                        <span className="block text-[10px] text-[var(--theme-muted)] leading-none mt-0.5">
                          {desc}
                        </span>
                      </div>

                      {/* Display value & picker block */}
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
                            title={`Select Color for ${label}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Typography choices */}
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
                  <button
                    key={font.id}
                    onClick={() => setFontFamily(font.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-0.5 cursor-pointer ${
                      isSelected 
                        ? 'bg-[var(--theme-accent)]/5 border-[var(--theme-accent)]' 
                        : 'bg-[var(--theme-surface-alt)] border-[var(--theme-border)] hover:border-[var(--theme-accent)]/40 hover:bg-[var(--theme-hover-bg)]'
                    }`}
                  >
                    <span 
                      className="text-xs font-bold" 
                      style={{ fontFamily: font.id }}
                    >
                      {font.name}
                    </span>
                    <span className="text-[10px] text-[var(--theme-muted)] leading-normal">
                      {font.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Corner Radius selection */}
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
                  <button
                    key={radius.id}
                    onClick={() => setBorderRadius(radius.id)}
                    className={`text-left p-2.5 rounded-xl border transition-all flex flex-col gap-0.5 cursor-pointer ${
                      isSelected 
                        ? 'bg-[var(--theme-accent)]/5 border-[var(--theme-accent)]' 
                        : 'bg-[var(--theme-surface-alt)] border-[var(--theme-border)] hover:border-[var(--theme-accent)]/40 hover:bg-[var(--theme-hover-bg)]'
                    }`}
                  >
                    <span className="text-xs font-bold">{radius.name}</span>
                    <span className="text-[9px] text-[var(--theme-muted)]">{radius.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Custom Panel footer */}
        <div className="px-5 py-3 border-t border-[var(--theme-border)] bg-[var(--theme-surface-alt)] shrink-0 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 text-[10px] text-[var(--theme-danger)] hover:text-red-400 font-mono font-bold transition-all uppercase cursor-pointer py-1.5 px-3 rounded-lg border border-red-500/10 hover:border-red-500/30 hover:bg-red-500/5"
            title="Restore default theme settings"
          >
            <RefreshCw size={11} className="animate-spin-once" />
            Reset Defaults
          </button>
          
          <span className="text-[10px] text-[var(--theme-muted)] font-mono">
            Ctrl+Z to Undo color
          </span>
        </div>
      </motion.div>
    </>
  );
}
