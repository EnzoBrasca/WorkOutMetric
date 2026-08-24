import { useTranslation } from '../../i18n';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import Button from '../atoms/Button';
import RestTimer from '../molecules/RestTimer';

function formatElapsed(startedAt) {
  if (!startedAt) return '00:00';
  const startMs = Date.parse(startedAt);
  if (!Number.isFinite(startMs)) return '00:00';

  const totalSeconds = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

// The persistent piece of session-lifecycle UI on TrainScreen (FRONTEND_TODO
// 2.6): a START WORKOUT button when nothing is open, and — once a session is
// open — a live elapsed-time readout, a running exercise/set count, the rest
// timer (2.7), and FINISH WORKOUT.
export default function ActiveSessionBar({
  activeSummary,
  isStarting,
  isFinishing,
  onStart,
  onFinish,
  restTimer,
  restDurationSec,
}) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);

  const [, forceTick] = useState(0);

  // Re-render once a second so the elapsed-time readout stays live. Only
  // runs while a session is open, and is always cleared — on unmount or as
  // soon as the session closes (activeSummary becomes null).
  useEffect(() => {
    if (!activeSummary) return undefined;
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [activeSummary]);

  if (!activeSummary) {
    return (
      <View style={styles.startWrapper}>
        <Button label={t('START_WORKOUT')} onPress={onStart} loading={isStarting} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{t('WORKOUT_IN_PROGRESS')}</Text>
        <Text style={styles.elapsed}>{formatElapsed(activeSummary.startedAt)}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>{t('EXERCISES_LOGGED')}</Text>
          <Text style={styles.statValue}>{activeSummary.exerciseCount}</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>{t('SETS_LOGGED')}</Text>
          <Text style={styles.statValue}>{activeSummary.totalSets}</Text>
        </View>
      </View>

      <RestTimer
        remainingSec={restTimer.remainingSec}
        isRunning={restTimer.isRunning}
        durationSec={restDurationSec}
        onStart={() => restTimer.start()}
        onStop={restTimer.stop}
      />

      <Button label={t('FINISH_WORKOUT')} onPress={onFinish} loading={isFinishing} variant="danger" />
    </View>
  );
}

const getStyles = (colors, fonts) =>
  StyleSheet.create({
    startWrapper: {
      marginBottom: 16,
    },
    container: {
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.backgroundAlt,
      padding: 16,
      marginBottom: 16,
      gap: 12,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    title: {
      flex: 1,
      fontFamily: fonts.semiBold,
      fontSize: 14,
      letterSpacing: 1,
      color: colors.primary,
    },
    elapsed: {
      fontFamily: fonts.bold,
      fontSize: 18,
      color: colors.textPrimary,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 16,
    },
    statCol: {
      flex: 1,
      gap: 4,
    },
    statLabel: {
      fontFamily: fonts.medium,
      fontSize: 12,
      letterSpacing: 0.6,
      color: colors.textSecondary,
    },
    statValue: {
      fontFamily: fonts.bold,
      fontSize: 28,
      color: colors.textPrimary,
    },
  });
