import { useTranslation } from '../../i18n';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/useTheme';

function formatMMSS(totalSeconds) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Manual start/stop rest-period countdown (FRONTEND_TODO 2.7). Purely
// presentational — the interval that drives remainingSec lives in
// useRestTimer, owned by whichever screen renders this.
export default function RestTimer({ remainingSec, isRunning, durationSec, onStart, onStop }) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('REST_TIMER')}</Text>
      <Text style={styles.clock}>{formatMMSS(isRunning ? remainingSec : durationSec)}</Text>
      <TouchableOpacity
        style={[styles.btn, isRunning ? styles.stopBtn : styles.startBtn]}
        onPress={() => (isRunning ? onStop() : onStart())}
        activeOpacity={0.8}
      >
        <Text style={[styles.btnText, isRunning ? styles.stopBtnText : styles.startBtnText]}>
          {isRunning ? t('STOP_REST') : t('START_REST')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors, fonts) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 8,
    },
    label: {
      fontFamily: fonts.medium,
      fontSize: 12,
      letterSpacing: 1,
      color: colors.textSecondary,
    },
    clock: {
      fontFamily: fonts.bold,
      fontSize: 20,
      color: colors.primary,
      flex: 1,
      textAlign: 'center',
    },
    btn: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    startBtn: {
      backgroundColor: colors.primary,
    },
    stopBtn: {
      borderWidth: 1,
      borderColor: colors.danger,
    },
    btnText: {
      fontFamily: fonts.semiBold,
      fontSize: 12,
      letterSpacing: 1,
    },
    startBtnText: {
      color: colors.background,
    },
    stopBtnText: {
      color: colors.danger,
    },
  });
