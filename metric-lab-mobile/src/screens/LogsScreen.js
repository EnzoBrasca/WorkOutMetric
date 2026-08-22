import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../theme/useTheme';

export default function LogsScreen() {
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);
  const logs = [
    { period: '2024.03', value: '145.0', delta: '+1.8%', color: colors.primary },
    { period: '2024.02', value: '142.5', delta: '+2.4%', color: colors.primary },
    { period: '2024.01', value: '139.0', delta: '-0.7%', color: colors.danger },
    { period: '2023.12', value: '140.0', delta: '+3.7%', color: colors.primary },
    { period: '2023.11', value: '135.0', delta: '--', color: colors.textSecondary },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Svg width="16" height="14" viewBox="0 0 16 14" fill={colors.primary}>
            <Rect x="0" y="0" width="16" height="2" />
            <Rect x="0" y="6" width="12" height="2" />
            <Rect x="0" y="12" width="8" height="2" />
          </Svg>
          <Text style={styles.headerTitle}>HISTORICAL REGISTRY</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colLeft]}>PERIOD</Text>
            <Text style={[styles.th, styles.colCenter]}>RECORD</Text>
            <Text style={[styles.th, styles.colRight]}>DELTA</Text>
          </View>
          {logs.map((log, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.tdPeriod, styles.colLeft]}>{log.period}</Text>
              <Text style={[styles.tdValue, styles.colCenter]}>{log.value}KG</Text>
              <Text style={[styles.tdDelta, styles.colRight, { color: log.color }]}>{log.delta}</Text>
            </View>
          ))}
        </View>
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
  tableRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
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
  tdPeriod: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  tdValue: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  tdDelta: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
});
