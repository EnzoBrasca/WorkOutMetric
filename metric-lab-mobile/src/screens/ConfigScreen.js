import { useTranslation } from '../i18n';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { useConfigScreen } from '../hooks/useConfigScreen';
import AsyncState, { shouldRenderState } from '../components/molecules/AsyncState';
import Button from '../components/atoms/Button';
import NeumorphicSurface from '../components/atoms/NeumorphicSurface';
import MesocycleModal from '../components/organisms/MesocycleModal';
import ExerciseSuggestions from '../components/molecules/ExerciseSuggestions';
import { EQUIPMENT_OPTIONS, equipmentWeightLabel } from '../utils/equipment';

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
    hasMoreLifts,
    remainingLiftCount,
    handleLoadMoreLifts,
    isLoading,
    error,
    isEmpty,
    handleRetry,

    newExerciseName,
    createError,
    isCreatingExercise,
    handleChangeNewExerciseName,
    exerciseSuggestions,
    handleSelectSuggestion,
    handleCreateExercise,

    newExerciseEquipment,
    newExerciseUnits,
    showUnitsPicker,
    handleChangeNewExerciseEquipment,
    handleChangeNewExerciseUnits,

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

    mesocycles,
    activeMesocycleId,
    isMesocycleSaving,
    mesocycleModalVisible,
    pendingDeleteMesocycleId,
    handleOpenMesocycleModal,
    handleCloseMesocycleModal,
    handleCreateMesocycle,
    handleActivateMesocycle,
    handleDeactivateMesocycle,
    handleDeleteMesocycle,

    localRestTimerSeconds,
    restTimerError,
    handleChangeRestTimerSeconds,
  } = useConfigScreen();

  const catalogState = { isLoading, error, isEmpty };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.configSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("PAST_MESOCYCLES")}</Text>
          </View>

          {mesocycles.length === 0 ? (
            <Text style={styles.emptyText}>{t("NO_MESOCYCLES_YET")}</Text>
          ) : (
            <View style={styles.liftsList}>
              {mesocycles.map((mesocycle) => {
                const isActive = mesocycle.id === activeMesocycleId;
                const isPendingDelete = pendingDeleteMesocycleId === mesocycle.id;

                return (
                  <NeumorphicSurface key={mesocycle.id} style={styles.liftCard}>
                    <View style={styles.liftHeaderRow}>
                      <View style={styles.liftNameGroup}>
                        <Text style={styles.liftName} numberOfLines={1} ellipsizeMode="tail">
                          {mesocycle.name}
                        </Text>
                        <Text style={styles.liftType}>
                          {t('WEEKS_SHORT')} {mesocycle.current_week}/{mesocycle.total_weeks}
                          {isActive ? ` · ${t('ACTIVE')}` : ''}
                        </Text>
                      </View>
                      <View style={styles.liftActions}>
                        <TouchableOpacity
                          onPress={() =>
                            isActive
                              ? handleDeactivateMesocycle()
                              : handleActivateMesocycle(mesocycle.id)
                          }
                          testID={`mesocycle-toggle-${mesocycle.id}`}
                        >
                          <Text style={styles.actionText}>
                            {isActive ? t('END_MESOCYCLE') : t('SWITCH_MESOCYCLE')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteMesocycle(mesocycle.id)}
                          testID={`mesocycle-delete-${mesocycle.id}`}
                        >
                          <Text style={[styles.actionText, { color: colors.danger }]}>
                            {isPendingDelete ? t('CONFIRM') : t('DEL')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    {isPendingDelete ? (
                      <Text style={styles.confirmText}>
                        {t('CONFIRM_DELETE_MESOCYCLE_BODY')}
                      </Text>
                    ) : null}
                  </NeumorphicSurface>
                );
              })}
            </View>
          )}

          <Button
            label={t("NEW_MESOCYCLE")}
            onPress={handleOpenMesocycleModal}
            variant="primary"
          />
        </View>

        <View style={styles.configSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("REST_TIMER")}</Text>
          </View>

          <NeumorphicSurface style={styles.liftRow}>
            <View style={styles.liftInfo}>
              <Text style={styles.liftName}>{t("REST_DURATION_SEC")}</Text>
              {restTimerError ? (
                <Text style={styles.fieldError}>{t(restTimerError)}</Text>
              ) : null}
            </View>
            <NeumorphicSurface variant="pressed" style={styles.liftValueBox}>
              <TextInput
                style={styles.liftInput}
                value={localRestTimerSeconds}
                onChangeText={handleChangeRestTimerSeconds}
                keyboardType="numeric"
              />
              <Text style={styles.liftUnit}>{t("SEC")}</Text>
            </NeumorphicSurface>
          </NeumorphicSurface>
        </View>

        <View style={styles.configSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("EXERCISE_CATALOG")}</Text>
          </View>

          <NeumorphicSurface style={styles.newExerciseBox}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("EXERCISE_NAME")}</Text>
              <NeumorphicSurface variant="pressed" radius={10}>
                <TextInput
                  style={styles.input}
                  value={newExerciseName}
                  onChangeText={handleChangeNewExerciseName}
                  placeholder={t("NEW_EXERCISE_NAME_PLACEHOLDER")}
                  placeholderTextColor={colors.textSecondary}
                  maxLength={40}
                />
              </NeumorphicSurface>
              {createError ? <Text style={styles.fieldError}>{t(createError)}</Text> : null}
              <ExerciseSuggestions
                suggestions={exerciseSuggestions}
                onSelect={handleSelectSuggestion}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("EQUIPMENT")}</Text>
              <View style={styles.chipRow}>
                {EQUIPMENT_OPTIONS.map((option) => {
                  const isSelected = newExerciseEquipment === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => handleChangeNewExerciseEquipment(option.value)}
                      activeOpacity={0.8}
                    >
                      <NeumorphicSurface
                        variant={isSelected ? 'pressed' : 'raised'}
                        backgroundColor={isSelected ? colors.primary : undefined}
                        radius={14}
                        style={styles.chip}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                          {t(option.labelKey)}
                        </Text>
                      </NeumorphicSurface>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {showUnitsPicker ? (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("EQUIP_UNITS")}</Text>
                <View style={styles.chipRow}>
                  {[
                    { value: 1, labelKey: 'EQUIP_UNITS_ONE' },
                    { value: 2, labelKey: 'EQUIP_UNITS_TWO' },
                  ].map((option) => {
                    const isSelected = newExerciseUnits === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => handleChangeNewExerciseUnits(option.value)}
                        activeOpacity={0.8}
                      >
                        <NeumorphicSurface
                          variant={isSelected ? 'pressed' : 'raised'}
                          backgroundColor={isSelected ? colors.primary : undefined}
                          radius={14}
                          style={styles.chip}
                        >
                          <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                            {t(option.labelKey)}
                          </Text>
                        </NeumorphicSurface>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <Button
              label={t("CREATE")}
              onPress={handleCreateExercise}
              variant="primary"
              loading={isCreatingExercise}
            />

            {/* Required by the illustrations' CC BY-SA 4.0 licence. It sits
                here because this is where they first appear in the app. */}
            <Text style={styles.guideAttribution}>{t('GUIDE_ATTRIBUTION')}</Text>
          </NeumorphicSurface>

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
                  <NeumorphicSurface key={lift.id} style={styles.liftCard}>
                    <View style={styles.liftHeaderRow}>
                      <View style={styles.liftNameGroup}>
                        {isEditingName ? (
                          <NeumorphicSurface variant="pressed" radius={8}>
                            <TextInput
                              style={styles.renameInput}
                              value={renameValue}
                              onChangeText={handleChangeRenameValue}
                              autoFocus
                              maxLength={40}
                            />
                          </NeumorphicSurface>
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
                          <Text style={styles.inlineUnit}>
                            {equipmentWeightLabel(t, lift.equipment, lift.equipment_units)}
                          </Text>
                          {lift.isManual ? (
                            <NeumorphicSurface radius={8} style={styles.manualBadge}>
                              <Text style={styles.manualBadgeText}>{t('MANUAL_BADGE')}</Text>
                            </NeumorphicSurface>
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
                        <NeumorphicSurface variant="pressed" radius={8}>
                          <TextInput
                            style={styles.setInput}
                            value={rowInput.weight || ''}
                            onChangeText={(text) => handleChangeRowWeight(lift.id, text)}
                            keyboardType="numeric"
                            placeholder={t('WEIGHT')}
                            placeholderTextColor={colors.textSecondary}
                          />
                        </NeumorphicSurface>
                        {rowError.weight ? (
                          <Text style={styles.fieldError}>{t(rowError.weight)}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.setSeparator}>×</Text>
                      <View style={styles.setInputGroup}>
                        <NeumorphicSurface variant="pressed" radius={8}>
                          <TextInput
                            style={styles.setInput}
                            value={rowInput.reps || ''}
                            onChangeText={(text) => handleChangeRowReps(lift.id, text)}
                            keyboardType="numeric"
                            placeholder={t('REPS')}
                            placeholderTextColor={colors.textSecondary}
                          />
                        </NeumorphicSurface>
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
                  </NeumorphicSurface>
                );
              })}

              {hasMoreLifts ? (
                <Button
                  label={`${t('LOAD_MORE')} (${remainingLiftCount})`}
                  onPress={handleLoadMoreLifts}
                  variant="secondary"
                />
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>

      <MesocycleModal
        visible={mesocycleModalVisible}
        onClose={handleCloseMesocycleModal}
        onSave={handleCreateMesocycle}
        isSaving={isMesocycleSaving}
      />
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
    padding: 12,
  },
  liftsList: {
    gap: 12,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  liftCard: {
    backgroundColor: colors.background,
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
  // A soft raised pill in place of the 1px outline. It cannot lean on a fill
  // to stand out -- the card under it is already `background`, and a custom
  // theme collapses `backgroundAlt` onto that same value -- so the shadow is
  // what separates it in every theme.
  manualBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  manualBadgeText: {
    fontFamily: fonts.medium,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.primaryLight,
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
    // Holds the equipment label ("KG · POR MANCUERNA (x2)") now, not a bare
    // "KG": it has to wrap rather than push the row off-screen.
    flexShrink: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.background,
  },
  fieldError: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.danger,
  },
  guideAttribution: {
    fontFamily: fonts.regular,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
});
