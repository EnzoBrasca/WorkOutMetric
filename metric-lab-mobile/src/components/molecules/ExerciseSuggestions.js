import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from '../../i18n';
import { useTheme } from '../../theme/useTheme';
import ExerciseGuideImage from '../atoms/ExerciseGuideImage';
import NeumorphicSurface from '../atoms/NeumorphicSurface';

// Catalog matches for the name being typed into the new-exercise form.
//
// Purely assistive: ignoring the list and typing a name that matches nothing is
// a normal way to create an exercise, so this never blocks the form and shows
// no empty state. It disappears once a suggestion is taken.
export default function ExerciseSuggestions({ suggestions, onSelect }) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);

  if (!suggestions.length) return null;

  return (
    <NeumorphicSurface variant="pressed" radius={16} style={styles.container}>
      <Text style={styles.hint}>{t('GUIDE_SUGGESTIONS_HINT')}</Text>
      {suggestions.map((suggestion) => (
        <TouchableOpacity
          key={suggestion.slug}
          style={styles.row}
          onPress={() => onSelect(suggestion)}
          activeOpacity={0.8}
        >
          <ExerciseGuideImage slug={suggestion.slug} size={36} />
          <View style={styles.rowText}>
            <Text style={styles.name} numberOfLines={1}>{suggestion.name}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {suggestion.primaryMuscle} · {suggestion.equipment}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </NeumorphicSurface>
  );
}

const getStyles = (colors, fonts) => StyleSheet.create({
  // Sunken rather than bordered: it reads as a well the matches drop into,
  // below the (also sunken) name field it belongs to. No backgroundColor of
  // its own -- the surface's default already sits on the form's card, and a
  // lighter fill would fight the recessed shadow.
  container: {
    marginTop: 8,
    paddingBottom: 4,
  },
  hint: {
    fontFamily: fonts.medium,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.textSecondary,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    // Tall enough to stay a comfortable tap target in a list of six.
    minHeight: 48,
    paddingVertical: 6,
  },
  rowText: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.primary,
  },
  meta: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textSecondary,
  },
});
