import { useTranslation } from '../../i18n';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/useTheme';

function formatDate(iso) {
  if (!iso) return '--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

// null (never 0) means "no prior session to compare against" — render a
// neutral dash instead of a fabricated "0%".
function formatDelta(pct) {
  if (pct === null || pct === undefined) return '--';
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

export default function SessionHistoryRow({ session, expanded, onPress }) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);

  const hasWeek = session.mesocycleWeek !== null && session.mesocycleWeek !== undefined;
  const deltaColor =
    session.volumeDeltaPct === null || session.volumeDeltaPct === undefined
      ? colors.textSecondary
      : session.volumeDeltaPct < 0
        ? colors.danger
        : colors.primary;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.summaryRow}>
        <View style={styles.colLeft}>
          <Text style={styles.date}>{formatDate(session.startedAt)}</Text>
          {hasWeek && (
            <Text style={styles.subtitle}>
              {t('WEEK')} {session.mesocycleWeek}
            </Text>
          )}
        </View>
        <Text style={styles.volume}>{Math.round(session.totalVolume)}</Text>
        <Text style={[styles.delta, { color: deltaColor }]}>{formatDelta(session.volumeDeltaPct)}</Text>
      </View>

      {expanded && (
        <View style={styles.details}>
          {(session.logs ?? []).length === 0 ? (
            <Text style={styles.emptyDetail}>{t('NO_LOGS_IN_SESSION')}</Text>
          ) : (
            session.logs.map((log) => (
              <View key={log.id} style={styles.logRow}>
                <Text style={styles.logName} numberOfLines={1}>{log.name || t('UNKNOWN_EXERCISE')}</Text>
                <Text style={styles.logStats}>
                  {log.completedSets}x{log.completedReps}
                  {log.weight !== null && log.weight !== undefined ? ` @ ${log.weight}${t('KG')}` : ''}
                </Text>
              </View>
            ))
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const getStyles = (colors, fonts) =>
  StyleSheet.create({
    row: {
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      padding: 16,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    colLeft: {
      flex: 1,
      gap: 2,
    },
    date: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: colors.textSecondary,
    },
    subtitle: {
      fontFamily: fonts.medium,
      fontSize: 11,
      color: colors.textMuted,
    },
    volume: {
      flex: 1,
      textAlign: 'center',
      fontFamily: fonts.bold,
      fontSize: 16,
      color: colors.textPrimary,
    },
    delta: {
      flex: 1,
      textAlign: 'right',
      fontFamily: fonts.bold,
      fontSize: 14,
    },
    details: {
      marginTop: 12,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      paddingTop: 12,
    },
    emptyDetail: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.textSecondary,
    },
    logRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    logName: {
      fontFamily: fonts.medium,
      fontSize: 13,
      color: colors.textPrimary,
      flex: 1,
    },
    logStats: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: colors.textSecondary,
    },
  });
