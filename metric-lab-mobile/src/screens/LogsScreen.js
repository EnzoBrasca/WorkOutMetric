import { useTranslation } from '../i18n';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../theme/useTheme';
import Button from '../components/atoms/Button';
import SessionHistoryRow from '../components/molecules/SessionHistoryRow';
import { useLogsScreen } from '../hooks/useLogsScreen';

export default function LogsScreen() {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);

  const {
    history,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    selectedSessionId,
    handleSelectSession,
    handleRetry,
    handleLoadMore,
  } = useLogsScreen();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Svg width="16" height="14" viewBox="0 0 16 14" fill={colors.primary}>
            <Rect x="0" y="0" width="16" height="2" />
            <Rect x="0" y="6" width="12" height="2" />
            <Rect x="0" y="12" width="8" height="2" />
          </Svg>
          <Text style={styles.headerTitle}>{t('HISTORICAL_REGISTRY')}</Text>
        </View>

        {isLoading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.stateContainer}>
            <Text style={styles.errorText}>{t('ERROR_LOADING_HISTORY')}</Text>
            <Button label={t('RETRY')} onPress={handleRetry} variant="secondary" style={styles.stateBtn} />
          </View>
        ) : history.length === 0 ? (
          <View style={styles.stateContainer}>
            <Text style={styles.emptyText}>{t('NO_WORKOUTS_LOGGED')}</Text>
          </View>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, styles.colLeft]}>{t('DATE')}</Text>
              <Text style={[styles.th, styles.colCenter]}>{t('VOLUME')}</Text>
              <Text style={[styles.th, styles.colRight]}>{t('DELTA')}</Text>
            </View>
            {history.map((session) => (
              <SessionHistoryRow
                key={session.id}
                session={session}
                expanded={selectedSessionId === session.id}
                onPress={() => handleSelectSession(session.id)}
              />
            ))}
            {hasMore && (
              <Button
                label={t('LOAD_MORE')}
                onPress={handleLoadMore}
                loading={isLoadingMore}
                variant="secondary"
                style={styles.stateBtn}
              />
            )}
          </View>
        )}
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
    gap: 24,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderAlt,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.primary,
  },
  stateContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  stateBtn: {
    minWidth: 160,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tableHeaderRow: {
    height: 41,
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  th: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  colLeft: {
    flex: 1,
    textAlign: 'left',
  },
  colCenter: {
    flex: 1,
    textAlign: 'center',
  },
  colRight: {
    flex: 1,
    textAlign: 'right',
  },
});
