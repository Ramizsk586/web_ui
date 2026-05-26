import type { Theme } from './types';

export const themes: Theme[] = [
  {
    id: 'claude',
    name: 'Claude',
    description: 'Warm editorial charcoal with copper peach accents',
    isDark: true,
    font: "'Playfair Display', Georgia, serif",
    colors: {
      background: '#151413',
      surface: '#1B1A18',
      surfaceAlt: '#21201D',
      border: '#2A2925',
      primary: '#F5F1EB',
      secondary: '#A89F93',
      accent: '#D97756',
      accentForeground: '#FFFFFF',
      muted: '#635F59',
      danger: '#E05A47',
      success: '#49A078',
      warning: '#D48C45',
      sidebar: '#11100F',
      sidebarBorder: '#232220',
      headerBg: '#151413',
      inputBg: '#1D1C1A',
      inputBorder: '#2C2B27',
      cardBg: '#1B1A18',
      hoverBg: '#262522',
      tooltipBg: '#11100F',
    },
  },
];

export const defaultThemeId = 'claude';

export function getThemeById(id: string): Theme {
  return themes[0];
}
