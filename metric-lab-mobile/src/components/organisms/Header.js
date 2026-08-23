import { useTranslation } from '../../i18n';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';

import { useAuthStore } from '../../store/useAuthStore';

// Read from app.json rather than baked into the translation string, which was
// still claiming V1.0 regardless of what was actually shipped.
const APP_VERSION = Constants.expoConfig?.version ?? '';

export default function Header() {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);
  const insets = useSafeAreaInsets();
  const { isAuthenticated, logout } = useAuthStore();

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <View style={[styles.container, { justifyContent: 'space-between' }]}>
        <Text style={styles.title}>
          {t("METRIC_LAB")}
          {APP_VERSION ? <Text style={styles.version}> V{APP_VERSION}</Text> : null}
        </Text>
        {isAuthenticated && (
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>{t("LOGOUT")}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const getStyles = (colors, fonts) => StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderAlt,
  },
  container: {
    height: 64,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    letterSpacing: -0.6,
    color: colors.primary,
  },
  version: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  logoutBtn: {
    padding: 8,
  },
  logoutText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  }
});
