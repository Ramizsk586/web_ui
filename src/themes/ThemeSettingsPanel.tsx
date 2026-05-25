import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Palette, RotateCcw, Upload, Download, Sparkles } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { defaultThemeId, themes } from './themes';
import type { Theme, ThemeColors } from './types';

function ThemePreviewCard({ theme, isActive, onSelect }: { theme: Theme; isActive: boolean; onSelect: () => void }) {
  const c = theme.colors;
  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="relative w-full text-left rounded-xl overflow-hidden border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)]"
      style={{
        borderColor: isActive ? c.accent : 'transparent',
        boxShadow: isActive ? `0 0 20px ${c.accent}33` : 'none',
      }}
    >
      <div className="p-3" style={{ background: c.background }}>
        <div className="flex items-start gap-2.5 mb-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
            style={{ background: c.accent, color: c.accentForeground }}
          >
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: c.primary }}>{theme.name}</p>
            <p className="text-[9px] mt-0.5 truncate" style={{ color: c.secondary }}>{theme.description}</p>
          </div>
          {isActive && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: c.accent }}
            >
              <Check size={11} className="text-white" />
            </motion.div>
          )}
        </div>
        <div className="flex gap-1">
          <div className="h-6 flex-1 rounded-md flex items-center justify-center text-[7px] font-medium" style={{ background: c.accent, color: c.accentForeground }}>Button</div>
          <div className="h-6 flex-1 rounded-md flex items-center justify-center text-[7px]" style={{ background: c.inputBg, border: `1px solid ${c.inputBorder}`, color: c.secondary }}>Input</div>
        </div>
        <div className="flex gap-1 mt-1">
          <div className="flex-1 space-y-1">
            <div className="h-1.5 rounded-full" style={{ background: c.primary, opacity: 0.2 }} />
            <div className="h-1.5 rounded-full w-2/3" style={{ background: c.secondary, opacity: 0.2 }} />
          </div>
          <div className="flex gap-1 items-center">
            <div className="w-4 h-4 rounded-md" style={{ background: c.surface, border: `1px solid ${c.border}` }} />
            <div className="w-4 h-4 rounded-md" style={{ background: c.sidebar, border: `1px solid ${c.sidebarBorder}` }} />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

export function ThemeSettingsPanel({ onClose }: { onClose?: () => void }) {
  const { theme, setTheme, themes } = useTheme();
  const [showImportExport, setShowImportExport] = useState(false);
  const [customTheme, setCustomTheme] = useState<Theme | null>(null);

  const handleReset = () => {
    setTheme(defaultThemeId);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme-${theme.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target?.result as string);
          if (imported && imported.colors) {
            setCustomTheme(imported as Theme);
            setTheme(imported.id || 'custom');
          }
        } catch {}
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}>
            <Palette size={15} style={{ color: 'var(--theme-accent)' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--theme-primary)' }}>Theme</h3>
            <p className="text-[10px]" style={{ color: 'var(--theme-secondary)' }}>Customize your appearance</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExport}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--theme-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--theme-hover-bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            title="Export theme"
          >
            <Download size={14} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleImport}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--theme-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--theme-hover-bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            title="Import theme"
          >
            <Upload size={14} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReset}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--theme-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--theme-hover-bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            title="Reset to default"
          >
            <RotateCcw size={14} />
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {themes.map((t) => (
          <ThemePreviewCard
            key={t.id}
            theme={t}
            isActive={theme.id === t.id}
            onSelect={() => setTheme(t.id)}
          />
        ))}
      </div>

      <div
        className="rounded-xl p-3 flex items-center gap-3 text-xs"
        style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}
      >
        <Sparkles size={14} style={{ color: 'var(--theme-accent)' }} />
        <p style={{ color: 'var(--theme-secondary)' }}>
          Current: <span className="font-semibold" style={{ color: 'var(--theme-primary)' }}>{theme.name}</span>
        </p>
      </div>
    </motion.div>
  );
}
