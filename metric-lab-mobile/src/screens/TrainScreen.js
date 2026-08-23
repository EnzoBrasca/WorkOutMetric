import { useTranslation } from '../i18n';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../theme/useTheme';

import PushPullTabs from '../components/molecules/PushPullTabs';
import ExerciseCard from '../components/molecules/ExerciseCard';
import RoutineExerciseModal from '../components/organisms/RoutineExerciseModal';
import SessionModal from '../components/organisms/SessionModal';
import MesocyclePanel from '../components/organisms/MesocyclePanel';
import MesocycleModal from '../components/organisms/MesocycleModal';
import MesocycleListModal from '../components/organisms/MesocycleListModal';
import ActiveSessionBar from '../components/organisms/ActiveSessionBar';
import AsyncState, { shouldRenderState } from '../components/molecules/AsyncState';
import { useTrainScreen } from '../hooks/useTrainScreen';

export default function TrainScreen() {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);

  const {
    activeTab,
    setActiveTab,
    exercises,
    isLoading,
    hasRoutineForTab,
    handleCreateRoutineForTab,
    catalogOptionsForAdd,

    modalVisible,
    editingExercise,
    handleOpenAdd,
    handleOpenEdit,
    handleCloseModal,
    handleSave,
    handleRemoveFromRoutine,

    sessionModalVisible,
    sessionExercise,
    handleOpenSession,
    handleCloseSessionModal,
    handleSaveSession,

    activeMesocycle,
    mesocycles,
    mesocycleError,
    activeMesocycleId,
    plan,
    isPlanLoading,
    isSettingOneRm,
    isMesocycleSaving,
    isSavingRoutine,
    routines,
    mesocycleModalVisible,
    mesocycleListVisible,
    handleOpenMesocycleModal,
    handleCloseMesocycleModal,
    handleOpenMesocycleList,
    handleCloseMesocycleList,
    handleSelectMesocycle,
    handleDeleteMesocycle,
    handleCreateFromList,
    handleCreateMesocycle,
    handleChangeWeek,
    handleEndMesocycle,
    handleSetOneRm,

    activeSummary,
    isStartingSession,
    isFinishingSession,
    handleStartWorkout,
    handleFinishWorkout,
    restTimer,
    restTimerSeconds,
  } = useTrainScreen();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <ActiveSessionBar
          activeSummary={activeSummary}
          isStarting={isStartingSession}
          isFinishing={isFinishingSession}
          onStart={handleStartWorkout}
          onFinish={handleFinishWorkout}
          restTimer={restTimer}
          restDurationSec={restTimerSeconds}
        />

        <MesocyclePanel
          activeMesocycle={activeMesocycle}
          plan={plan}
          isPlanLoading={isPlanLoading}
          onStartPress={handleOpenMesocycleModal}
          onChangeWeek={handleChangeWeek}
          onEndPress={handleEndMesocycle}
          onManagePress={handleOpenMesocycleList}
          hasMesocycles={mesocycles.length > 0}
        />

        <PushPullTabs activeTab={activeTab} onTabSelect={setActiveTab} />

        {!hasRoutineForTab && !isLoading ? (
          <View style={styles.noRoutineBox}>
            <Text style={styles.noRoutineText}>{t('NO_ROUTINE_FOR_TAB')}</Text>
            <TouchableOpacity
              style={styles.createRoutineBtn}
              onPress={handleCreateRoutineForTab}
              activeOpacity={0.8}
            >
              <Text style={styles.createRoutineText}>{t('CREATE_ROUTINE')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {(() => {
              const state = {
                isLoading,
                error: mesocycleError,
                isEmpty: !isLoading && exercises.length === 0,
              };

              return shouldRenderState(state) ? (
                <AsyncState
                  {...state}
                  errorLabel={t('ERROR_LOADING_EXERCISES')}
                  emptyLabel={t('EMPTY_EXERCISES')}
                />
              ) : (
                <View style={styles.exerciseList}>
                  {exercises.map((ex) => (
                    <ExerciseCard
                      key={ex.id}
                      exercise={ex}
                      onEdit={handleOpenEdit}
                      onDelete={handleRemoveFromRoutine}
                      onStart={handleOpenSession}
                      onSetOneRm={handleSetOneRm}
                      isSettingOneRm={isSettingOneRm}
                    />
                  ))}
                </View>
              );
            })()}

            <TouchableOpacity style={styles.addExerciseBtn} onPress={handleOpenAdd} activeOpacity={0.8}>
              <Svg width="14" height="14" viewBox="0 0 14 14" fill={colors.primary}>
                <Path d="M 6 8 L 0 8 L 0 6 L 6 6 L 6 0 L 8 0 L 8 6 L 14 6 L 14 8 L 8 8 L 8 14 L 6 14 L 6 8 L 6 8" />
              </Svg>
              <Text style={styles.addExerciseText}>{t("ADD_EXERCISE")}</Text>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>

      <RoutineExerciseModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSave={handleSave}
        initialData={editingExercise}
        catalogOptions={catalogOptionsForAdd}
        isSaving={isSavingRoutine}
      />

      <SessionModal
        visible={sessionModalVisible}
        onClose={handleCloseSessionModal}
        onSave={handleSaveSession}
        exercise={sessionExercise}
        onSetOneRm={handleSetOneRm}
        isSettingOneRm={isSettingOneRm}
        restTimer={restTimer}
        restDurationSec={restTimerSeconds}
      />

      <MesocycleModal
        visible={mesocycleModalVisible}
        onClose={handleCloseMesocycleModal}
        onSave={handleCreateMesocycle}
        routines={routines}
        isSaving={isMesocycleSaving}
      />

      <MesocycleListModal
        visible={mesocycleListVisible}
        onClose={handleCloseMesocycleList}
        mesocycles={mesocycles}
        activeMesocycleId={activeMesocycleId}
        onSelect={handleSelectMesocycle}
        onDelete={handleDeleteMesocycle}
        onCreatePress={handleCreateFromList}
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
  },
  exerciseList: {
    gap: 16,
  },
  addExerciseBtn: {
    height: 58,
    borderWidth: 1,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  addExerciseText: {
    fontFamily: fonts.semiBold,
    fontSize: 20,
    letterSpacing: 2,
    color: colors.primary,
  },
  noRoutineBox: {
    borderWidth: 1,
    borderColor: colors.borderAlt,
    backgroundColor: colors.backgroundAlt,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  noRoutineText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  createRoutineBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createRoutineText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 1.2,
    color: colors.textDark,
  },
});
