import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from '../../i18n';
import { useTheme } from '../../theme/useTheme';
import ExerciseGuideImage from '../atoms/ExerciseGuideImage';

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
    <View style={styles.container}>
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
    </View>
  );
}

const getStyles = (colors, fonts) => StyleSheet.create({
  container: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundCard,
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
