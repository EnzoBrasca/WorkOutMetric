import { useTranslation } from '../i18n';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';
import { useAuthStore } from '../store/useAuthStore';
import Button from '../components/atoms/Button';
import NeumorphicSurface from '../components/atoms/NeumorphicSurface';

export default function LoginScreen({ navigation }) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore(state => state.login);

  const handleLogin = async () => {
    setErrorMsg('');
    if (username.trim() && password.trim()) {
      setIsLoading(true);
      const result = await login(username, password);
      setIsLoading(false);
      if (!result.success) {
        setErrorMsg(result.error);
      }
    } else {
      setErrorMsg(t("ERROR_FIELDS_REQUIRED"));
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.content}>
        <Text style={styles.title} maxFontSizeMultiplier={1.3}>{t("METRIC_LAB")}</Text>
        <Text style={styles.subtitle}>{t("LOGIN")}</Text>

        {errorMsg ? <Text style={styles.errorText}>[!] {errorMsg}</Text> : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("USERNAME")}</Text>
          <NeumorphicSurface variant="pressed" radius={12}>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder={t("USERNAME")}
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
            />
          </NeumorphicSurface>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("PASSWORD")}</Text>
          <NeumorphicSurface variant="pressed" radius={12}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={t("PASSWORD")}
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
            />
          </NeumorphicSurface>
        </View>

        {/* The shared atom rather than a hand-rolled button: it already owns
            the raised surface, the loading spinner and the disabled state, and
            a snowflake button here is how this screen fell behind the restyle
            in the first place. */}
        <Button
          label={t("LOGIN")}
          onPress={handleLogin}
          variant="primary"
          loading={isLoading}
          style={styles.submitBtn}
        />

        <TouchableOpacity 
          style={styles.linkBtn} 
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.linkText}>{t("NO_ACCOUNT_REGISTER")}</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors, fonts) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 42,
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 2,
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.danger,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 1,
  },
  // The sunken surface around it paints the field now.
  input: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textPrimary,
    padding: 16,
  },
  // A little taller than the atom's default: it is the only action on an
  // otherwise empty screen, and it lost some presence when the hand-rolled
  // 18px/wide-tracked label became the app's standard button type.
  submitBtn: {
    paddingVertical: 18,
    marginTop: 12,
  },
  linkBtn: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
