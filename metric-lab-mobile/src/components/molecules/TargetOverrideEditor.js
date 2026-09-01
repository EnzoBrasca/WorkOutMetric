import { useTranslation } from '../../i18n';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import Svg, { Path, Polygon, Rect } from 'react-native-svg';
import { useTheme } from '../../theme/useTheme';
import NeumorphicSurface from '../atoms/NeumorphicSurface';

// The editor lives inside a stat cell that is only half a card wide, so the
// controls are drawn as bare 12x12 glyphs rather than Button atoms -- a Button
// is padded for a form row and swamps the cell. Same hand-drawn react-native-svg
// idiom as TabBarIcon, and the label survives as accessibilityLabel so the
// meaning is not lost with the text.
const GLYPH_SIZE = 12;

// Theme-independent: the glyph itself carries the colour, so this box only
// exists to give the 12px mark a comfortable touch target.
const glyphStyles = StyleSheet.create({
  button: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function CancelGlyph({ color }) {
  return (
    <Svg width={GLYPH_SIZE} height={GLYPH_SIZE} viewBox="0 0 12 12">
      <Path d="M1 1 L11 11" stroke={color} strokeWidth="1.75" />
      <Path d="M11 1 L1 11" stroke={color} strokeWidth="1.75" />
    </Svg>
  );
}

function SaveGlyph({ color }) {
  return (
    <Svg width={GLYPH_SIZE} height={GLYPH_SIZE} viewBox="0 0 12 12">
      <Path d="M1 6.5 L4.5 10 L11 2" stroke={color} strokeWidth="2" fill="none" />
    </Svg>
  );
}

// "Back to the start" rather than a circular arrow: the blocky bar-plus-triangle
// reads at 12px, where an arc does not, and matches TabBarIcon's Rect vocabulary.
function ResetGlyph({ color }) {
  return (
    <Svg width={GLYPH_SIZE} height={GLYPH_SIZE} viewBox="0 0 12 12">
      <Rect x="1" y="2" width="2" height="8" fill={color} />
      <Polygon points="11,2 11,10 4.5,6" fill={color} />
    </Svg>
  );
}

function GlyphButton({ label, onPress, children }) {
  return (
    <TouchableOpacity
      style={glyphStyles.button}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      activeOpacity={0.6}
    >
      {children}
    </TouchableOpacity>
  );
}

/**
 * Renders the "SxR" target sets/reps text, editable in place -- same
 * tap-to-reveal-inputs idiom as OneRmPrompt. `sets`/`reps` are already the
 * EFFECTIVE value (override, mesocycle plan, or routine target -- whichever
 * applies; see resolveEffectiveTarget in useTrainScreen), so this component
 * only ever displays and edits that one number.
 *
 * `editable` gates the whole feature: an override is scoped to
 * (mesocycleId, week), so with no active mesocycle there is nothing to scope
 * it to and the value stays read-only, exactly as it did before this control
 * existed.
 */
export default function TargetOverrideEditor({ sets, reps, hasOverride, editable, onSave, onReset }) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);

  const [isEditing, setIsEditing] = useState(false);
  const [setsText, setSetsText] = useState('');
  const [repsText, setRepsText] = useState('');
  const [error, setError] = useState(null);

  const openEditor = () => {
    if (!editable) return;
    setSetsText(String(sets));
    setRepsText(String(reps));
    setError(null);
    setIsEditing(true);
  };

  const closeEditor = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleSave = () => {
    const result = onSave(setsText, repsText);
    if (result && result.success === false) {
      setError(result.error);
      return;
    }
    closeEditor();
  };

  const handleReset = () => {
    onReset();
    closeEditor();
  };

  if (!isEditing) {
    return (
      <TouchableOpacity
        style={styles.displayRow}
        onPress={openEditor}
        disabled={!editable}
        activeOpacity={editable ? 0.7 : 1}
      >
        <Text style={styles.statValueSets} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
          {sets}x{reps}
        </Text>
        {hasOverride && <Text style={styles.adjustedBadge}>{t('ADJUSTED_BADGE')}</Text>}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.editorContainer}>
      <View style={styles.row}>
        <NeumorphicSurface variant="pressed" radius={8} style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={setsText}
            onChangeText={setSetsText}
            keyboardType="numeric"
            placeholderTextColor={colors.textSecondary}
          />
        </NeumorphicSurface>
        <Text style={styles.xSeparator}>x</Text>
        <NeumorphicSurface variant="pressed" radius={8} style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={repsText}
            onChangeText={setRepsText}
            keyboardType="numeric"
            placeholderTextColor={colors.textSecondary}
          />
        </NeumorphicSurface>
      </View>
      {error && <Text style={styles.errorText}>{t(error)}</Text>}
      <View style={styles.buttonRow}>
        <GlyphButton label={t('CANCEL')} onPress={closeEditor}>
          <CancelGlyph color={colors.textSecondary} />
        </GlyphButton>
        {hasOverride && (
          <GlyphButton label={t('RESET_TO_SUGGESTED')} onPress={handleReset}>
            <ResetGlyph color={colors.textSecondary} />
          </GlyphButton>
        )}
        <GlyphButton label={t('SAVE')} onPress={handleSave}>
          <SaveGlyph color={colors.primary} />
        </GlyphButton>
      </View>
    </View>
  );
}

const getStyles = (colors, fonts) => StyleSheet.create({
  displayRow: {
    gap: 4,
  },
  statValueSets: {
    fontFamily: fonts.bold,
    fontSize: 44,
    letterSpacing: -0.96,
    color: colors.primary,
    lineHeight: 44,
  },
  adjustedBadge: {
    fontFamily: fonts.medium,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.textSecondary,
  },
  editorContainer: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  xSeparator: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.textSecondary,
  },
  // The surface carries the flex now -- the input fills it.
  inputWrap: {
    flex: 1,
  },
  input: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: colors.textPrimary,
    padding: 8,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.danger,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
});
