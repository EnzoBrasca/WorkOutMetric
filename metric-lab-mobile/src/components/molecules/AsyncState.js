import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from '../../i18n';
import { useTheme } from '../../theme/useTheme';
import Button from '../atoms/Button';

/**
 * Renders the loading / error / empty state for a screen section.
 *
 * Screens used to render nothing while loading and swallow failures into
 * console.error, so a failed request looked exactly like "you have no data".
 *
 * Usage — ask `shouldRenderState` first, then render either this or the content:
 *
 *   {shouldRenderState(s) ? <AsyncState {...s} onRetry={reload} /> : <Content />}
 */
export function shouldRenderState({ isLoading, error, isEmpty }) {
  return Boolean(isLoading || error || isEmpty);
}

export default function AsyncState({
  isLoading,
  error,
  isEmpty,
  errorLabel,
  emptyLabel,
  onRetry,
}) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);

  if (isLoading) {
    return (
      <View style={styles.stateBox}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateBox}>
        <Text style={styles.errorText}>{errorLabel || t('ERROR_GENERIC')}</Text>
        {onRetry ? (
          <Button
            label={t('RETRY')}
            onPress={onRetry}
            variant="secondary"
            style={styles.stateBtn}
          />
        ) : null}
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View style={styles.stateBox}>
        <Text style={styles.emptyText}>{emptyLabel || t('EMPTY_GENERIC')}</Text>
      </View>
    );
  }

  return null;
}

const getStyles = (colors, fonts) =>
  StyleSheet.create({
    stateBox: {
      paddingVertical: 32,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    errorText: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: colors.danger,
      textAlign: 'center',
    },
    emptyText: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    stateBtn: {
      alignSelf: 'center',
    },
  });
