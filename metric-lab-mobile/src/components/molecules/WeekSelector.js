import { useTranslation } from '../../i18n';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import NeumorphicSurface from '../atoms/NeumorphicSurface';

// Lets the user see and change which week of the active mesocycle they're
// training. currentWeek/totalWeeks come from the mesocycle row; isDeload
// comes from the plan for that week (it depends on the config, not just the
// week number).
export default function WeekSelector({ currentWeek, totalWeeks, isDeload, onPrevWeek, onNextWeek, disabled }) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);

  const atFirstWeek = currentWeek <= 1;
  const atLastWeek = currentWeek >= totalWeeks;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => onPrevWeek(currentWeek - 1)}
        disabled={atFirstWeek || disabled}
      >
        <NeumorphicSurface
          radius={16}
          style={[styles.arrowBtn, (atFirstWeek || disabled) && styles.arrowBtnDisabled]}
        >
          <Text style={styles.arrowText}>‹</Text>
        </NeumorphicSurface>
      </TouchableOpacity>

      <View style={styles.centerBox}>
        <Text style={styles.weekText}>{t("WEEK")} {currentWeek} / {totalWeeks}</Text>
        {isDeload && (
          <View style={styles.deloadBadge}>
            <Text style={styles.deloadText}>{t("DELOAD")}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        onPress={() => onNextWeek(currentWeek + 1)}
        disabled={atLastWeek || disabled}
      >
        <NeumorphicSurface
          radius={16}
          style={[styles.arrowBtn, (atLastWeek || disabled) && styles.arrowBtnDisabled]}
        >
          <Text style={styles.arrowText}>›</Text>
        </NeumorphicSurface>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors, fonts) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  arrowBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBtnDisabled: {
    opacity: 0.3,
  },
  arrowText: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.primary,
    lineHeight: 22,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  weekText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    letterSpacing: 1.2,
    color: colors.textPrimary,
  },
  deloadBadge: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  deloadText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.background,
  },
});
