import { useTranslation } from '../../i18n';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import OneRmPrompt from './OneRmPrompt';
import TargetOverrideEditor from './TargetOverrideEditor';
import { equipmentWeightLabel } from '../../utils/equipment';

// exercise.planTarget is attached by useTrainScreen when an active mesocycle
// covers this exercise (see useMesocycleStore's plan). When it's absent this
// renders exactly as before, so exercises outside a mesocycle — or when no
// mesocycle is active at all — are unaffected.
//
// exercise.effectiveTargetSets/effectiveTargetReps/hasOverride come from the
// same hook's override merge (useExerciseOverrideStore) -- a local, per-week
// adjustment on top of planTarget/the routine's own target. Editing is only
// offered with an active mesocycle (editable), since an override is scoped to
// (mesocycleId, week) and has nothing to scope to otherwise.
export default function ExerciseCard({
  exercise,
  onEdit,
  onDelete,
  onStart,
  onSetOneRm,
  isSettingOneRm,
  onSetTargetOverride,
  onClearTargetOverride,
  editable,
}) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);
  const planTarget = exercise.planTarget;
  return (
    <View style={styles.exerciseCard}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.exerciseName} numberOfLines={2}>{exercise.name}</Text>
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
            <Text style={styles.statValueWeight} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {planTarget ? (planTarget.needsOneRm ? '—' : planTarget.targetWeight) : exercise.weight}
            </Text>
            <Text style={styles.statUnit} numberOfLines={2}>
              {equipmentWeightLabel(t, exercise.equipment, exercise.equipment_units)}
            </Text>
          </View>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>{t("SETS_X_REPS")}</Text>
          {exercise.hasOverride && editable ? (
            // An override is active AND this view can edit it (Train's own
            // list) -- full editor, reset included.
            <TargetOverrideEditor
              sets={exercise.effectiveTargetSets}
              reps={exercise.effectiveTargetReps}
              hasOverride
              editable
              onSave={(sets, reps) => onSetTargetOverride(exercise.id, sets, reps)}
              onReset={() => onClearTargetOverride(exercise.id)}
            />
          ) : exercise.hasOverride ? (
            // An override is active but this view (the in-progress session
            // list) has no edit affordance -- still show the ADJUSTED value,
            // just not editable from here.
            <View>
              <Text style={styles.statValueSets} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                {exercise.effectiveTargetSets}x{exercise.effectiveTargetReps}
              </Text>
              <Text style={styles.adjustedBadge}>{t('ADJUSTED_BADGE')}</Text>
            </View>
          ) : editable && planTarget ? (
            // No override yet, but this view can create one.
            <TargetOverrideEditor
              sets={exercise.effectiveTargetSets}
              reps={exercise.effectiveTargetReps}
              hasOverride={false}
              editable
              onSave={(sets, reps) => onSetTargetOverride(exercise.id, sets, reps)}
              onReset={() => onClearTargetOverride(exercise.id)}
            />
          ) : (
            <Text style={styles.statValueSets} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {planTarget ? `${planTarget.targetSets}x${planTarget.targetReps}` : exercise.sets}
            </Text>
          )}
        </View>
      </View>

      {planTarget?.needsOneRm && (
        <OneRmPrompt onSubmit={(value) => onSetOneRm(exercise.id, value)} loading={isSettingOneRm} />
      )}
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
    flexShrink: 0,
  },
  actionBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  actionText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  startBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    minHeight: 44,
    justifyContent: 'center',
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
    // The equipment label ("KG · POR MANCUERNA (x2)") is much wider than the
    // bare "KG" this used to hold: it has to wrap beside a 44px number rather
    // than push the column off-screen.
    flexShrink: 1,
  },
  statValueSets: {
    fontFamily: fonts.bold,
    fontSize: 44,
    letterSpacing: -0.96,
    color: colors.primary,
    lineHeight: 44,
  },
  adjustedBadge: {
    fontFamily: fonts.medium,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.textSecondary,
  },
});
