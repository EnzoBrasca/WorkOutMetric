import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../theme/useTheme';
import { useProfileScreen } from '../hooks/useProfileScreen';
import NeumorphicSurface from '../components/atoms/NeumorphicSurface';

export default function ProfileScreen() {
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);

  const {
    currentT,
    message,
    loading,

    newUsername,
    setNewUsername,
    newPassword,
    setNewPassword,
    handleUpdate,

    theme,
    font,
    language,
    setTheme,
    setFont,
    setLanguage,

    customColors,
    handleSelectDarkBackground,
    handleSelectLightBackground,
    handleSelectAccentColor,

    logout,
  } = useProfileScreen();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{currentT.title}</Text>
          <View style={styles.sectionDivider} />
        </View>

        {!!message && (
          <Text style={[styles.message, { color: message === currentT.success ? colors.primary : colors.danger }]}>
            {message}
          </Text>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>{currentT.account}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{currentT.username}</Text>
            <NeumorphicSurface variant="pressed" radius={12}>
              <TextInput
                style={styles.input}
                value={newUsername}
                onChangeText={setNewUsername}
                placeholder="Username"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </NeumorphicSurface>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{currentT.password}</Text>
            <NeumorphicSurface variant="pressed" radius={12}>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="********"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />
            </NeumorphicSurface>
          </View>

          <TouchableOpacity onPress={handleUpdate} disabled={loading}>
            <NeumorphicSurface backgroundColor={colors.primary} radius={14} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>{loading ? '...' : currentT.save}</Text>
            </NeumorphicSurface>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>{currentT.personalization}</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{currentT.theme}</Text>
            <View style={styles.settingOptions}>
              {['dark', 'light', 'custom'].map((opt) => (
                <TouchableOpacity key={opt} style={styles.optionBtnTouchable} onPress={() => setTheme(opt)}>
                  <NeumorphicSurface
                    variant={theme === opt ? 'pressed' : 'raised'}
                    backgroundColor={theme === opt ? colors.primary : undefined}
                    radius={12}
                    style={styles.optionBtn}
                    stretch
                  >
                    <Text style={[styles.optionText, theme === opt && styles.optionTextActive]}>{opt}</Text>
                  </NeumorphicSurface>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {theme === 'custom' && (
            <View style={styles.customColorsContainer}>
              <Text style={styles.label}>SELECT ACCENT COLOR</Text>
              <View style={styles.colorPalette}>
                {['#FF7300', '#39ff14', '#00FFFF', '#FF00FF', '#FFD700', '#EF4444', '#3B82F6', '#8B5CF6'].map((colorHex) => (
                  <TouchableOpacity key={colorHex} onPress={() => handleSelectAccentColor(colorHex)}>
                    <NeumorphicSurface
                      variant={customColors.primary === colorHex ? 'pressed' : 'raised'}
                      backgroundColor={colorHex}
                      radius={22}
                      style={[
                        styles.colorCircle,
                        customColors.primary === colorHex && styles.colorCircleSelected,
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>BACKGROUND STYLE</Text>
              <View style={styles.settingOptions}>
                <TouchableOpacity style={styles.optionBtnTouchable} onPress={handleSelectDarkBackground}>
                  <NeumorphicSurface
                    variant={customColors.background === '#131313' ? 'pressed' : 'raised'}
                    backgroundColor={customColors.background === '#131313' ? colors.primary : undefined}
                    radius={12}
                    style={styles.optionBtn}
                    stretch
                  >
                    <Text style={[styles.optionText, customColors.background === '#131313' && styles.optionTextActive]}>DARK</Text>
                  </NeumorphicSurface>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionBtnTouchable} onPress={handleSelectLightBackground}>
                  <NeumorphicSurface
                    variant={customColors.background === '#ffffff' ? 'pressed' : 'raised'}
                    backgroundColor={customColors.background === '#ffffff' ? colors.primary : undefined}
                    radius={12}
                    style={styles.optionBtn}
                    stretch
                  >
                    <Text style={[styles.optionText, customColors.background === '#ffffff' && styles.optionTextActive]}>LIGHT</Text>
                  </NeumorphicSurface>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{currentT.font}</Text>
            <NeumorphicSurface variant="pressed" radius={12} style={styles.pickerContainer}>
              <Picker
                selectedValue={font}
                onValueChange={(itemValue) => setFont(itemValue)}
                style={styles.picker}
                itemStyle={{ color: colors.textPrimary }}
                dropdownIconColor={colors.primary}
              >
                <Picker.Item label="Pixelify Sans (Default)" value="PixelifySans_400Regular" />
                <Picker.Item label="System Default" value="System" />
                <Picker.Item label="Roboto" value="Roboto" />
                <Picker.Item label="Inter" value="Inter" />
                <Picker.Item label="Open Sans" value="OpenSans" />
              </Picker>
            </NeumorphicSurface>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{currentT.language}</Text>
            <View style={styles.settingOptions}>
              {['en', 'es'].map((opt) => (
                <TouchableOpacity key={opt} style={styles.optionBtnTouchable} onPress={() => setLanguage(opt)}>
                  <NeumorphicSurface
                    variant={language === opt ? 'pressed' : 'raised'}
                    backgroundColor={language === opt ? colors.primary : undefined}
                    radius={12}
                    style={styles.optionBtn}
                    stretch
                  >
                    <Text style={[styles.optionText, language === opt && styles.optionTextActive]}>{opt.toUpperCase()}</Text>
                  </NeumorphicSurface>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={logout}>
          <NeumorphicSurface variant="pressed" radius={14} style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>{currentT.logout}</Text>
          </NeumorphicSurface>
        </TouchableOpacity>

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
    padding: 20,
    paddingBottom: 32,
    gap: 32,
  },
  sectionHeader: {
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: 0.8,
    color: colors.textPrimary,
  },
  sectionDivider: {
    height: 2,
    backgroundColor: colors.border,
  },
  section: {
    gap: 16,
  },
  sectionSubtitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.primary,
    marginBottom: 8,
    letterSpacing: 1,
  },
  message: {
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlign: 'center',
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  input: {
    color: colors.textPrimary,
    fontFamily: fonts.regular,
    padding: 12,
    fontSize: 16,
  },
  saveButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontFamily: fonts.semiBold,
    color: colors.background,
    fontSize: 16,
    letterSpacing: 1,
  },
  settingRow: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
  },
  settingLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  settingOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  optionBtnTouchable: {
    flex: 1,
  },
  optionBtn: {
    padding: 10,
    alignItems: 'center',
  },
  optionText: {
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    fontSize: 14,
  },
  optionTextActive: {
    color: colors.background, // If button is primary (orange), text is white
    fontFamily: fonts.semiBold,
  },
  logoutButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  logoutButtonText: {
    fontFamily: fonts.semiBold,
    color: colors.danger,
    fontSize: 16,
    letterSpacing: 1,
  },
  customColorsContainer: {
    gap: 12,
    marginBottom: 16,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: colors.borderAlt,
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleSelected: {
    borderColor: colors.textPrimary,
    transform: [{ scale: 1.1 }],
  },
  pickerContainer: {
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: colors.textPrimary,
    backgroundColor: 'transparent',
  },
});
