import { useTranslation } from '../i18n';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../theme/useTheme';

import RoutineTabs from '../components/molecules/RoutineTabs';
import ExerciseCard from '../components/molecules/ExerciseCard';
import RoutineExerciseModal from '../components/organisms/RoutineExerciseModal';
import SessionModal from '../components/organisms/SessionModal';
import MesocyclePanel from '../components/organisms/MesocyclePanel';
import MesocyclePickerModal from '../components/organisms/MesocyclePickerModal';
import WorkoutSessionView from '../components/organisms/WorkoutSessionView';
import Button from '../components/atoms/Button';
import AsyncState, { shouldRenderState } from '../components/molecules/AsyncState';
import { useTrainScreen } from '../hooks/useTrainScreen';

export default function TrainScreen() {
  const t = useTranslation();
  const { colors, fonts } = useTheme();
  const styles = getStyles(colors, fonts);

  const {
    activeRoutineId,
    setActiveRoutineId,
    exercises,
    isLoading,
    hasRoutines,
    catalogOptionsForAdd,

    modalVisible,
    handleOpenAdd,
    handleCloseModal,
    handleSave,
    handleRemoveFromRoutine,
    handleSetTargetOverride,
    handleClearTargetOverride,

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
    isSavingRoutine,
    routines,
    mesocyclePickerVisible,
    handleOpenMesocyclePicker,
    handleCloseMesocyclePicker,
    handleSelectMesocycle,
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

  const activeRoutineName = routines.find((r) => r.id === activeRoutineId)?.name;

  // While a workout is open the session view owns the whole screen (App.js
  // hides the tab bar too). Routine tabs, the mesocycle panel and the
  // add-exercise button are setup, not training — they come back on finish.
  if (activeSummary) {
    return (
      <View style={styles.container}>
        <WorkoutSessionView
          routineName={activeRoutineName}
          exercises={exercises}
          activeSummary={activeSummary}
          isFinishing={isFinishingSession}
          onFinish={handleFinishWorkout}
          onOpenExercise={handleOpenSession}
          onSetOneRm={handleSetOneRm}
          isSettingOneRm={isSettingOneRm}
          restTimer={restTimer}
          restDurationSec={restTimerSeconds}
        />

        <SessionModal
          visible={sessionModalVisible}
          onClose={handleCloseSessionModal}
          onSave={handleSaveSession}
          exercise={sessionExercise}
          onSetOneRm={handleSetOneRm}
          isSettingOneRm={isSettingOneRm}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <View style={styles.startWrapper}>
          <Button
            label={t('START_WORKOUT')}
            onPress={handleStartWorkout}
            loading={isStartingSession}
          />
        </View>

        <MesocyclePanel
          activeMesocycle={activeMesocycle}
          plan={plan}
          isPlanLoading={isPlanLoading}
          onChangeWeek={handleChangeWeek}
          onEndPress={handleEndMesocycle}
          onActivatePress={handleOpenMesocyclePicker}
        />

        <RoutineTabs
          routines={routines}
          activeRoutineId={activeRoutineId}
          onSelect={setActiveRoutineId}
        />

        {!hasRoutines && !isLoading ? (
          <View style={styles.noRoutineBox}>
            <Text style={styles.noRoutineText}>{t('NO_ROUTINES_YET')}</Text>
            <Text style={styles.noRoutineHint}>{t('CREATE_ROUTINE_IN_ROUTINES_TAB')}</Text>
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
                      onDelete={handleRemoveFromRoutine}
                      onSetOneRm={handleSetOneRm}
                      isSettingOneRm={isSettingOneRm}
                      onSetTargetOverride={handleSetTargetOverride}
                      onClearTargetOverride={handleClearTargetOverride}
                      editable={Boolean(activeMesocycleId)}
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
        catalogOptions={catalogOptionsForAdd}
        isSaving={isSavingRoutine}
      />

      {/* No SessionModal here on purpose. Nothing in this branch opens one any
          more: logging is offered only by the session view above, so a modal
          here could never become visible. */}

      <MesocyclePickerModal
        visible={mesocyclePickerVisible}
        onClose={handleCloseMesocyclePicker}
        mesocycles={mesocycles}
        activeMesocycleId={activeMesocycleId}
        onSelect={handleSelectMesocycle}
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
  startWrapper: {
    marginBottom: 16,
  },
  exerciseList: {
    gap: 16,
  },
  addExerciseBtn: {
    minHeight: 58,
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
  noRoutineHint: {
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 1.2,
    color: colors.primary,
    textAlign: 'center',
  },
});
