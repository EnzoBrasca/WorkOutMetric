import { useTranslation } from '../../i18n';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import WeekSelector from '../molecules/WeekSelector';

// Sits above the exercise list. With no active mesocycle it just prompts the
// user to start one, so a user who never touches this feature never sees
// anything different from before.
export default function MesocyclePanel({ activeMesocycle, plan, isPlanLoading, onStartPress, onChangeWeek, onEndPress, onManagePress, hasMesocycles }) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);

  if (!activeMesocycle) {
    return (
      <View style={styles.emptyContainer}>
        <TouchableOpacity onPress={onStartPress} activeOpacity={0.8} style={styles.emptyMain}>
          <Text style={styles.emptyLabel}>{t("NO_ACTIVE_MESOCYCLE")}</Text>
          <Text style={styles.emptyAction}>{t("START_MESOCYCLE")}</Text>
        </TouchableOpacity>
        {/* Only offered once there is something to go back to. */}
        {hasMesocycles ? (
          <TouchableOpacity onPress={onManagePress}>
            <Text style={styles.manageText}>{t("PAST_MESOCYCLES")}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  // Fall back to the mesocycle's own current_week while the plan for it is
  // still loading, so the selector never renders blank.
  const currentWeek = plan?.week ?? activeMesocycle.current_week;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{activeMesocycle.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onManagePress}>
            <Text style={styles.manageText}>{t("PAST_MESOCYCLES")}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onEndPress}>
            <Text style={styles.endText}>{t("END_MESOCYCLE")}</Text>
          </TouchableOpacity>
        </View>
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
  emptyMain: {
    alignItems: 'center',
    gap: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  manageText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
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
  },
  name: {
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
  },
});
