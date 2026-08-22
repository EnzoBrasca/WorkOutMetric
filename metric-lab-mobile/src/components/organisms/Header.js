import { useTranslation } from '../../i18n';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';

import { useAuthStore } from '../../store/useAuthStore';

export default function Header() {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);
  const insets = useSafeAreaInsets();
  const { isAuthenticated, logout } = useAuthStore();

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <View style={[styles.container, { justifyContent: 'space-between' }]}>
        <Text style={styles.title}>{t("METRIC_LAB")}</Text>
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
