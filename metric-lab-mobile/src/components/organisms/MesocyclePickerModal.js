import { useTranslation } from '../../i18n';
import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import Button from '../atoms/Button';

// Train's activate control: pick which block is running, nothing else.
//
// It replaces the old MesocycleListModal, which also created and deleted from
// here. Creating and managing mesocycles live on ConfigScreen now; all Train
// needs is to swap blocks when one ends, without leaving the screen the user is
// training on.
export default function MesocyclePickerModal({
  visible,
  onClose,
  mesocycles,
  activeMesocycleId,
  onSelect,
}) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, fonts);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('CHOOSE_MESOCYCLE')}</Text>

          <ScrollView style={styles.list}>
            {mesocycles.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>{t('NO_MESOCYCLES_YET')}</Text>
                <Text style={styles.emptyHint}>{t('CREATE_MESOCYCLE_IN_CONFIG_TAB')}</Text>
              </View>
            ) : (
              mesocycles.map((mesocycle) => {
                const isActive = mesocycle.id === activeMesocycleId;

                return (
                  <TouchableOpacity
                    key={mesocycle.id}
                    style={[styles.row, isActive && styles.rowActive]}
                    onPress={() => onSelect(mesocycle.id)}
                    activeOpacity={0.8}
                    testID={`mesocycle-option-${mesocycle.id}`}
                  >
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowName} numberOfLines={1} ellipsizeMode="tail">
                        {mesocycle.name}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {t('WEEKS_SHORT')} {mesocycle.current_week}/{mesocycle.total_weeks}
                        {isActive ? ` · ${t('ACTIVE')}` : ''}
                      </Text>
                    </View>
                    {!isActive ? (
                      <Text style={styles.selectText}>{t('SWITCH_MESOCYCLE')}</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <View style={[styles.buttonRow, { marginBottom: insets.bottom + 16 }]}>
            <Button
              label={t('CANCEL')}
              onPress={onClose}
              variant="secondary"
              style={styles.flexBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors, fonts) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.8)',
    },
    modalContent: {
      backgroundColor: colors.backgroundAlt,
      padding: 24,
      borderTopWidth: 1,
      borderColor: colors.border,
      maxHeight: '85%',
    },
    modalTitle: {
      fontFamily: fonts.semiBold,
      fontSize: 24,
      color: colors.primary,
      marginBottom: 24,
      letterSpacing: 1,
    },
    list: {
      marginBottom: 16,
    },
    emptyBox: {
      paddingVertical: 16,
      gap: 8,
    },
    emptyText: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: colors.textSecondary,
    },
    emptyHint: {
      fontFamily: fonts.medium,
      fontSize: 12,
      letterSpacing: 1.2,
      color: colors.primary,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.borderAlt,
      padding: 12,
      marginBottom: 8,
      gap: 12,
    },
    rowActive: {
      borderColor: colors.primary,
    },
    rowInfo: {
      flex: 1,
      gap: 4,
    },
    rowName: {
      fontFamily: fonts.semiBold,
      fontSize: 16,
      color: colors.textPrimary,
    },
    rowMeta: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.textSecondary,
      letterSpacing: 0.6,
    },
    selectText: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: colors.primary,
      textDecorationLine: 'underline',
      flexShrink: 0,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 16,
    },
    flexBtn: {
      flex: 1,
    },
  });
