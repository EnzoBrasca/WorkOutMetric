import { useTranslation } from '../../i18n';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import OneRmPrompt from './OneRmPrompt';
import TargetOverrideEditor from './TargetOverrideEditor';
import { equipmentWeightLabel } from '../../utils/equipment';
import ExerciseGuideImage from '../atoms/ExerciseGuideImage';
import ExerciseGuideModal from '../organisms/ExerciseGuideModal';
import NeumorphicSurface from '../atoms/NeumorphicSurface';

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
// onLog opens the logging modal for this exercise. It used to be called
// onStart and read "START", which described nothing it did — starting a workout
// is the screen's own button, and this only ever recorded sets and reps.
//
// Both onLog and onDelete are optional, and each button appears only when its
// handler does. The two views that render this card offer different things:
// during a workout you log, outside one you edit the routine.
export default function ExerciseCard({
  exercise,
  onDelete,
  onLog,
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
  const [guideVisible, setGuideVisible] = useState(false);
  return (
    <>
    <NeumorphicSurface style={styles.exerciseCard}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.nameRow}>
            {/* Only the picture opens the walkthrough, not the whole row: the
                card's other taps edit the routine, and a name that silently
                opened a modal would be a second meaning for the same area.
                Without a slug the atom renders nothing, so this wrapper is
                inert rather than an empty tap target. */}
            {exercise.guide_slug ? (
              <TouchableOpacity
                testID="exercise-guide-open"
                onPress={() => setGuideVisible(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('GUIDE_HOW_TO')}
              >
                <ExerciseGuideImage slug={exercise.guide_slug} size={36} />
              </TouchableOpacity>
            ) : null}
            <Text style={styles.exerciseName} numberOfLines={2}>{exercise.name}</Text>
          </View>
          <View style={styles.weekBadge}>
            <Text style={styles.weekText}>{exercise.week}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          {/* Logging belongs to a workout, so only the session view passes
              onLog. Offering it beforehand meant logSession auto-started a
              session through ensureActiveSessionId and the screen flipped
              into the workout view on save — a workout the user never asked
              to begin. */}
          {onLog ? (
            <TouchableOpacity onPress={() => onLog(exercise)}>
              <NeumorphicSurface backgroundColor={colors.primary} radius={12} style={styles.logBtn}>
                <Text style={styles.logText}>{t("LOG")}</Text>
              </NeumorphicSurface>
            </TouchableOpacity>
          ) : null}
          {/* Only where the caller can actually act on it. The session view
              renders this same card without onDelete, and an unconditional
              button there threw "onDelete is not a function" on tap. Dropping
              an exercise from the routine is setup, not training, so hiding it
              mid-workout is the right behaviour as well as the safe one. */}
          {onDelete ? (
            <TouchableOpacity onPress={() => onDelete(exercise.id)} style={styles.actionBtn}>
              <Text style={[styles.actionText, { color: colors.danger }]}>{t("DEL")}</Text>
            </TouchableOpacity>
          ) : null}
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
    </NeumorphicSurface>
    {/* A sibling of the card, not a child: the card's surface clips its
        contents (overflow: hidden), and the walkthrough is a full-screen
        sheet rather than part of the card's own box.
        Mounted only once opened, rather than kept hidden: these cards render
        one per row of a scrolling list, and an always-mounted sheet would
        cost every row three more <Image> and a safe-area subscription for a
        modal almost none of them will ever show. */}
    {guideVisible ? (
      <ExerciseGuideModal
        visible
        onClose={() => setGuideVisible(false)}
        exerciseName={exercise.name}
        slug={exercise.guide_slug}
      />
    ) : null}
    </>
  );
}

const getStyles = (colors, fonts) => StyleSheet.create({
  exerciseCard: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    // The illustration is fixed-width, so the name has to be the part that
    // wraps rather than pushing the row past the card.
    alignSelf: 'stretch',
  },
  exerciseName: {
    fontFamily: fonts.semiBold,
    fontSize: 22,
    letterSpacing: 1.2,
    color: colors.primary,
    flexShrink: 1,
  },
  weekBadge: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 10,
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
  logBtn: {
    paddingHorizontal: 10,
    minHeight: 44,
    justifyContent: 'center',
    marginRight: 4,
  },
  logText: {
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
