export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  primary: string;
  secondary: string;
  accent: string;
  accentForeground: string;
  muted: string;
  danger: string;
  success: string;
  warning: string;
  sidebar: string;
  sidebarBorder: string;
  headerBg: string;
  inputBg: string;
  inputBorder: string;
  cardBg: string;
  hoverBg: string;
  tooltipBg: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  isDark: boolean;
  colors: ThemeColors;
  font?: string;
  radius?: string;
}

export interface ThemeContextType {
  theme: Theme;
  setTheme: (id: string) => void;
  themes: Theme[];
  isDark: boolean;
  // Custom theme engine integration
  setThemeColor: (colorKey: keyof ThemeColors, value: string) => void;
  setFontFamily: (font: string) => void;
  setBorderRadius: (radius: string) => void;
  customThemeColors: Record<string, string>;
  customFont: string;
  customRadius: string;
}
