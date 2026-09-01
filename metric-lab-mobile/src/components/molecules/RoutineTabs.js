import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import NeumorphicSurface from '../atoms/NeumorphicSurface';

// The bar shows three routines at a time and swipes a whole group at once, so
// a user with six routines gets two clean pages instead of a fourth tab half
// cut off at the edge. Both numbers drive the tab width and the snap interval
// together -- they cannot be changed independently.
const TABS_PER_PAGE = 3;
const TAB_GAP = 8;

// One tab per user routine, selected by id. This replaced the hardcoded
// PUSH/PULL pair: routines are user-created and arbitrarily named, so the tab
// label is the routine's name and its freeform `type` shows as a small badge
// underneath — unless the type only restates the name, which is the common
// case for a routine literally called "LEGS".
export default function RoutineTabs({ routines = [], activeRoutineId, onSelect }) {
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);
  const [barWidth, setBarWidth] = useState(0);

  if (routines.length === 0) return null;

  // Three tabs fill the bar exactly, the rest wait one swipe away. Until the
  // bar has been measured — and whenever three or fewer routines mean nothing
  // scrolls at all — the tabs just share the width the way they did before.
  const isPaged = routines.length > TABS_PER_PAGE && barWidth > 0;
  const tabWidth = isPaged
    ? (barWidth - TAB_GAP * (TABS_PER_PAGE - 1)) / TABS_PER_PAGE
    : null;
  // A page is three tabs plus the gap that trails each one, which is what puts
  // the next group's first tab exactly at the left edge after a swipe.
  const pageWidth = tabWidth ? (tabWidth + TAB_GAP) * TABS_PER_PAGE : 0;

  return (
    <View
      testID="routine-tabs"
      style={styles.tabsContainer}
      onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
    >
      <ScrollView
        testID="routine-tabs-scroll"
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContent}
        // snapToInterval rather than pagingEnabled: paging snaps to multiples
        // of the ScrollView's own width, which the gap between groups would
        // put 8px out of step with the tabs on every page.
        snapToInterval={isPaged ? pageWidth : undefined}
        snapToAlignment="start"
        disableIntervalMomentum
        decelerationRate={isPaged ? 'fast' : 'normal'}
      >
        {routines.map((routine) => {
          const isActive = routine.id === activeRoutineId;
          const type = String(routine.type ?? '').trim();
          const showBadge =
            Boolean(type) && type.toUpperCase() !== String(routine.name ?? '').toUpperCase();

          return (
            <TouchableOpacity
              key={routine.id}
              style={[
                styles.tabTouchable,
                // A fixed third of the bar once it pages: growing to fill would
                // fit every routine on one screen and there would be nothing
                // left to swipe.
                tabWidth ? { width: tabWidth, flexGrow: 0, minWidth: 0 } : null,
              ]}
              onPress={() => onSelect(routine.id)}
              activeOpacity={0.8}
            >
              {/* The selected routine reads as pressed into the bar rather than
                  as a filled block: same active/inactive vocabulary the theme
                  and language options on ProfileScreen use. */}
              <NeumorphicSurface
                variant={isActive ? 'pressed' : 'raised'}
                backgroundColor={isActive ? colors.primary : undefined}
                radius={16}
                style={styles.tab}
              >
                <Text
                  style={[styles.tabText, isActive ? styles.activeTabText : styles.inactiveTabText]}
                >
                  {routine.name}
                </Text>
                {showBadge ? (
                  <Text
                    style={[
                      styles.badgeText,
                      isActive ? styles.activeBadgeText : styles.inactiveBadgeText,
                    ]}
                  >
                    {type.toUpperCase()}
                  </Text>
                ) : null}
              </NeumorphicSurface>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors, fonts) => StyleSheet.create({
  tabsContainer: {
    // minHeight, not height: the tab labels scale with the system font size
    // while a fixed container does not, clipping them when "larger text" is on.
    minHeight: 48,
    marginBottom: 16,
  },
  tabsContent: {
    // Tabs stretch to fill the bar when they fit, and scroll when they do not.
    flexGrow: 1,
    // Replaces the 1px divider that used to separate touching tabs: each one
    // is its own surface now, so they need real space between them to read.
    // The snap interval is computed from this exact value.
    gap: TAB_GAP,
  },
  tabTouchable: {
    flexGrow: 1,
    minWidth: 96,
  },
  tab: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tabText: {
    fontSize: 12,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  activeTabText: {
    fontFamily: fonts.bold,
    color: colors.textDark,
  },
  inactiveTabText: {
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  badgeText: {
    fontFamily: fonts.regular,
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 2,
  },
  activeBadgeText: {
    color: colors.textDark,
  },
  inactiveBadgeText: {
    color: colors.textSecondary,
  },
});
