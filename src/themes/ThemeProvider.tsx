import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { themes, defaultThemeId, getThemeById } from './themes';
import type { Theme, ThemeContextType } from './types';

const ThemeContext = createContext<ThemeContextType>({
  theme: themes[0],
  setTheme: () => {},
  themes,
  isDark: true,
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

function storeTheme(id: string) {
  try {
    localStorage.setItem('lumina-theme', id);
  } catch {}
}

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState(getStoredTheme);
  const [mounted, setMounted] = useState(false);

  const theme = getThemeById(themeId);

  const setTheme = useCallback((id: string) => {
    setThemeId(id);
    storeTheme(id);
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

    root.classList.toggle('dark', theme.isDark);
    root.setAttribute('data-theme', theme.id);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (!localStorage.getItem('lumina-theme')) {
        const prefersDark = mq.matches;
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes, isDark: theme.isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
