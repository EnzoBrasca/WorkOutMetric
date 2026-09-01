import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import NeumorphicSurface from './NeumorphicSurface';

export default function Button({ label, onPress, variant = 'primary', disabled = false, loading = false, style }) {
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);

  const surfaceBackground =
    variant === 'primary' ? colors.primary : colors.backgroundAlt;

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
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled || loading}
    >
      {/* The caller's style goes on the surface, not here: it carries the
          button's own padding (ConfigScreen's calculate button overrides it),
          which has to land on the painted box the way it did when this was a
          single flat View. NeumorphicSurface hoists the layout half of it --
          margins, flex, width -- back out to its container. */}
      <NeumorphicSurface
        variant={disabled ? 'pressed' : 'raised'}
        backgroundColor={surfaceBackground}
        style={[styles.base, disabled && styles.disabled, style]}
      >
        {loading ? (
          <ActivityIndicator color={indicatorColor} />
        ) : (
          <Text style={[styles.textBase, textVariantStyle]} numberOfLines={1}>{label}</Text>
        )}
      </NeumorphicSurface>
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
  primaryText: {
    color: colors.background,
  },
  secondaryText: {
    color: colors.textPrimary,
  },
  dangerText: {
    color: colors.danger,
  },
});
