import { useTranslation } from '../../i18n';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../../theme/useTheme';
import Button from '../atoms/Button';

// Train no longer types a free-text exercise name: it can only pick an
// existing catalog exercise and join it to the active tab's routine. Editing
// an already-joined exercise only ever changes its target sets/reps — the
// exercise identity is fixed once it's in the routine, so the picker is
// locked away in that case.
export function validateRoutineExercise(exerciseId, targetSets, targetReps, isEditMode) {
  const errors = {};

  if (!isEditMode && !exerciseId) {
    errors.exercise = 'ERROR_EXERCISE_REQUIRED';
  }

  const setsText = String(targetSets ?? '').trim();
  if (!setsText) {
    errors.targetSets = 'VALIDATION_REQUIRED';
  } else {
    const parsed = Number(setsText);
    if (!Number.isInteger(parsed)) errors.targetSets = 'VALIDATION_INTEGER';
    else if (parsed <= 0) errors.targetSets = 'VALIDATION_POSITIVE';
  }

  const repsText = String(targetReps ?? '').trim();
  if (!repsText) {
    errors.targetReps = 'VALIDATION_REQUIRED';
  } else {
    const parsed = Number(repsText);
    if (!Number.isInteger(parsed)) errors.targetReps = 'VALIDATION_INTEGER';
    else if (parsed <= 0) errors.targetReps = 'VALIDATION_POSITIVE';
  }

  return errors;
}

export default function RoutineExerciseModal({
  visible,
  onClose,
  onSave,
  initialData,
  catalogOptions = [],
  isSaving,
}) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);

  const isEditMode = Boolean(initialData);

  const [exerciseId, setExerciseId] = useState('');
  const [targetSets, setTargetSets] = useState('3');
  const [targetReps, setTargetReps] = useState('8');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      setExerciseId(initialData.exerciseId);
      setTargetSets(String(initialData.targetSets ?? 3));
      setTargetReps(String(initialData.targetReps ?? 8));
    } else {
      setExerciseId(catalogOptions[0]?.id || '');
      setTargetSets('3');
      setTargetReps('8');
    }
    setTouched(false);
  }, [initialData, visible, catalogOptions, isEditMode]);

  const errors = validateRoutineExercise(exerciseId, targetSets, targetReps, isEditMode);
  const hasErrors = Object.keys(errors).length > 0;
  const catalogEmpty = !isEditMode && catalogOptions.length === 0;

  const handleSave = () => {
    setTouched(true);
    if (hasErrors || catalogEmpty) return;

    onSave({
      exerciseId,
      targetSets: parseInt(targetSets, 10),
      targetReps: parseInt(targetReps, 10),
    });
    onClose();
  };

  const fieldError = (key) => (touched && errors[key] ? t(errors[key]) : null);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{isEditMode ? t("EDIT_TARGET") : t("ADD_TO_ROUTINE")}</Text>

            {catalogEmpty ? (
              <Text style={styles.warningText}>{t("NO_CATALOG_EXERCISES")}</Text>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t("SELECT_EXERCISE")}</Text>
                  {isEditMode ? (
                    <Text style={styles.lockedExerciseName}>{initialData.name}</Text>
                  ) : (
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={exerciseId}
                        onValueChange={setExerciseId}
                        style={styles.picker}
                        itemStyle={{ color: colors.textPrimary }}
                        dropdownIconColor={colors.primary}
                      >
                        {catalogOptions.map((exercise) => (
                          <Picker.Item key={exercise.id} label={exercise.name} value={exercise.id} />
                        ))}
                      </Picker>
                    </View>
                  )}
                  {fieldError('exercise') ? (
                    <Text style={styles.fieldError}>{fieldError('exercise')}</Text>
                  ) : null}
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>{t("TARGET_SETS_LABEL")}</Text>
                    <TextInput
                      style={styles.input}
                      value={targetSets}
                      onChangeText={setTargetSets}
                      keyboardType="numeric"
                      placeholder="3"
                      placeholderTextColor={colors.textSecondary}
                    />
                    {fieldError('targetSets') ? (
                      <Text style={styles.fieldError}>{fieldError('targetSets')}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>{t("TARGET_REPS_LABEL")}</Text>
                    <TextInput
                      style={styles.input}
                      value={targetReps}
                      onChangeText={setTargetReps}
                      keyboardType="numeric"
                      placeholder="8"
                      placeholderTextColor={colors.textSecondary}
                    />
                    {fieldError('targetReps') ? (
                      <Text style={styles.fieldError}>{fieldError('targetReps')}</Text>
                    ) : null}
                  </View>
                </View>
              </>
            )}

            <View style={styles.buttonRow}>
              <Button label={t("CANCEL")} onPress={onClose} variant="secondary" style={styles.flexBtn} />
              <Button
                label={t("SAVE")}
                onPress={handleSave}
                variant="primary"
                loading={isSaving}
                disabled={(touched && hasErrors) || catalogEmpty || isSaving}
                style={styles.flexBtn}
              />
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
  modalTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 24,
    color: colors.primary,
    marginBottom: 24,
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
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderAlt,
    backgroundColor: colors.background,
    padding: 12,
  },
  lockedExerciseName: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderAlt,
    backgroundColor: colors.background,
    padding: 12,
  },
  fieldError: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
  },
  warningText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.borderAlt,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  picker: {
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    marginBottom: 32, // Padding for safe area
  },
  flexBtn: {
    flex: 1,
  },
});
