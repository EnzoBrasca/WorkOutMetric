import { useTranslation } from '../../i18n';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import Button from '../atoms/Button';
import NeumorphicSurface from '../atoms/NeumorphicSurface';

// Suggestions, not an enum: `routines.type` is a freeform TEXT column
// (migration 009) precisely so a user whose split is "Torso / Pierna" is not
// forced into a push/pull vocabulary. CUSTOM reveals a free-text field.
export const ROUTINE_TYPE_SUGGESTIONS = ['PUSH', 'PULL', 'LEGS', 'ARMS', 'ABS'];
export const CUSTOM_TYPE = '__custom__';

// The routine's baseline sets and reps, used when no mesocycle is driving the
// numbers. Defaults match the API's own (services/routinesService), so an
// exercise added without touching these lands on the same 3x8 either way.
export const DEFAULT_TARGET_SETS = '3';
export const DEFAULT_TARGET_REPS = '8';

/**
 * A target is only meaningful for an exercise that is actually in the routine,
 * so unselected rows are not validated — their inputs are not even rendered,
 * and holding a stale invalid value against the user would block a save on a
 * field they cannot see.
 */
export function validateRoutineForm(name, selectedIds = [], targetsById = {}) {
  const errors = {};

  if (!String(name ?? '').trim()) {
    errors.name = 'VALIDATION_REQUIRED';
  }

  const badTargets = selectedIds.filter((id) => {
    const target = targetsById[id];
    return !isPositiveInteger(target?.sets) || !isPositiveInteger(target?.reps);
  });

  if (badTargets.length > 0) {
    errors.targets = 'VALIDATION_POSITIVE';
    errors.targetIds = badTargets;
  }

  return errors;
}

function isPositiveInteger(value) {
  const text = String(value ?? '').trim();
  if (!text) return false;
  const parsed = Number(text);
  return Number.isInteger(parsed) && parsed > 0;
}

