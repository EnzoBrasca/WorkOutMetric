import { useTranslation } from '../../i18n';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import Button from '../atoms/Button';
import NeumorphicSurface from '../atoms/NeumorphicSurface';

// Train no longer types a free-text exercise name: it can only pick an
// existing catalog exercise and join it to the active tab's routine.
//
// Adding is all this does now. Changing an already-joined exercise's target
// sets/reps moved to the Routines tab, where the routine's membership is
// edited — this modal's old edit mode was reachable only from a card button
// that crashed during a workout.
export function validateRoutineExercise(exerciseId, targetSets, targetReps) {
  const errors = {};

  if (!exerciseId) {
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
  catalogOptions = [],
  isSaving,
}) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, fonts);

  const [exerciseId, setExerciseId] = useState('');
  const [targetSets, setTargetSets] = useState('3');
  const [targetReps, setTargetReps] = useState('8');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setExerciseId(catalogOptions[0]?.id || '');
    setTargetSets('3');
    setTargetReps('8');
    setTouched(false);
  }, [visible, catalogOptions]);

  const errors = validateRoutineExercise(exerciseId, targetSets, targetReps);
  const hasErrors = Object.keys(errors).length > 0;
  const catalogEmpty = catalogOptions.length === 0;

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
            <Text style={styles.modalTitle}>{t("ADD_TO_ROUTINE")}</Text>

            {catalogEmpty ? (
              <Text style={styles.warningText}>{t("NO_CATALOG_EXERCISES")}</Text>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t("SELECT_EXERCISE")}</Text>
                  <NeumorphicSurface variant="pressed" radius={12} style={styles.pickerContainer}>
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
                  </NeumorphicSurface>
                  {fieldError('exercise') ? (
                    <Text style={styles.fieldError}>{fieldError('exercise')}</Text>
                  ) : null}
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>{t("TARGET_SETS_LABEL")}</Text>
                    <NeumorphicSurface variant="pressed" radius={12}>
                      <TextInput
                        style={styles.input}
                        value={targetSets}
                        onChangeText={setTargetSets}
                        keyboardType="numeric"
                        placeholder="3"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </NeumorphicSurface>
                    {fieldError('targetSets') ? (
                      <Text style={styles.fieldError}>{fieldError('targetSets')}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>{t("TARGET_REPS_LABEL")}</Text>
                    <NeumorphicSurface variant="pressed" radius={12}>
                      <TextInput
                        style={styles.input}
                        value={targetReps}
                        onChangeText={setTargetReps}
                        keyboardType="numeric"
                        placeholder="8"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </NeumorphicSurface>
                    {fieldError('targetReps') ? (
                      <Text style={styles.fieldError}>{fieldError('targetReps')}</Text>
                    ) : null}
                  </View>
                </View>
              </>
            )}

            <View style={[styles.buttonRow, { marginBottom: insets.bottom + 16 }]}>
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
    // Rounded sheet instead of the old hard 1px lip. No shadow of its own: the
    // dimmed backdrop already separates it from the screen behind.
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: colors.textPrimary,
    // The surface underneath paints the field; an opaque picker would cover it.
    backgroundColor: 'transparent',
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
