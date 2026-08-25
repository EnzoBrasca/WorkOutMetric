import { useTranslation } from '../../i18n';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import WeekSelector from '../molecules/WeekSelector';

// Sits above the exercise list, and does exactly two things now: show which
// week of the block is running (and let the user move between weeks), plus one
// small control to activate or deactivate a mesocycle.
//
// Creating a block, and managing past ones, moved to ConfigScreen — Train is
// for training. The activate control stays because a block ending mid-workout
// should not send the user to another tab to start the next one.
export default function MesocyclePanel({
  activeMesocycle,
  plan,
  isPlanLoading,
  onChangeWeek,
  onEndPress,
  onActivatePress,
}) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);

  if (!activeMesocycle) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyLabel}>{t('NO_ACTIVE_MESOCYCLE')}</Text>
        <TouchableOpacity onPress={onActivatePress} testID="mesocycle-activate">
          <Text style={styles.emptyAction}>{t('ACTIVATE_MESOCYCLE')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Fall back to the mesocycle's own current_week while the plan for it is
  // still loading, so the selector never renders blank. Both are derived from
  // the same anchor server-side, so they cannot disagree for long.
  const currentWeek = plan?.week ?? activeMesocycle.current_week;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
          {activeMesocycle.name}
        </Text>
        <TouchableOpacity onPress={onEndPress} testID="mesocycle-end">
          <Text style={styles.endText}>{t('END_MESOCYCLE')}</Text>
        </TouchableOpacity>
      </View>

      <WeekSelector
        currentWeek={currentWeek}
        totalWeeks={activeMesocycle.total_weeks}
        isDeload={!!plan?.isDeload}
        onPrevWeek={onChangeWeek}
        onNextWeek={onChangeWeek}
        disabled={isPlanLoading}
      />
    </View>
  );
}

const getStyles = (colors, fonts) => StyleSheet.create({
  emptyContainer: {
    borderWidth: 1,
    borderColor: colors.primary,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  emptyLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 1,
    color: colors.textSecondary,
  },
  emptyAction: {
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 1,
    color: colors.primary,
  },
  container: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  name: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 16,
    letterSpacing: 1,
    color: colors.primary,
  },
  endText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.danger,
    textDecorationLine: 'underline',
    flexShrink: 0,
  },
});
