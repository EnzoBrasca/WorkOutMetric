import { useTranslation } from '../../i18n';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/useTheme';

export default function PushPullTabs({ activeTab, onTabSelect }) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);
  return (
    <View style={styles.pushPullContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'push' && styles.activeTab]}
        onPress={() => onTabSelect('push')}
        activeOpacity={0.8}
      >
        <Text
          style={[styles.tabText, activeTab === 'push' ? styles.activeTabText : styles.inactiveTabText]}
        >
          PUSH
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, styles.rightTab, activeTab === 'pull' && styles.activeTab]}
        onPress={() => onTabSelect('pull')}
        activeOpacity={0.8}
      >
        <Text
          style={[styles.tabText, activeTab === 'pull' ? styles.activeTabText : styles.inactiveTabText]}
        >
          PULL
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors, fonts) => StyleSheet.create({
  pushPullContainer: {
    height: 48,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background, // Default inactive
  },
  rightTab: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    letterSpacing: 0.6,
  },
  activeTabText: {
    fontFamily: fonts.bold,
    color: colors.textDark,
  },
  inactiveTabText: {
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
});
