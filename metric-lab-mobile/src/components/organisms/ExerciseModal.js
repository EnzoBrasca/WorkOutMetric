import { useTranslation } from '../../i18n';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import Button from '../atoms/Button';

export default function ExerciseModal({ visible, onClose, onSave, initialData }) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);
  const [name, setName] = useState('');
  const [week, setWeek] = useState('WK 1/4');
  const [weight, setWeight] = useState('');
  const [sets, setSets] = useState('');

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
  }, [initialData, visible]);

  const handleSave = () => {
    onSave({
      name: name || 'NEW_EXERCISE',
      week: week || 'WK 1/4',
      weight: weight || '0.0',
      sets: sets || '0x0',
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
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
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>{t("WEIGHT")} (KG)</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholder="e.g. 85.0"
                placeholderTextColor={colors.textSecondary}
              />
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
            </View>
          </View>

          <View style={styles.buttonRow}>
            <Button label={t("CANCEL")} onPress={onClose} variant="secondary" style={styles.flexBtn} />
            <Button label={t("SAVE")} onPress={handleSave} variant="primary" style={styles.flexBtn} />
          </View>
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
