import { useTranslation } from '../i18n';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Svg, { Polygon, Line, Circle } from 'react-native-svg';
import { useTheme } from '../theme/useTheme';
import { useDataScreen } from '../hooks/useDataScreen';
import AsyncState, { shouldRenderState } from '../components/molecules/AsyncState';

export default function DataScreen() {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);

  const {
    lifts1rm,
    compounds,
    isLoading,
    error,
    isEmpty,
    handleRetry,
    size,
    center,
    radius,
    getPoint,
    radarGrid,
    radarPolygon,
    radarPrevPolygon,
  } = useDataScreen();

  const state = { isLoading, error, isEmpty };

  if (shouldRenderState(state)) {
    return (
      <View style={styles.container}>
        <AsyncState
          {...state}
          errorLabel={t('ERROR_LOADING_STATS')}
          emptyLabel={t('EMPTY_LIFTS')}
          onRetry={handleRetry}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>STATS & BALANCE</Text>
          <View style={styles.sectionDivider} />
        </View>

        <View style={styles.liftsContainer}>
          <Text style={styles.liftsTitle}>1RM COMPARISON</Text>
          {compounds.map((lift) => {
            const currVal = Number(lift.value) || 0;
            const prevVal = Number(lift.prev) || 0;
            const maxForLift = Math.max(currVal, prevVal, 1);
            const currPct = (currVal / maxForLift) * 100;
            const prevPct = (prevVal / maxForLift) * 100;

            return (
              <View key={lift.id} style={styles.liftBlock}>
                <View style={styles.liftHeader}>
                  <Text style={styles.liftName}>{lift.name}</Text>
                  <Text style={styles.liftLegend}>PREV / CURR</Text>
                </View>

                <View style={styles.barRow}>
                  <Text style={styles.barLabel}>{prevVal}{t("KG")}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, styles.barFillPrev, { width: `${prevPct}%` }]} />
                  </View>
                </View>

                <View style={styles.barRow}>
                  <Text style={[styles.barLabel, styles.barLabelCurr]}>{currVal}{t("KG")}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, styles.barFillCurr, { width: `${currPct}%` }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.balanceContainer}>
          <Text style={styles.liftsTitle}>EXERCISE BALANCE</Text>
          <View style={styles.radarWrapper}>
            <Svg width={size} height={size}>
              {/* Grid levels */}
              {radarGrid.map((points, i) => (
                <Polygon key={`grid-${i}`} points={points} fill="none" stroke={colors.borderAlt} strokeWidth="1" />
              ))}

              {/* Axes lines */}
              {lifts1rm.map((_, i) => {
                const angle = (i * 2 * Math.PI) / lifts1rm.length;
                const x2 = center + radius * Math.cos(angle - Math.PI / 2);
                const y2 = center + radius * Math.sin(angle - Math.PI / 2);
                return <Line key={`axis-${i}`} x1={center} y1={center} x2={x2} y2={y2} stroke={colors.borderAlt} strokeWidth="1" />;
              })}

              {/* Prev Data Polygon */}
              <Polygon points={radarPrevPolygon} fill={colors.textSecondary} opacity="0.1" stroke={colors.borderLight} strokeWidth="2" />

              {/* Current Data Polygon */}
              <Polygon points={radarPolygon} fill={`${colors.primary}40`} stroke={colors.primary} strokeWidth="2" />

              {/* Data points */}
              {lifts1rm.map((lift, i) => {
                const angle = (i * 2 * Math.PI) / lifts1rm.length;
                const pt = getPoint(Number(lift.value) || 0, angle).split(',');
                return <Circle key={`pt-${i}`} cx={pt[0]} cy={pt[1]} r="4" fill={colors.primary} />;
              })}
            </Svg>
          </View>
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
    padding: 20,
    paddingBottom: 32,
    gap: 32,
  },
  sectionHeader: {
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: 0.8,
    color: colors.textPrimary,
  },
  sectionDivider: {
    height: 2,
    backgroundColor: colors.border,
  },
  liftsContainer: {
    gap: 24,
  },
  liftsTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    letterSpacing: 2,
    color: colors.primary,
  },
  liftBlock: {
    gap: 8,
  },
  liftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  liftName: {
    fontFamily: fonts.medium,
    fontSize: 14,
    letterSpacing: 1.4,
    color: colors.textSecondary,
  },
  liftLegend: {
    fontFamily: fonts.regular,
    fontSize: 12,
    letterSpacing: 1.4,
    color: colors.textMuted,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barLabel: {
    width: 48,
    textAlign: 'right',
    fontFamily: fonts.regular,
    fontSize: 15,
    letterSpacing: 0.8,
    color: colors.textSecondary,
  },
  barLabelCurr: {
    color: colors.textPrimary,
  },
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'center',
  },
  barFill: {
    height: 10,
    marginLeft: 1,
  },
  barFillPrev: {
    backgroundColor: colors.borderLight,
  },
  barFillCurr: {
    backgroundColor: colors.primary,
  },
  balanceContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 24,
    alignItems: 'center',
    gap: 16,
  },
  radarWrapper: {
    width: 300,
    height: 300,
    borderRadius: 12,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
