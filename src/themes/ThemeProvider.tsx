import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { themes, defaultThemeId, getThemeById } from './themes';
import type { Theme, ThemeColors, ThemeContextType } from './types';

const ThemeContext = createContext<ThemeContextType>({
  theme: themes[0],
  setTheme: () => {},
  themes,
  isDark: true,
  setThemeColor: () => {},
  setFontFamily: () => {},
  setBorderRadius: () => {},
  customThemeColors: {},
  customFont: themes[0].font || '',
  customRadius: themes[0].radius || '12px'
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getStoredTheme(): string {
  try {
    return localStorage.getItem('lumina-theme') || defaultThemeId;
  } catch {
    return defaultThemeId;
  }
}

function getStoredCustomColors(): Record<string, string> {
  try {
    const saved = localStorage.getItem('lumina-custom-colors');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function getStoredCustomFont(): string {
  try {
    return localStorage.getItem('lumina-custom-font') || '';
  } catch {
    return '';
  }
}

function getStoredCustomRadius(): string {
  try {
    return localStorage.getItem('lumina-custom-radius') || '12px';
  } catch {
    return '12px';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState<string>(getStoredTheme);
  const [customThemeColors, setCustomThemeColors] = useState<Record<string, string>>(getStoredCustomColors);
  const [customFont, setCustomFont] = useState<string>(getStoredCustomFont);
  const [customRadius, setCustomRadius] = useState<string>(getStoredCustomRadius);

  // Retrieve current active base theme
  const baseTheme = getThemeById(activeThemeId);

  // Compute final theme colors, overlaying custom color variables if on 'custom' theme
  const theme = React.useMemo(() => {
    if (activeThemeId === 'custom') {
      const mergedColors = { ...baseTheme.colors, ...customThemeColors };
      return {
        ...baseTheme,
        font: customFont || baseTheme.font,
        radius: customRadius || baseTheme.radius,
        colors: mergedColors
      };
    }
    return baseTheme;
  }, [activeThemeId, baseTheme, customThemeColors, customFont, customRadius]);

  const setTheme = useCallback((id: string) => {
    setActiveThemeId(id);
    try {
      localStorage.setItem('lumina-theme', id);
    } catch {}
  }, []);

  const setThemeColor = useCallback((colorKey: keyof ThemeColors, value: string) => {
    setCustomThemeColors(prev => {
      const next = { ...prev, [colorKey]: value };
      try {
        localStorage.setItem('lumina-custom-colors', JSON.stringify(next));
      } catch {}
      return next;
    });
    // Auto shift to 'custom' theme to show real-time changes
    setActiveThemeId('custom');
    try {
      localStorage.setItem('lumina-theme', 'custom');
    } catch {}
  }, []);

  const setFontFamily = useCallback((font: string) => {
    setCustomFont(font);
    try {
      localStorage.setItem('lumina-custom-font', font);
    } catch {}
    // Auto shift to 'custom' theme
    setActiveThemeId('custom');
    try {
      localStorage.setItem('lumina-theme', 'custom');
    } catch {}
  }, []);

  const setBorderRadius = useCallback((radius: string) => {
    setCustomRadius(radius);
    try {
      localStorage.setItem('lumina-custom-radius', radius);
    } catch {}
    // Auto shift to 'custom' theme
    setActiveThemeId('custom');
    try {
      localStorage.setItem('lumina-theme', 'custom');
    } catch {}
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const c = theme.colors;

    root.style.setProperty('--theme-bg', c.background);
    root.style.setProperty('--theme-surface', c.surface);
    root.style.setProperty('--theme-surface-alt', c.surfaceAlt);
    root.style.setProperty('--theme-border', c.border);
    root.style.setProperty('--theme-primary', c.primary);
    root.style.setProperty('--theme-secondary', c.secondary);
    root.style.setProperty('--theme-accent', c.accent);
    root.style.setProperty('--theme-accent-foreground', c.accentForeground);
    root.style.setProperty('--theme-muted', c.muted);
    root.style.setProperty('--theme-danger', c.danger);
    root.style.setProperty('--theme-success', c.success);
    root.style.setProperty('--theme-warning', c.warning);
    root.style.setProperty('--theme-sidebar', c.sidebar);
    root.style.setProperty('--theme-sidebar-border', c.sidebarBorder);
    root.style.setProperty('--theme-header-bg', c.headerBg);
    root.style.setProperty('--theme-input-bg', c.inputBg);
    root.style.setProperty('--theme-input-border', c.inputBorder);
    root.style.setProperty('--theme-card-bg', c.cardBg);
    root.style.setProperty('--theme-hover-bg', c.hoverBg);
    root.style.setProperty('--theme-tooltip-bg', c.tooltipBg);
    
    // Inject dynamic display font and border-radius
    root.style.setProperty('--font-display-theme', theme.font || '"Outfit", sans-serif');
    root.style.setProperty('--theme-radius', theme.radius || '12px');
    root.style.setProperty('--radius', theme.radius || '12px');

    root.classList.toggle('dark', theme.isDark);
    root.setAttribute('data-theme', theme.id);
  }, [theme]);

  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      themes, 
      isDark: theme.isDark,
      setThemeColor,
      setFontFamily,
      setBorderRadius,
      customThemeColors,
      customFont,
      customRadius
    }}>
      {children}
    </ThemeContext.Provider>
  );
}
