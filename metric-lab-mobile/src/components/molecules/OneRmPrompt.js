import { useTranslation } from '../../i18n';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import Button from '../atoms/Button';

// Shown wherever a mesocycle plan target has needsOneRm: true — the exercise
// has no 1RM on record, so targetWeight is null and there's nothing honest to
// render as a weight. This lets the user fill the gap on the spot.
export default function OneRmPrompt({ onSubmit, loading }) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    const parsed = parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onSubmit(parsed);
    setValue('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t("NEEDS_ONE_RM")}</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          keyboardType="numeric"
          placeholder="e.g. 100"
          placeholderTextColor={colors.textSecondary}
        />
        <Button
          label={t("SET_ONE_RM")}
          onPress={handleSubmit}
          variant="primary"
          loading={loading}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const getStyles = (colors, fonts) => StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
    gap: 8,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.danger,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderAlt,
    backgroundColor: colors.background,
    padding: 10,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 16,
  },
});
