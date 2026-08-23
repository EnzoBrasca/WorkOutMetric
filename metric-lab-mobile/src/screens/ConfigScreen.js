import { useTranslation } from '../i18n';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { useConfigScreen } from '../hooks/useConfigScreen';
import AsyncState, { shouldRenderState } from '../components/molecules/AsyncState';

// Was a hardcoded "04.2024" rendered as if it were live.
function currentMonthLabel() {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
}

export default function ConfigScreen() {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);
  const {
    localLifts,
    liftErrors,
    canSave,
    isLoading,
    error,
    isEmpty,
    handleUpdateLift,
    handleReset,
    handleSaveConfig,
    handleRetry,
    localRestTimerSeconds,
    restTimerError,
    handleChangeRestTimerSeconds,
  } = useConfigScreen();

  const liftsState = { isLoading, error, isEmpty };

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
            <Text style={styles.sectionTitle}>{t("ONE_RM_UPLOAD")}</Text>
          </View>

          {shouldRenderState(liftsState) ? (
            <AsyncState
              {...liftsState}
              errorLabel={t('ERROR_LOADING_STATS')}
              emptyLabel={t('EMPTY_LIFTS')}
              onRetry={handleRetry}
            />
          ) : (
            <>
              <View style={styles.liftsList}>
                {localLifts.map((l) => (
                  <View key={l.id} style={styles.liftRow}>
                    <View style={styles.liftInfo}>
                      <Text style={styles.liftType}>{l.type}</Text>
                      <Text style={styles.liftName}>{l.name}</Text>
                      {liftErrors[l.id] ? (
                        <Text style={styles.fieldError}>{t(liftErrors[l.id])}</Text>
                      ) : null}
                    </View>
                    <View style={styles.liftValueBox}>
                      <TextInput
                        style={styles.liftInput}
                        value={l.value.toString()}
                        onChangeText={(text) => handleUpdateLift(l.id, text)}
                        keyboardType="numeric"
                      />
                      <Text style={styles.liftUnit}>{t("KG")}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                  <Text style={styles.resetBtnText}>{t("RESET")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
                  onPress={handleSaveConfig}
                  disabled={!canSave}
                >
                  <Text style={styles.saveBtnText}>{t("SAVE_CONFIG")}</Text>
                </TouchableOpacity>
              </View>
            </>
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
  liftsList: {
    gap: 4,
  },
  liftRow: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderAlt,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liftInfo: {
    gap: 4,
  },
  liftType: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  liftName: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textPrimary,
  },
  liftValueBox: {
    width: 96,
    height: 47,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderAlt,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  liftInput: {
    fontFamily: fonts.semiBold,
    fontSize: 24,
    letterSpacing: 1.2,
    color: colors.primary,
    textAlign: 'center',
    width: '100%',
    height: '100%',
  },
  liftUnit: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    opacity: 0.5,
    position: 'absolute',
    right: 8,
    bottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'flex-end',
    paddingVertical: 8,
  },
  resetBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderAlt,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 1.2,
    color: colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 1.2,
    color: colors.textDark,
  },
  fieldError: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.danger,
  },
});
