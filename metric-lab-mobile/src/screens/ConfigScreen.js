import { useTranslation } from '../i18n';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { useConfigScreen } from '../hooks/useConfigScreen';
import AsyncState, { shouldRenderState } from '../components/molecules/AsyncState';
import Button from '../components/atoms/Button';

// Was a hardcoded "04.2024" rendered as if it were live.
function currentMonthLabel() {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
}

function typeLabel(t, type) {
  const normalized = String(type ?? '').toLowerCase();
  if (normalized === 'push') return t('PUSH');
  if (normalized === 'pull') return t('PULL');
  return type || '—';
}

export default function ConfigScreen() {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);
  const {
    localLifts,
    isLoading,
    error,
    isEmpty,
    handleRetry,

    newExerciseName,
    createError,
    isCreatingExercise,
    handleChangeNewExerciseName,
    handleCreateExercise,

    editingId,
    renameValue,
    handleChangeRenameValue,
    handleStartRename,
    handleCancelRename,
    handleConfirmRename,

    pendingDeleteId,
    handleDeleteExercise,

    rowInputs,
    rowErrors,
    estimatingIds,
    lowConfidenceByExerciseId,
    handleChangeRowWeight,
    handleChangeRowReps,
    handleSubmitOneRm,

    localRestTimerSeconds,
    restTimerError,
    handleChangeRestTimerSeconds,
  } = useConfigScreen();

  const catalogState = { isLoading, error, isEmpty };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>{t("CURRENT_MONTH")}</Text>
            <Text style={styles.infoValue}>{currentMonthLabel()}</Text>
          </View>
        </View>

        <View style={styles.configSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("EXERCISE_CATALOG")}</Text>
          </View>

          <View style={styles.newExerciseBox}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("EXERCISE_NAME")}</Text>
              <TextInput
                style={styles.input}
                value={newExerciseName}
                onChangeText={handleChangeNewExerciseName}
                placeholder={t("NEW_EXERCISE_NAME_PLACEHOLDER")}
                placeholderTextColor={colors.textSecondary}
                maxLength={40}
              />
              {createError ? <Text style={styles.fieldError}>{t(createError)}</Text> : null}
            </View>
            <Button
              label={t("CREATE")}
              onPress={handleCreateExercise}
              variant="primary"
              loading={isCreatingExercise}
            />
          </View>

          {shouldRenderState(catalogState) ? (
            <AsyncState
              {...catalogState}
              errorLabel={t('ERROR_LOADING_STATS')}
              emptyLabel={t('EMPTY_LIFTS')}
              onRetry={handleRetry}
            />
          ) : (
            <View style={styles.liftsList}>
              {localLifts.map((lift) => {
                const isEditingName = editingId === lift.id;
                const isPendingDelete = pendingDeleteId === lift.id;
                const rowInput = rowInputs[lift.id] || {};
                const rowError = rowErrors[lift.id] || {};
                const isEstimating = Boolean(estimatingIds[lift.id]);
                const isLowConfidence = Boolean(lowConfidenceByExerciseId[lift.id]);

                return (
                  <View key={lift.id} style={styles.liftCard}>
                    <View style={styles.liftHeaderRow}>
                      <View style={styles.liftNameGroup}>
                        {isEditingName ? (
                          <TextInput
                            style={styles.renameInput}
                            value={renameValue}
                            onChangeText={handleChangeRenameValue}
                            autoFocus
                            maxLength={40}
                          />
                        ) : (
                          <Text style={styles.liftName} numberOfLines={1} ellipsizeMode="tail">{lift.name}</Text>
                        )}
                        <Text style={styles.liftType}>{typeLabel(t, lift.type)}</Text>
                      </View>
                      <View style={styles.liftActions}>
                        {isEditingName ? (
                          <>
                            <TouchableOpacity onPress={handleConfirmRename}>
                              <Text style={styles.actionText}>{t('SAVE')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleCancelRename}>
                              <Text style={styles.actionText}>{t('CANCEL')}</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <TouchableOpacity onPress={() => handleStartRename(lift)}>
                            <Text style={styles.actionText}>{t('RENAME')}</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => handleDeleteExercise(lift.id)}>
                          <Text style={[styles.actionText, { color: colors.danger }]}>
                            {isPendingDelete ? t('CONFIRM') : t('DEL')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    {isPendingDelete ? (
                      <Text style={styles.confirmText}>{t('CONFIRM_DELETE_EXERCISE_BODY')}</Text>
                    ) : null}

                    <View style={styles.oneRmInfoRow}>
                      <View>
                        <Text style={styles.infoRowLabel}>{t('REFERENCE_ONE_RM')}</Text>
                        <View style={styles.oneRmValueRow}>
                          <Text style={styles.oneRmValue}>
                            {lift.oneRm != null ? lift.oneRm : '—'}
                          </Text>
                          <Text style={styles.inlineUnit}>{t('KG')}</Text>
                          {lift.isManual ? (
                            <Text style={styles.manualBadge}>{t('MANUAL_BADGE')}</Text>
                          ) : null}
                        </View>
                      </View>
                      {lift.historyValue != null ? (
                        <View>
                          <Text style={styles.infoRowLabel}>{t('BEST_SET')}</Text>
                          <Text style={styles.historyValue}>
                            {lift.historyValue}{t('KG')}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.setRow}>
                      <View style={styles.setInputGroup}>
                        <TextInput
                          style={styles.setInput}
                          value={rowInput.weight || ''}
                          onChangeText={(text) => handleChangeRowWeight(lift.id, text)}
                          keyboardType="numeric"
                          placeholder={t('WEIGHT')}
                          placeholderTextColor={colors.textSecondary}
                        />
                        {rowError.weight ? (
                          <Text style={styles.fieldError}>{t(rowError.weight)}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.setSeparator}>×</Text>
                      <View style={styles.setInputGroup}>
                        <TextInput
                          style={styles.setInput}
                          value={rowInput.reps || ''}
                          onChangeText={(text) => handleChangeRowReps(lift.id, text)}
                          keyboardType="numeric"
                          placeholder={t('REPS')}
                          placeholderTextColor={colors.textSecondary}
                        />
                        {rowError.reps ? (
                          <Text style={styles.fieldError}>{t(rowError.reps)}</Text>
                        ) : null}
                      </View>
                    </View>
                    <Button
                      label={t('CALCULATE_ONE_RM')}
                      onPress={() => handleSubmitOneRm(lift.id)}
                      variant="primary"
                      loading={isEstimating}
                      style={styles.calculateBtn}
                    />
                    {rowError.submit ? (
                      <Text style={styles.fieldError}>{t(rowError.submit)}</Text>
                    ) : null}
                    {isLowConfidence ? (
                      <Text style={styles.lowConfidenceText}>{t('LOW_CONFIDENCE_WARNING')}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.configSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("REST_TIMER")}</Text>
          </View>

          <View style={styles.liftRow}>
            <View style={styles.liftInfo}>
              <Text style={styles.liftName}>{t("REST_DURATION_SEC")}</Text>
              {restTimerError ? (
                <Text style={styles.fieldError}>{t(restTimerError)}</Text>
              ) : null}
            </View>
            <View style={styles.liftValueBox}>
              <TextInput
                style={styles.liftInput}
                value={localRestTimerSeconds}
                onChangeText={handleChangeRestTimerSeconds}
                keyboardType="numeric"
              />
              <Text style={styles.liftUnit}>{t("SEC")}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors, fonts) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 32,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 4,
  },
  infoBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderAlt,
    padding: 16,
    gap: 4,
  },
  infoLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.primary,
  },
  infoValue: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textPrimary,
  },
  configSection: {
    gap: 16,
  },
  sectionHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderAlt,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.primary,
  },
  newExerciseBox: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
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
  liftsList: {
    gap: 12,
  },
  liftCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderAlt,
    padding: 16,
    gap: 12,
  },
  liftHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  liftNameGroup: {
    flex: 1,
    gap: 4,
  },
  liftName: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  renameInput: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.background,
    padding: 8,
  },
  liftType: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 0.6,
  },
  liftActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  actionText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  confirmText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.danger,
  },
  oneRmInfoRow: {
    flexDirection: 'row',
    gap: 32,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 12,
  },
  infoRowLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  oneRmValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  oneRmValue: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.primary,
  },
  manualBadge: {
    fontFamily: fonts.medium,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.borderAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  historyValue: {
    fontFamily: fonts.medium,
    fontSize: 18,
    color: colors.textSecondary,
  },
  setRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  setInputGroup: {
    flex: 1,
  },
  setInput: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderAlt,
    backgroundColor: colors.background,
    padding: 10,
    textAlign: 'center',
  },
  setSeparator: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 10,
  },
  calculateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  lowConfidenceText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.danger,
  },
  liftRow: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderAlt,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  liftInfo: {
    flex: 1,
    gap: 4,
  },
  liftValueBox: {
    minWidth: 96,
    minHeight: 47,
    paddingHorizontal: 8,
    gap: 4,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderAlt,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flexShrink: 0,
  },
  liftInput: {
    fontFamily: fonts.semiBold,
    fontSize: 24,
    letterSpacing: 1.2,
    color: colors.primary,
    textAlign: 'center',
    minWidth: 40,
    height: '100%',
  },
  liftUnit: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    opacity: 0.5,
  },
  inlineUnit: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  fieldError: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.danger,
  },
});
