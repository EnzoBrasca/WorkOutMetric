import { useTranslation } from '../../i18n';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/useTheme';

export default function ExerciseCard({ exercise, onEdit, onDelete, onStart }) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);
  return (
    <View style={styles.exerciseCard}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <View style={styles.weekBadge}>
            <Text style={styles.weekText}>{exercise.week}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => onStart(exercise)} style={styles.startBtn}>
            <Text style={styles.startText}>{t("START")}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onEdit(exercise)} style={styles.actionBtn}>
            <Text style={styles.actionText}>{t("EDIT")}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(exercise.id)} style={styles.actionBtn}>
            <Text style={[styles.actionText, { color: colors.danger }]}>{t("DEL")}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>{t("TARGET_WEIGHT")}</Text>
          <View style={styles.statValueContainer}>
            <Text style={styles.statValueWeight}>{exercise.weight}</Text>
            <Text style={styles.statUnit}>{t("KG")}</Text>
          </View>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>{t("SETS_X_REPS")}</Text>
          <Text style={styles.statValueSets}>{exercise.sets}</Text>
        </View>
      </View>
    </View>
  );
}

const getStyles = (colors, fonts) => StyleSheet.create({
  exerciseCard: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  exerciseName: {
    fontFamily: fonts.semiBold,
    fontSize: 22,
    letterSpacing: 1.2,
    color: colors.primary,
  },
  weekBadge: {
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.borderAlt,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  weekText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  actionBtn: {
    padding: 4,
  },
  actionText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  startBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
  },
  startText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.background,
  },
  cardBody: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 16,
    gap: 16,
  },
  statCol: {
    flex: 1,
    gap: 4,
  },
  statLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.textSecondary,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  statValueWeight: {
    fontFamily: fonts.bold,
    fontSize: 44,
    letterSpacing: -0.96,
    color: colors.primary,
    lineHeight: 44,
  },
  statUnit: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValueSets: {
    fontFamily: fonts.bold,
    fontSize: 44,
    letterSpacing: -0.96,
    color: colors.primary,
    lineHeight: 44,
  },
});
