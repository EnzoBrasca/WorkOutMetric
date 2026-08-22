import { useTranslation } from '../../i18n';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import Button from '../atoms/Button';

export default function SessionModal({ visible, onClose, onSave, exercise }) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);
  const [completedSets, setCompletedSets] = useState('');
  const [completedReps, setCompletedReps] = useState('');

  // Extract targets
  const targetSets = exercise?.sets ? parseInt(exercise.sets.split('x')[0], 10) || 0 : 0;
  const targetReps = exercise?.sets ? parseInt(exercise.sets.split('x')[1], 10) || 0 : 0;
  const totalTargetReps = targetSets * targetReps;

  useEffect(() => {
    if (visible && exercise) {
      setCompletedSets(targetSets.toString());
      setCompletedReps(targetReps.toString());
    } else {
      setCompletedSets('');
      setCompletedReps('');
    }
  }, [visible, exercise]);

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
          <Text style={styles.modalTitle}>LOG SESSION: {exercise.name}</Text>
          
          <View style={styles.targetBox}>
            <Text style={styles.targetLabel}>TARGET: {exercise.sets} ({totalTargetReps} TOTAL REPS)</Text>
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

          <View style={styles.buttonRow}>
            <Button label={t("CANCEL")} onPress={onClose} variant="secondary" style={styles.flexBtn} />
            <Button label={t("FINISH_AND_LOG")} onPress={handleSave} variant="primary" style={styles.flexBtn} />
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
    fontSize: 20,
    color: colors.primary,
    marginBottom: 16,
    letterSpacing: 1,
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
    marginBottom: 32, // Padding for safe area
  },
  flexBtn: {
    flex: 1,
  },
});
