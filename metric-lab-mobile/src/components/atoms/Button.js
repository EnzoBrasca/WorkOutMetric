import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/useTheme';

export default function Button({ label, onPress, variant = 'primary', disabled = false, loading = false, style }) {
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);

  const containerVariantStyle =
    variant === 'secondary' ? styles.secondaryContainer
    : variant === 'danger' ? styles.dangerContainer
    : styles.primaryContainer;

  const textVariantStyle =
    variant === 'secondary' ? styles.secondaryText
    : variant === 'danger' ? styles.dangerText
    : styles.primaryText;

  const indicatorColor =
    variant === 'secondary' ? colors.textPrimary
    : variant === 'danger' ? colors.danger
    : colors.background;

  return (
    <TouchableOpacity
      style={[styles.base, containerVariantStyle, disabled && styles.disabled, style]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={indicatorColor} />
      ) : (
        <Text style={[styles.textBase, textVariantStyle]} numberOfLines={1}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const getStyles = (colors, fonts) => StyleSheet.create({
  base: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  textBase: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
  },
  primaryContainer: {
    backgroundColor: colors.primary,
  },
  primaryText: {
    color: colors.background,
  },
  secondaryContainer: {
    borderWidth: 1,
    borderColor: colors.borderAlt,
  },
  secondaryText: {
    color: colors.textPrimary,
  },
  dangerContainer: {
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerText: {
    color: colors.danger,
  },
});
