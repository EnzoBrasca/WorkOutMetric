import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../theme/useTheme';

// One tab per user routine, selected by id. This replaced the hardcoded
// PUSH/PULL pair: routines are user-created and arbitrarily named, so the tab
// label is the routine's name and its freeform `type` shows as a small badge
// underneath — unless the type only restates the name, which is the common
// case for a routine literally called "LEGS".
export default function RoutineTabs({ routines = [], activeRoutineId, onSelect }) {
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);

  if (routines.length === 0) return null;

  return (
    <View testID="routine-tabs" style={styles.tabsContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContent}
      >
        {routines.map((routine, index) => {
          const isActive = routine.id === activeRoutineId;
          const type = String(routine.type ?? '').trim();
          const showBadge =
            Boolean(type) && type.toUpperCase() !== String(routine.name ?? '').toUpperCase();

          return (
            <TouchableOpacity
              key={routine.id}
              style={[styles.tab, index > 0 && styles.dividedTab, isActive && styles.activeTab]}
              onPress={() => onSelect(routine.id)}
              activeOpacity={0.8}
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
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  tabsContent: {
    // Tabs stretch to fill the bar when they fit, and scroll when they do not.
    flexGrow: 1,
  },
  tab: {
    flexGrow: 1,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background, // Default inactive
  },
  dividedTab: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  activeTab: {
    backgroundColor: colors.primary,
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
