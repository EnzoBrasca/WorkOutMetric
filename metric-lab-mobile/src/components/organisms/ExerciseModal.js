import { useTranslation } from '../../i18n';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../../theme/useTheme';
import Button from '../atoms/Button';

const SETS_PATTERN = /^\s*(\d+)\s*[xX]\s*(\d+)\s*$/;

// The "4x8" the user already types is the routine's target sets and reps, so
// membership is derived from it rather than asking for the same numbers twice.
export function parseSets(text) {
  const match = SETS_PATTERN.exec(String(text ?? ''));
  if (!match) return null;
  return { targetSets: parseInt(match[1], 10), targetReps: parseInt(match[2], 10) };
}

function validate(name, weight, sets) {
  const errors = {};

  if (!String(name ?? '').trim()) {
    errors.name = 'VALIDATION_REQUIRED';
  }

  const weightText = String(weight ?? '').trim();
  if (weightText) {
    const parsed = Number(weightText);
    if (!Number.isFinite(parsed)) errors.weight = 'VALIDATION_NUMERIC';
    else if (parsed < 0) errors.weight = 'VALIDATION_POSITIVE';
  }

  const setsText = String(sets ?? '').trim();
  if (setsText && !parseSets(setsText)) {
    errors.sets = 'VALIDATION_SETS_FORMAT';
  }

  return errors;
}

export default function ExerciseModal({ visible, onClose, onSave, initialData, routines = [] }) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);
  const [name, setName] = useState('');
  const [week, setWeek] = useState('WK 1/4');
  const [weight, setWeight] = useState('');
  const [sets, setSets] = useState('');
  const [routineId, setRoutineId] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setWeek(initialData.week || 'WK 1/4');
      setWeight(initialData.weight || '');
      setSets(initialData.sets || '');
    } else {
      setName('');
      setWeek('WK 1/4');
      setWeight('');
      setSets('');
    }
    setRoutineId(initialData?.routineId || routines[0]?.id || '');
    setTouched(false);
  }, [initialData, visible, routines]);

  const errors = validate(name, weight, sets);
  const hasErrors = Object.keys(errors).length > 0;

  const handleSave = () => {
    setTouched(true);
    if (hasErrors) return;

    const parsed = parseSets(sets);

    onSave({
      name: name.trim(),
      week: week || 'WK 1/4',
      weight: weight || '0.0',
      sets: sets || '0x0',
      // Consumed by the caller to give the exercise a routine_exercises row.
      // Without one it can never receive a mesocycle target.
      routineId: routineId || null,
      targetSets: parsed?.targetSets ?? 3,
      targetReps: parsed?.targetReps ?? 8,
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
            <Text style={styles.modalTitle}>{initialData ? t("EDIT_EXERCISE") : t("NEW_EXERCISE")}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("EXERCISE_NAME")}</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. BENCH_PRESS"
                placeholderTextColor={colors.textSecondary}
              />
              {fieldError('name') ? (
                <Text style={styles.fieldError}>{fieldError('name')}</Text>
              ) : null}
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>{t("WEIGHT")} ({t("KG")})</Text>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                  placeholder="e.g. 85.0"
                  placeholderTextColor={colors.textSecondary}
                />
                {fieldError('weight') ? (
                  <Text style={styles.fieldError}>{fieldError('weight')}</Text>
                ) : null}
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>{t("SETS_X_REPS")}</Text>
                <TextInput
                  style={styles.input}
                  value={sets}
                  onChangeText={setSets}
                  placeholder="e.g. 4x8"
                  placeholderTextColor={colors.textSecondary}
                />
                {fieldError('sets') ? (
                  <Text style={styles.fieldError}>{fieldError('sets')}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("ROUTINE")}</Text>
              {routines.length === 0 ? (
                <Text style={styles.warningText}>{t("NOT_IN_ANY_ROUTINE")}</Text>
              ) : (
                <>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={routineId}
                      onValueChange={setRoutineId}
                      style={styles.picker}
                      itemStyle={{ color: colors.textPrimary }}
                      dropdownIconColor={colors.primary}
                    >
                      {routines.map((routine) => (
                        <Picker.Item key={routine.id} label={routine.name} value={routine.id} />
                      ))}
                    </Picker>
                  </View>
                  {!routineId ? (
                    <Text style={styles.warningText}>{t("NOT_IN_ANY_ROUTINE")}</Text>
                  ) : null}
                </>
              )}
            </View>

            <View style={styles.buttonRow}>
              <Button label={t("CANCEL")} onPress={onClose} variant="secondary" style={styles.flexBtn} />
              <Button
                label={t("SAVE")}
                onPress={handleSave}
                variant="primary"
                disabled={touched && hasErrors}
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
  fieldError: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
  },
  warningText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
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
