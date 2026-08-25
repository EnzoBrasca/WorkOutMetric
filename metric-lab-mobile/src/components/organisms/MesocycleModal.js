import { useTranslation } from '../../i18n';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import Button from '../atoms/Button';

const DEFAULT_TOTAL_WEEKS = '4';
const DEFAULT_START_PCT = '60';
const DEFAULT_INCREMENT_PCT = '10';
const DEFAULT_DELOAD_PCT = '50';
// Ramp default per the product decision: 60% -> +10%/week (60/70/80 over
// three weeks). Blocks of 3 weeks or fewer just use it as-is; longer blocks
// expose the increment field below so the ramp doesn't have to be guessed.
const CUSTOM_INCREMENT_THRESHOLD = 3;

// Creating a mesocycle lives on ConfigScreen. It is not bound to a routine any
// more (it covers all of them), so there is no routine to pick and no routine
// name to fall back on — the block has to be named here.
export default function MesocycleModal({ visible, onClose, onSave, isSaving }) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, fonts);

  const [name, setName] = useState('');
  const [totalWeeks, setTotalWeeks] = useState(DEFAULT_TOTAL_WEEKS);
  const [startPct, setStartPct] = useState(DEFAULT_START_PCT);
  const [incrementPct, setIncrementPct] = useState(DEFAULT_INCREMENT_PCT);
  const [deloadEnabled, setDeloadEnabled] = useState(false);
  const [deloadWeek, setDeloadWeek] = useState('');
  const [deloadPct, setDeloadPct] = useState(DEFAULT_DELOAD_PCT);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setName('');
      setTotalWeeks(DEFAULT_TOTAL_WEEKS);
      setStartPct(DEFAULT_START_PCT);
      setIncrementPct(DEFAULT_INCREMENT_PCT);
      setDeloadEnabled(false);
      setDeloadWeek('');
      setDeloadPct(DEFAULT_DELOAD_PCT);
      setError('');
    }
  }, [visible]);

  const totalWeeksNum = parseInt(totalWeeks, 10) || 0;
  const showIncrementField = totalWeeksNum > CUSTOM_INCREMENT_THRESHOLD;

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("ERROR_MESOCYCLE_NAME_REQUIRED"));
      return;
    }

    const startPctNum = parseFloat(startPct);
    if (!Number.isFinite(startPctNum) || startPctNum <= 0 || startPctNum > 100) {
      setError(t("ERROR_START_PCT_RANGE"));
      return;
    }

    const payload = {
      name: trimmedName,
      total_weeks: totalWeeksNum || 4,
      start_pct: startPctNum,
      deload_enabled: deloadEnabled,
    };

    if (showIncrementField) {
      payload.increment_pct = parseFloat(incrementPct) || 10;
    }

    if (deloadEnabled) {
      payload.deload_week = parseInt(deloadWeek, 10) || 1;
      payload.deload_pct = parseFloat(deloadPct) || 50;
    }

    const result = await onSave(payload);
    if (result?.success) {
      onClose();
    } else if (result?.error) {
      setError(result.error);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{t("NEW_MESOCYCLE")}</Text>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("MESOCYCLE_NAME")}</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={t("MESOCYCLE_NAME_PLACEHOLDER")}
                placeholderTextColor={colors.textSecondary}
                maxLength={40}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("TOTAL_WEEKS")}</Text>
              <TextInput
                style={styles.input}
                value={totalWeeks}
                onChangeText={setTotalWeeks}
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("START_PCT")}</Text>
              <TextInput
                style={styles.input}
                value={startPct}
                onChangeText={setStartPct}
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {showIncrementField && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("INCREMENT_PCT")}</Text>
                <TextInput
                  style={styles.input}
                  value={incrementPct}
                  onChangeText={setIncrementPct}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            )}

            <View style={styles.settingRow}>
              <Text style={styles.label}>{t("ENABLE_DELOAD")}</Text>
              <View style={styles.toggleRow}>
                {[false, true].map((opt) => (
                  <Button
                    key={String(opt)}
                    label={opt ? t("ON") : t("OFF")}
                    onPress={() => setDeloadEnabled(opt)}
                    variant={deloadEnabled === opt ? 'primary' : 'secondary'}
                    style={styles.toggleBtn}
                  />
                ))}
              </View>
            </View>

            {deloadEnabled && (
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>{t("DELOAD_WEEK")}</Text>
                  <TextInput
                    style={styles.input}
                    value={deloadWeek}
                    onChangeText={setDeloadWeek}
                    keyboardType="numeric"
                    placeholder="e.g. 4"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>{t("DELOAD_PCT")}</Text>
                  <TextInput
                    style={styles.input}
                    value={deloadPct}
                    onChangeText={setDeloadPct}
                    keyboardType="numeric"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>
            )}

            <View style={[styles.buttonRow, { marginBottom: insets.bottom + 16 }]}>
              <Button label={t("CANCEL")} onPress={onClose} variant="secondary" style={styles.flexBtn} />
              <Button
                label={t("CREATE")}
                onPress={handleSave}
                variant="primary"
                loading={isSaving}
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
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
    marginBottom: 16,
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
  settingRow: {
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
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
