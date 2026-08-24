import { useTranslation } from '../../i18n';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import Button from '../atoms/Button';

// Lists every mesocycle the user has created so a past block can be made active
// again or removed. Previously the store supported both but the only exposed
// action was "END", which just deactivated the current one locally.
export default function MesocycleListModal({
  visible,
  onClose,
  mesocycles,
  activeMesocycleId,
  onSelect,
  onDelete,
  onCreatePress,
}) {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, fonts);

  // Deleting is destructive and irreversible, so it takes a second tap on the
  // same row rather than firing straight from the list.
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  useEffect(() => {
    if (!visible) setPendingDeleteId(null);
  }, [visible]);

  const handleDelete = (id) => {
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id);
      return;
    }
    setPendingDeleteId(null);
    onDelete(id);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('PAST_MESOCYCLES')}</Text>

          <ScrollView style={styles.list}>
            {mesocycles.length === 0 ? (
              <Text style={styles.emptyText}>{t('NO_ACTIVE_MESOCYCLE')}</Text>
            ) : (
              mesocycles.map((mesocycle) => {
                const isActive = mesocycle.id === activeMesocycleId;
                const isPendingDelete = pendingDeleteId === mesocycle.id;

                return (
                  <View key={mesocycle.id} style={styles.row}>
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowName}>{mesocycle.name}</Text>
                      <Text style={styles.rowMeta}>
                        {t('WEEKS_SHORT')} {mesocycle.current_week}/{mesocycle.total_weeks}
                        {isActive ? ` · ${t('ACTIVE')}` : ''}
                      </Text>
                      {isPendingDelete ? (
                        <Text style={styles.confirmText}>
                          {t('CONFIRM_DELETE_MESOCYCLE_BODY')}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.rowActions}>
                      {!isActive && (
                        <TouchableOpacity onPress={() => onSelect(mesocycle.id)}>
                          <Text style={styles.selectText}>{t('SWITCH_MESOCYCLE')}</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => handleDelete(mesocycle.id)}>
                        <Text style={styles.deleteText}>
                          {isPendingDelete ? t('CONFIRM') : t('DELETE_MESOCYCLE')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
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
            <Button
              label={t('NEW_MESOCYCLE')}
              onPress={onCreatePress}
              variant="primary"
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
    emptyText: {
      fontFamily: fonts.regular,
      fontSize: 14,
      color: colors.textSecondary,
      paddingVertical: 16,
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
    confirmText: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.danger,
    },
    rowActions: {
      alignItems: 'flex-end',
      gap: 8,
    },
    selectText: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: colors.primary,
      textDecorationLine: 'underline',
    },
    deleteText: {
      fontFamily: fonts.medium,
      fontSize: 12,
      color: colors.danger,
      textDecorationLine: 'underline',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 16,
    },
    flexBtn: {
      flex: 1,
    },
  });
