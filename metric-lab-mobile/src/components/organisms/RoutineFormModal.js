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

// Suggestions, not an enum: `routines.type` is a freeform TEXT column
// (migration 009) precisely so a user whose split is "Torso / Pierna" is not
// forced into a push/pull vocabulary. CUSTOM reveals a free-text field.
export const ROUTINE_TYPE_SUGGESTIONS = ['PUSH', 'PULL', 'LEGS', 'ARMS', 'ABS'];
export const CUSTOM_TYPE = '__custom__';

export function validateRoutineForm(name) {
  const errors = {};
  if (!String(name ?? '').trim()) {
    errors.name = 'VALIDATION_REQUIRED';
  }
  return errors;
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
    setTouched(false);
  }, [visible, initialData, isEditMode]);

  const errors = validateRoutineForm(name);
  const hasErrors = Object.keys(errors).length > 0;

  const toggleExercise = (exerciseId) => {
    setSelectedIds((previous) =>
      previous.includes(exerciseId)
        ? previous.filter((id) => id !== exerciseId)
        : [...previous, exerciseId]
    );
  };

  const handleSave = async () => {
    setTouched(true);
    if (hasErrors) return;

    const result = await onSave({
      name: name.trim(),
      type: (typeChoice === CUSTOM_TYPE ? customType : typeChoice).trim(),
      description: description.trim(),
      exerciseIds: selectedIds,
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
              <TextInput
                testID="routine-name-input"
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={t('ROUTINE_NAME_PLACEHOLDER')}
                placeholderTextColor={colors.textSecondary}
                maxLength={40}
              />
              {fieldError('name') ? (
                <Text testID="routine-name-error" style={styles.fieldError}>{fieldError('name')}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('ROUTINE_TYPE')}</Text>
              <View style={styles.pickerContainer}>
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
              </View>
              {typeChoice === CUSTOM_TYPE ? (
                <TextInput
                  testID="routine-custom-type-input"
                  style={[styles.input, styles.customTypeInput]}
                  value={customType}
                  onChangeText={setCustomType}
                  placeholder={t('CUSTOM_TYPE_PLACEHOLDER')}
                  placeholderTextColor={colors.textSecondary}
                  maxLength={24}
                />
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('ROUTINE_DETAILS')}</Text>
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
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('ROUTINE_EXERCISES')}</Text>
              {/* Deliberately NOT filtered by exercise.type: an exercise gets
                  its type BY being added to a routine, so filtering here would
                  hide every unassigned exercise and every one being moved to a
                  routine of a different type. */}
              {catalogOptions.length === 0 ? (
                <Text style={styles.emptyText}>{t('NO_CATALOG_EXERCISES')}</Text>
              ) : (
                <View style={styles.exerciseList}>
                  {catalogOptions.map((exercise) => {
                    const isSelected = selectedIds.includes(exercise.id);
                    return (
                      <TouchableOpacity
                        key={exercise.id}
                        style={[styles.exerciseRow, isSelected && styles.exerciseRowSelected]}
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
                    );
                  })}
                </View>
              )}
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
  customTypeInput: {
    marginTop: 8,
  },
  descriptionInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.borderAlt,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  exerciseList: {
    borderWidth: 1,
    borderColor: colors.borderAlt,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exerciseRowSelected: {
    backgroundColor: colors.background,
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
