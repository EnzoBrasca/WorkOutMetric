import { useTranslation } from '../i18n';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { useAuthStore } from '../store/useAuthStore';

export default function RegisterScreen({ navigation }) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const register = useAuthStore(state => state.register);

  const handleRegister = async () => {
    setErrorMsg('');
    if (username.trim() && password.trim()) {
      setIsLoading(true);
      const result = await register(username, password);
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
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.content}>
        <Text style={styles.title}>{t("METRIC_LAB")}</Text>
        <Text style={styles.subtitle}>{t("REGISTER")}</Text>

        {errorMsg ? <Text style={styles.errorText}>[!] {errorMsg}</Text> : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("USERNAME")}</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder={t("USERNAME")}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t("PASSWORD")}</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={t("PASSWORD")}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleRegister} activeOpacity={0.8} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.primaryBtnText}>{t("REGISTER")}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.linkBtn} 
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.linkText}>{t("HAVE_ACCOUNT_LOGIN")}</Text>
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
  input: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderAlt,
    backgroundColor: colors.backgroundAlt,
    padding: 16,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: colors.background,
    letterSpacing: 2,
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
