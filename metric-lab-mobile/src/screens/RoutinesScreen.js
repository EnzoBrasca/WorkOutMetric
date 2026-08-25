import { useTranslation } from '../i18n';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { useRoutinesScreen } from '../hooks/useRoutinesScreen';
import AsyncState, { shouldRenderState } from '../components/molecules/AsyncState';
import RoutineFormModal from '../components/organisms/RoutineFormModal';
import Button from '../components/atoms/Button';

export default function RoutinesScreen() {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);

  const {
    routines,
    catalogOptions,
    isLoading,
    isSaving,
    error,
    isEmpty,
    handleRetry,

    modalVisible,
    editingRoutine,
    handleOpenCreate,
    handleOpenEdit,
    handleCloseModal,
    handleSave,

    pendingDeleteId,
    handleDeleteRoutine,
  } = useRoutinesScreen();

  const listState = { isLoading, error, isEmpty };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('MY_ROUTINES')}</Text>
        </View>

        <Button label={t('CREATE_ROUTINE')} onPress={handleOpenCreate} variant="primary" />

        {shouldRenderState(listState) ? (
          <AsyncState
            {...listState}
            errorLabel={t('ERROR_LOADING_ROUTINES')}
            emptyLabel={t('EMPTY_ROUTINES')}
            onRetry={handleRetry}
          />
        ) : (
          <View style={styles.routineList}>
            {routines.map((routine) => {
              const isPendingDelete = pendingDeleteId === routine.id;

              return (
                <View key={routine.id} style={styles.routineCard}>
                  <View style={styles.routineHeaderRow}>
                    <View style={styles.routineNameGroup}>
                      <Text style={styles.routineName} numberOfLines={1} ellipsizeMode="tail">
                        {routine.name}
                      </Text>
                      <Text style={styles.routineType}>{routine.type || '—'}</Text>
                    </View>
                    <View style={styles.routineActions}>
                      <TouchableOpacity onPress={() => handleOpenEdit(routine)}>
                        <Text style={styles.actionText}>{t('EDIT')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteRoutine(routine.id)}>
                        <Text style={[styles.actionText, { color: colors.danger }]}>
                          {isPendingDelete ? t('CONFIRM') : t('DEL')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {isPendingDelete ? (
                    <Text style={styles.confirmText}>{t('CONFIRM_DELETE_ROUTINE_BODY')}</Text>
                  ) : null}

                  <Text style={styles.exerciseCount}>
                    {`${routine.exercise_count ?? 0} ${t('EXERCISES_IN_ROUTINE')}`}
                  </Text>

                  {routine.description ? (
                    <Text style={styles.routineDescription} numberOfLines={2}>
                      {routine.description}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <RoutineFormModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSave={handleSave}
        initialData={editingRoutine}
        catalogOptions={catalogOptions}
        isSaving={isSaving}
      />
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
    paddingBottom: 32,
    gap: 16,
  },
  sectionHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderAlt,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: colors.primary,
    letterSpacing: 1,
  },
  routineList: {
    gap: 16,
  },
  routineCard: {
    borderWidth: 1,
    borderColor: colors.borderAlt,
    backgroundColor: colors.backgroundAlt,
    padding: 16,
    gap: 8,
  },
  routineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  routineNameGroup: {
    flex: 1,
  },
  routineName: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  routineType: {
    fontFamily: fonts.regular,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  routineActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 1,
    color: colors.primary,
  },
  confirmText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.danger,
  },
  exerciseCount: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 0.6,
  },
  routineDescription: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
