import { useTranslation } from '../../i18n';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import Button from '../atoms/Button';
import ExerciseCard from '../molecules/ExerciseCard';

/**
 * How long the workout has been running, as mm:ss (h:mm:ss past the hour).
 * `now` is a parameter so the format is testable without freezing the clock.
 * A missing, malformed, or future `startedAt` reads as 00:00 rather than
 * putting NaN or a negative clock on screen — phone/server skew is real.
 */
export function formatElapsed(startedAt, now = Date.now()) {
  if (!startedAt) return '00:00';
  const startMs = Date.parse(startedAt);
  if (!Number.isFinite(startMs)) return '00:00';

  const totalSeconds = Math.max(0, Math.floor((now - startMs) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatRest(totalSeconds) {
  const safe = Math.max(0, Math.round(totalSeconds || 0));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

/**
 * The workout itself, taking over the whole screen while a session is open.
 *
 * Everything that is setup rather than training — routine tabs, the mesocycle
 * panel, the add-exercise button — is deliberately absent: mid-set the user
 * wants the clock, the rest button, and the exercises of the routine they are
 * actually training, and nothing to tap by mistake. TrainScreen renders this
 * instead of its normal content, and App.js hides the tab bar underneath it.
 */
export default function WorkoutSessionView({
  routineName,
  exercises,
  activeSummary,
  isFinishing,
  onFinish,
  onOpenExercise,
  onSetOneRm,
  isSettingOneRm,
  restTimer,
  restDurationSec,
}) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);

  const [, forceTick] = useState(0);

  // Drives the elapsed readout. Cleared on unmount and as soon as the session
  // closes, so a finished workout leaves no interval behind.
  useEffect(() => {
    if (!activeSummary) return undefined;
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [activeSummary]);

  const isResting = restTimer.isRunning;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.clockGroup}>
          <Text style={styles.clockLabel} numberOfLines={1}>
            {routineName || t('WORKOUT_IN_PROGRESS')}
          </Text>
          <Text style={styles.clock}>{formatElapsed(activeSummary?.startedAt)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.restBtn, isResting && styles.restBtnActive]}
          onPress={() => (isResting ? restTimer.stop() : restTimer.start())}
          activeOpacity={0.8}
          testID="session-rest-toggle"
        >
          <Text style={[styles.restBtnText, isResting && styles.restBtnTextActive]}>
            {isResting ? formatRest(restTimer.remainingSec) : t('START_REST')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.stat}>
          {activeSummary?.exerciseCount ?? 0} {t('EXERCISES_LOGGED')}
        </Text>
        <Text style={styles.stat}>
          {activeSummary?.totalSets ?? 0} {t('SETS_LOGGED')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {exercises.length === 0 ? (
          <Text style={styles.emptyText}>{t('EMPTY_EXERCISES')}</Text>
        ) : (
          <View style={styles.exerciseList}>
            {exercises.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                onLog={onOpenExercise}
                onSetOneRm={onSetOneRm}
                isSettingOneRm={isSettingOneRm}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('FINISH_WORKOUT')}
          onPress={onFinish}
          loading={isFinishing}
          variant="danger"
        />
      </View>
    </View>
  );
}

const getStyles = (colors, fonts) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.primary,
      backgroundColor: colors.backgroundAlt,
    },
    clockGroup: {
      flex: 1,
      gap: 2,
    },
    clockLabel: {
      fontFamily: fonts.medium,
      fontSize: 12,
      letterSpacing: 1,
      color: colors.textSecondary,
    },
    clock: {
      fontFamily: fonts.bold,
      fontSize: 32,
      color: colors.textPrimary,
    },
    restBtn: {
      minHeight: 44,
      minWidth: 88,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      flexShrink: 0,
    },
    restBtnActive: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.danger,
    },
    restBtnText: {
      fontFamily: fonts.semiBold,
      fontSize: 12,
      letterSpacing: 1,
      color: colors.background,
      textAlign: 'center',
    },
    restBtnTextActive: {
      fontSize: 18,
      color: colors.danger,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 24,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    stat: {
      fontFamily: fonts.medium,
      fontSize: 12,
      letterSpacing: 0.6,
      color: colors.textSecondary,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 24,
    },
    exerciseList: {
      gap: 16,
    },
    emptyText: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 32,
    },
    footer: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.borderAlt,
      backgroundColor: colors.backgroundAlt,
    },
  });
