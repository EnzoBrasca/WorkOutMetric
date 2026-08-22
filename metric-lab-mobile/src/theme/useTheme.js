import { useSettingsStore } from '../store/useSettingsStore';
import { colors as defaultColors } from './colors';

export const lightTheme = {
  ...defaultColors,
  background: '#ffffff',
  backgroundCard: '#f4f4f5',
  backgroundAlt: '#e4e4e7',
  textPrimary: '#09090b',
  textSecondary: '#52525b',
  textMuted: '#a1a1aa',
  border: '#d4d4d8',
  borderLight: '#e4e4e7',
  borderAlt: '#d4d4d8',
  backgroundSelectedText: '#ffffff',
  primaryLight: '#FF7300', // Override so it's not invisible on white
  textDark: '#ffffff',
};

export const darkTheme = { ...defaultColors };

export function useTheme() {
  const { theme, customColors, font } = useSettingsStore();

  let colors = darkTheme;
  if (theme === 'light') {
    colors = lightTheme;
  } else if (theme === 'custom') {
    colors = {
      ...defaultColors,
      background: customColors.background,
      backgroundCard: customColors.backgroundCard || customColors.background,
      backgroundAlt: customColors.background,
      primary: customColors.primary,
      primaryLight: customColors.primary,
      textPrimary: customColors.textPrimary,
      textSecondary: customColors.textPrimary,
      border: customColors.primary,
      borderLight: customColors.primary,
      borderAlt: customColors.primary,
    };
  }

  // Dynamic Fonts
  let fonts = {
    regular: 'PixelifySans_400Regular',
    medium: 'PixelifySans_500Medium',
    semiBold: 'PixelifySans_600SemiBold',
    bold: 'PixelifySans_700Bold',
  };

  if (font !== 'PixelifySans_400Regular') {
    // If it's a system font or generic font, we rely on standard RN font weights
    fonts = {
      regular: font === 'System' ? undefined : font,
      medium: font === 'System' ? undefined : font,
      semiBold: font === 'System' ? undefined : font,
      bold: font === 'System' ? undefined : font,
    };
  }

  return { colors, fonts };
}
