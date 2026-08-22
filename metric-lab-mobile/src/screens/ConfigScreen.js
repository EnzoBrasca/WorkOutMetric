import { useTranslation } from '../i18n';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { useConfigScreen } from '../hooks/useConfigScreen';

export default function ConfigScreen() {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);
  const { localLifts, handleUpdateLift, handleReset, handleSaveConfig } = useConfigScreen();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>PHASE</Text>
            <Text style={styles.infoValue}>HYPERTROPHY</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>CURRENT MONTH</Text>
            <Text style={styles.infoValue}>04.2024</Text>
          </View>
        </View>

        <View style={styles.configSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>1RM UPLOAD</Text>
          </View>

          <View style={styles.liftsList}>
            {localLifts.map((l) => (
              <View key={l.id} style={styles.liftRow}>
                <View style={styles.liftInfo}>
                  <Text style={styles.liftType}>{l.type}</Text>
                  <Text style={styles.liftName}>{l.name}</Text>
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
              <Text style={styles.resetBtnText}>RESET</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveConfig}>
              <Text style={styles.saveBtnText}>SAVE CONFIG</Text>
            </TouchableOpacity>
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
  saveBtnText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 1.2,
    color: colors.textDark,
  },
});
