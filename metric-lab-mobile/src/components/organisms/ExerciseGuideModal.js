import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../../i18n';
import { useTheme } from '../../theme/useTheme';
import { guideFrames } from '../../utils/exerciseGuide';
import Button from '../atoms/Button';
import NeumorphicSurface from '../atoms/NeumorphicSurface';

// The full movement walkthrough, opened by tapping an exercise's illustration
// on its Train card.
//
// Every frame of the movement in order, big enough to actually read -- the
// thumbnail on the card says WHICH exercise it is, this says HOW it is done.
//
// The frames come from the catalog rather than a hardcoded three (see
// guideFrames), and each one is tinted for the same reason the thumbnail is:
// the source artwork is pure white line art that vanishes on a light surface.
export default function ExerciseGuideModal({ visible, onClose, exerciseName, slug }) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, fonts);

  const frames = guideFrames(slug);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle} numberOfLines={2}>{exerciseName}</Text>
          <Text style={styles.subtitle}>{t('GUIDE_HOW_TO')}</Text>

          <ScrollView
            contentContainerStyle={styles.frameList}
            showsVerticalScrollIndicator={false}
          >
            {frames.map((frame, position) => (
              <View key={frame.index} style={styles.frameBlock}>
                <Text style={styles.stepLabel}>
                  {t('GUIDE_STEP')} {position + 1}/{frames.length}
                </Text>
                {/* Sunken, like an input: the illustration is content being
                    presented, not a control, so it reads as set INTO the
                    sheet rather than sitting on top of it. */}
                <NeumorphicSurface variant="pressed" radius={16} style={styles.frameSurface}>
                  <Image
                    testID={`exercise-guide-frame-${frame.index}`}
                    source={frame.url}
                    style={styles.frameImage}
                    tintColor={colors.textPrimary}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    transition={120}
                    onError={() => {}}
                    accessibilityIgnoresInvertColors
                  />
                </NeumorphicSurface>
              </View>
            ))}

            {/* Required by the illustrations' CC BY-SA 4.0 licence, and this
                is the screen that shows them at full size. */}
            <Text style={styles.attribution}>{t('GUIDE_ATTRIBUTION')}</Text>
          </ScrollView>

          <View style={{ marginBottom: insets.bottom + 16 }}>
            <Button label={t('CLOSE')} onPress={onClose} variant="secondary" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors, fonts) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalContent: {
    backgroundColor: colors.backgroundAlt,
    padding: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
  },
  modalTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 22,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 20,
  },
  frameList: {
    gap: 20,
    paddingBottom: 16,
  },
  frameBlock: {
    gap: 8,
  },
  stepLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.textSecondary,
  },
  frameSurface: {
    padding: 12,
  },
  frameImage: {
    width: '100%',
    // The source frames are square, so this keeps them undistorted at any
    // sheet width instead of pinning a pixel height.
    aspectRatio: 1,
  },
  attribution: {
    fontFamily: fonts.regular,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