export default function RoutineFormModal({
  visible,
  onClose,
  onSave,
  initialData,
  catalogOptions = [],
  isSaving,
}) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, fonts);

  const isEditMode = Boolean(initialData);

  const [name, setName] = useState('');
  const [typeChoice, setTypeChoice] = useState(ROUTINE_TYPE_SUGGESTIONS[0]);
  const [customType, setCustomType] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  // Kept for every exercise the user has touched, not just the selected ones,
  // so unticking a row and putting it back does not silently reset the numbers
  // they had just typed.
  const [targetsById, setTargetsById] = useState({});
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const initialType = String(initialData?.type ?? '').trim();
    // A type the suggestions do not cover (or none at all) reopens as CUSTOM
    // with the stored text, so editing never silently retags the routine.
    const isSuggested = ROUTINE_TYPE_SUGGESTIONS.includes(initialType.toUpperCase());

    setName(initialData?.name ?? '');
    setTypeChoice(isEditMode && !isSuggested ? CUSTOM_TYPE : isSuggested ? initialType.toUpperCase() : ROUTINE_TYPE_SUGGESTIONS[0]);
    setCustomType(isSuggested ? '' : initialType);
    setDescription(initialData?.description ?? '');
    setSelectedIds(initialData?.exerciseIds ?? []);
    setTargetsById(initialData?.exerciseTargets ?? {});
    setTouched(false);
  }, [visible, initialData, isEditMode]);

  const errors = validateRoutineForm(name, selectedIds, targetsById);
  const hasErrors = Object.keys(errors).length > 0;

  // Selecting an exercise for the first time seeds the routine's baseline, so
  // the inputs are never empty and a user who does not care about the numbers
  // can just tick the box and save.
  const toggleExercise = (exerciseId) => {
    setSelectedIds((previous) =>
      previous.includes(exerciseId)
        ? previous.filter((id) => id !== exerciseId)
        : [...previous, exerciseId]
    );

    setTargetsById((previous) =>
      previous[exerciseId]
        ? previous
        : {
            ...previous,
            [exerciseId]: { sets: DEFAULT_TARGET_SETS, reps: DEFAULT_TARGET_REPS },
          }
    );
  };

  const setTarget = (exerciseId, field, value) => {
    setTargetsById((previous) => ({
      ...previous,
      [exerciseId]: { ...previous[exerciseId], [field]: value },
    }));
  };

  const handleSave = async () => {
    setTouched(true);
    if (hasErrors) return;

    const result = await onSave({
      name: name.trim(),
      type: (typeChoice === CUSTOM_TYPE ? customType : typeChoice).trim(),
      description: description.trim(),
      exerciseIds: selectedIds,
      // Numbers, not the input's text, and scoped to what is actually in the
      // routine — a target left behind by an unticked exercise is not part of
      // this routine and must not be sent.
      exerciseTargets: Object.fromEntries(
        selectedIds.map((id) => [
          id,
          {
            sets: parseInt(targetsById[id]?.sets, 10),
            reps: parseInt(targetsById[id]?.reps, 10),
          },
        ])
      ),
    });

    if (result?.success !== false) {
      onClose();
    }
  };

  const fieldError = (key) => (touched && errors[key] ? t(errors[key]) : null);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>
              {isEditMode ? t('EDIT_ROUTINE') : t('NEW_ROUTINE')}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('ROUTINE_NAME')}</Text>
              <NeumorphicSurface variant="pressed" radius={12}>
                <TextInput
                  testID="routine-name-input"
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('ROUTINE_NAME_PLACEHOLDER')}
                  placeholderTextColor={colors.textSecondary}
                  maxLength={40}
                />
              </NeumorphicSurface>
              {fieldError('name') ? (
                <Text testID="routine-name-error" style={styles.fieldError}>{fieldError('name')}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('ROUTINE_TYPE')}</Text>
              <NeumorphicSurface variant="pressed" radius={12} style={styles.pickerContainer}>
                <Picker
                  testID="routine-type-picker"
                  selectedValue={typeChoice}
                  onValueChange={setTypeChoice}
                  style={styles.picker}
                  itemStyle={{ color: colors.textPrimary }}
                  dropdownIconColor={colors.primary}
                >
                  {ROUTINE_TYPE_SUGGESTIONS.map((suggestion) => (
                    <Picker.Item key={suggestion} label={suggestion} value={suggestion} />
                  ))}
                  <Picker.Item label={t('CUSTOM_TYPE')} value={CUSTOM_TYPE} />
                </Picker>
              </NeumorphicSurface>
              {typeChoice === CUSTOM_TYPE ? (
                <NeumorphicSurface variant="pressed" radius={12} style={styles.customTypeInput}>
                  <TextInput
                    testID="routine-custom-type-input"
                    style={styles.input}
                    value={customType}
                    onChangeText={setCustomType}
                    placeholder={t('CUSTOM_TYPE_PLACEHOLDER')}
                    placeholderTextColor={colors.textSecondary}
                    maxLength={24}
                  />
                </NeumorphicSurface>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('ROUTINE_DETAILS')}</Text>
              <NeumorphicSurface variant="pressed" radius={12}>
                <TextInput
                  testID="routine-description-input"
                  style={[styles.input, styles.descriptionInput]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t('ROUTINE_DETAILS_PLACEHOLDER')}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  maxLength={200}
                />
              </NeumorphicSurface>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('ROUTINE_EXERCISES')}</Text>
              <Text style={styles.targetHint}>{t('ROUTINE_TARGETS_HINT')}</Text>
              {/* Deliberately NOT filtered by exercise.type: an exercise gets
                  its type BY being added to a routine, so filtering here would
                  hide every unassigned exercise and every one being moved to a
                  routine of a different type. */}
              {catalogOptions.length === 0 ? (
                <Text style={styles.emptyText}>{t('NO_CATALOG_EXERCISES')}</Text>
              ) : (
                <NeumorphicSurface variant="pressed" radius={16} style={styles.exerciseList}>
                  {catalogOptions.map((exercise) => {
                    const isSelected = selectedIds.includes(exercise.id);
                    const target = targetsById[exercise.id] ?? {};

                    return (
                      // A View, not a TouchableOpacity: the target inputs live
                      // inside this row, and a tap meant for a text field must
                      // not untick the exercise underneath it.
                      <View
                        key={exercise.id}
                        style={[styles.exerciseRow, isSelected && styles.exerciseRowSelected]}
                      >
                        <TouchableOpacity
                          style={styles.exerciseToggle}
                          onPress={() => toggleExercise(exercise.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.checkbox}>{isSelected ? '[X]' : '[ ]'}</Text>
                          <Text
                            style={[styles.exerciseName, isSelected && styles.exerciseNameSelected]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {exercise.name}
                          </Text>
                        </TouchableOpacity>

                        {isSelected ? (
                          <View style={styles.targetGroup}>
                            <NeumorphicSurface variant="pressed" radius={8} style={styles.targetWrap}>
                              <TextInput
                                testID={`routine-target-sets-${exercise.id}`}
                                style={styles.targetInput}
                                value={String(target.sets ?? '')}
                                onChangeText={(value) => setTarget(exercise.id, 'sets', value)}
                                keyboardType="numeric"
                                maxLength={2}
                                accessibilityLabel={t('TARGET_SETS_LABEL')}
                              />
                            </NeumorphicSurface>
                            <Text style={styles.targetSeparator}>x</Text>
                            <NeumorphicSurface variant="pressed" radius={8} style={styles.targetWrap}>
                              <TextInput
                                testID={`routine-target-reps-${exercise.id}`}
                                style={styles.targetInput}
                                value={String(target.reps ?? '')}
                                onChangeText={(value) => setTarget(exercise.id, 'reps', value)}
                                keyboardType="numeric"
                                maxLength={3}
                                accessibilityLabel={t('TARGET_REPS_LABEL')}
                              />
                            </NeumorphicSurface>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </NeumorphicSurface>
              )}
              {fieldError('targets') ? (
                <Text testID="routine-targets-error" style={styles.fieldError}>
                  {fieldError('targets')}
                </Text>
              ) : null}
            </View>

            <View style={[styles.buttonRow, { marginBottom: insets.bottom + 16 }]}>
              <Button
                label={t('CANCEL')}
                onPress={onClose}
                variant="secondary"
                style={styles.flexBtn}
              />
              <Button
                label={t('SAVE')}
                onPress={handleSave}
                variant="primary"
                loading={isSaving}
                disabled={(touched && hasErrors) || isSaving}
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
    // A rounded sheet rising out of the overlay, in place of the hard 1px lip
    // it used to have. No shadow: it sits on a dimmed backdrop, which already
    // separates it from whatever is behind.
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
  customTypeInput: {
    marginTop: 8,
  },
  descriptionInput: {
    minHeight: 72,
    textAlignVertical: 'top',
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
  exerciseList: {
    paddingVertical: 4,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  // The tap target for membership. It takes the leftover width so the name
  // stays tappable along its whole length, with the targets pinned right.
  exerciseToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
  },
  targetGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  // The surface holds the width the bordered input used to hold itself.
  targetWrap: {
    minWidth: 40,
  },
  targetInput: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textPrimary,
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlign: 'center',
  },
  targetSeparator: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  targetHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  // A quiet fill rather than a surface of its own: the rows sit inside the
  // sunken list, and a shadow per row on top of a shadow per input would be a
  // lot of drawing for a list that can hold the whole catalog.
  exerciseRowSelected: {
    backgroundColor: colors.background,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  checkbox: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.primary,
  },
  exerciseName: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  exerciseNameSelected: {
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  fieldError: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
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
