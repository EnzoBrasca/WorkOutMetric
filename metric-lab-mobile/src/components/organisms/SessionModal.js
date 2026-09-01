import { useTranslation } from '../../i18n';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import Button from '../atoms/Button';
import OneRmPrompt from '../molecules/OneRmPrompt';
import ExerciseGuideImage from '../atoms/ExerciseGuideImage';

// Logging only. The rest timer used to be repeated here, but it is a property
// of the workout, not of one exercise's numbers: WorkoutSessionView owns the
// control, and both were views of the same useRestTimer instance, so this one
// only ever duplicated a countdown already on screen behind the modal.
export default function SessionModal({
  visible,
  onClose,
  onSave,
  exercise,
  onSetOneRm,
  isSettingOneRm,
}) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, fonts);
  const [completedSets, setCompletedSets] = useState('');
  const [completedReps, setCompletedReps] = useState('');

  // exercise.planTarget is attached by useTrainScreen when an active
  // mesocycle covers this exercise. When it's absent — no active mesocycle,
  // or this exercise isn't in the mesocycle's routine — fall back to parsing
  // the free-text "4x8" the exercise was created with, exactly as before.
  //
  // exercise.hasOverride/effectiveTargetSets/effectiveTargetReps come from
  // the same hook's local sets/reps override (useExerciseOverrideStore),
  // scoped to the current mesocycle week -- when one is set it takes
  // precedence over the plan target, same as ExerciseCard's display.
  const planTarget = exercise?.planTarget;
  const targetSets = exercise?.hasOverride
    ? exercise.effectiveTargetSets
    : planTarget
    ? planTarget.targetSets
    : (exercise?.sets ? parseInt(exercise.sets.split('x')[0], 10) || 0 : 0);
  const targetReps = exercise?.hasOverride
    ? exercise.effectiveTargetReps
    : planTarget
    ? planTarget.targetReps
    : (exercise?.sets ? parseInt(exercise.sets.split('x')[1], 10) || 0 : 0);
  const targetWeight = planTarget ? planTarget.targetWeight : null;
  const totalTargetReps = targetSets * targetReps;

  useEffect(() => {
    if (visible && exercise) {
      setCompletedSets(targetSets.toString());
      setCompletedReps(targetReps.toString());
    } else {
      setCompletedSets('');
      setCompletedReps('');
    }
    // Keyed on the exercise id, not the exercise object: when a mesocycle is
    // active, submitting a 1RM refreshes the plan and gives this exercise a
    // new object identity, which would otherwise re-run this effect and wipe
    // out whatever the user had already typed.
  }, [visible, exercise?.id]);

  const handleSave = () => {
    onSave({
      completedSets: parseInt(completedSets, 10) || 0,
      completedReps: parseInt(completedReps, 10) || 0,
    });
    onClose();
  };

  const currentTotal = (parseInt(completedSets, 10) || 0) * (parseInt(completedReps, 10) || 0);
  const percentage = totalTargetReps > 0 ? Math.min(100, Math.round((currentTotal / totalTargetReps) * 100)) : 0;

  if (!exercise) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <ScrollView keyboardShouldPersistTaps="handled">
          <View style={styles.titleRow}>
            <ExerciseGuideImage slug={exercise.guide_slug} size={48} />
            <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">LOG SESSION: {exercise.name}</Text>
          </View>

          <View style={styles.targetBox}>
            {planTarget ? (
              <Text style={styles.targetLabel}>
                {t("TARGET")}: {targetSets}x{targetReps}
                {targetWeight !== null ? ` @ ${targetWeight}${t("KG")}` : ''}
                {' '}({totalTargetReps} TOTAL REPS)
              </Text>
            ) : (
              <Text style={styles.targetLabel}>TARGET: {exercise.sets} ({totalTargetReps} TOTAL REPS)</Text>
            )}
            {planTarget?.needsOneRm && (
              <OneRmPrompt onSubmit={(value) => onSetOneRm(exercise.id, value)} loading={isSettingOneRm} />
            )}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>COMPLETED SETS</Text>
              <TextInput
                style={styles.input}
                value={completedSets}
                onChangeText={setCompletedSets}
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>REPS PER SET</Text>
              <TextInput
                style={styles.input}
                value={completedReps}
                onChangeText={setCompletedReps}
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.progressBox}>
            <Text style={styles.progressLabel}>COMPLETION RATE</Text>
            <Text style={styles.progressValue}>{percentage}%</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${percentage}%` }]} />
            </View>
          </View>

          <View style={[styles.buttonRow, { marginBottom: insets.bottom + 16 }]}>
            <Button label={t("CANCEL")} onPress={onClose} variant="secondary" style={styles.flexBtn} />
            <Button label={t("FINISH_AND_LOG")} onPress={handleSave} variant="primary" style={styles.flexBtn} />
          </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (colors, fonts) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalContent: {
    backgroundColor: colors.backgroundAlt,
    padding: 24,
    borderTopWidth: 1,
    borderColor: colors.border,
    maxHeight: '85%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 20,
    color: colors.primary,
    letterSpacing: 1,
    // The spacing below now belongs to the row, so the title stays vertically
    // centred against the illustration beside it.
    flexShrink: 1,
  },
  targetBox: {
    backgroundColor: colors.backgroundCard,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderAlt,
    marginBottom: 24,
    alignItems: 'center',
  },
  targetLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    fontFamily: fonts.semiBold,
    fontSize: 24,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderAlt,
    backgroundColor: colors.background,
    padding: 12,
    textAlign: 'center',
  },
  progressBox: {
    marginVertical: 16,
    alignItems: 'center',
  },
  progressLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  progressValue: {
    fontFamily: fonts.bold,
    fontSize: 32,
    color: colors.primaryLight,
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.borderAlt,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  flexBtn: {
    flex: 1,
  },
});
