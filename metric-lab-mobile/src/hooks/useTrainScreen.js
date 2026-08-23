import { useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { useMesocycleStore } from '../store/useMesocycleStore';
import { useSessionStore } from '../store/useSessionStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useRestTimer } from './useRestTimer';

export function useTrainScreen() {
  const { activeTab, setActiveTab, exercises, addExercise, updateExercise, removeExercise, logSession, isLoading } = useWorkoutStore();

  const {
    mesocycles,
    activeMesocycleId,
    plan,
    isPlanLoading,
    isSettingOneRm,
    routines,
    isLoading: isMesocycleSaving,
    loadMesocycles,
    loadRoutines,
    refreshPlan,
    createMesocycle,
    selectActiveMesocycle,
    setCurrentWeek,
    setOneRm,
    deleteMesocycle,
    setExerciseRoutine,
    isSavingRoutine,
    error: mesocycleError,
  } = useMesocycleStore();

  const {
    activeSummary,
    isLoadingActive,
    isStartingSession,
    isFinishingSession,
    refreshActiveSession,
    startSession,
    finishSession,
  } = useSessionStore();

  const restTimerSeconds = useSettingsStore((state) => state.restTimerSeconds);
  const restTimer = useRestTimer(restTimerSeconds);

  const activeMesocycle = useMemo(
    () => mesocycles.find((m) => m.id === activeMesocycleId) || null,
    [mesocycles, activeMesocycleId]
  );

  // Reload mesocycles/routines and re-fetch the plan every time this screen
  // gains focus, so a 1RM edited on ConfigScreen (or a week changed from
  // another device) isn't shown stale. Also re-checks for an in-progress
  // workout (FRONTEND_TODO 2.6) so one started earlier — or before the app
  // was killed — is resumed rather than lost.
  useFocusEffect(
    useCallback(() => {
      loadMesocycles();
      loadRoutines();
      refreshActiveSession();
      if (activeMesocycleId) {
        refreshPlan();
      }
    }, [loadMesocycles, loadRoutines, refreshActiveSession, refreshPlan, activeMesocycleId])
  );

  // Overlays each exercise with its mesocycle-calculated target when one
  // exists for it. Exercises outside the active mesocycle's routine (or when
  // there is no active mesocycle) are left untouched.
  const planByExerciseId = useMemo(() => {
    if (!plan) return {};
    const map = {};
    plan.exercises.forEach((planExercise) => {
      map[planExercise.exerciseId] = planExercise;
    });
    return map;
  }, [plan]);

  const displayExercises = useMemo(
    () =>
      exercises.map((ex) => {
        const planTarget = planByExerciseId[ex.id];
        return planTarget ? { ...ex, planTarget } : ex;
      }),
    [exercises, planByExerciseId]
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);

  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [sessionExerciseId, setSessionExerciseId] = useState(null);

  // Derived (not a snapshot) so that submitting a 1RM from inside the open
  // SessionModal — which refreshes the plan — updates the displayed target
  // immediately instead of requiring the modal to be closed and reopened.
  const sessionExercise = useMemo(
    () => displayExercises.find((ex) => ex.id === sessionExerciseId) || null,
    [displayExercises, sessionExerciseId]
  );

  const [mesocycleModalVisible, setMesocycleModalVisible] = useState(false);
  const [mesocycleListVisible, setMesocycleListVisible] = useState(false);

  const handleOpenAdd = () => {
    setEditingExercise(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (exercise) => {
    setEditingExercise(exercise);
    setModalVisible(true);
  };

  const handleCloseModal = () => setModalVisible(false);

  const handleSave = async ({ routineId, targetSets, targetReps, ...exerciseData }) => {
    if (editingExercise) {
      updateExercise(editingExercise.id, exerciseData);
      await setExerciseRoutine(routineId, editingExercise.id, targetSets, targetReps);
      return;
    }

    // Awaited in order: routine_exercises.exercise_id is a foreign key, so the
    // exercise has to exist server-side before it can join a routine. Without
    // this the new exercise would never receive a mesocycle target.
    const created = await addExercise(exerciseData);
    await setExerciseRoutine(routineId, created.id, targetSets, targetReps);
  };

  const handleOpenSession = (exercise) => {
    setSessionExerciseId(exercise.id);
    setSessionModalVisible(true);
  };

  const handleCloseSessionModal = () => setSessionModalVisible(false);

  const handleSaveSession = ({ completedSets, completedReps }) => {
    if (sessionExercise) {
      // Falls through to the exercise's own weight when the mesocycle has no
      // target for it — either no active mesocycle, or no 1RM on record yet.
      logSession(
        sessionExercise.id,
        completedSets,
        completedReps,
        sessionExercise.planTarget?.targetWeight
      );
    }
  };

  const handleOpenMesocycleModal = () => setMesocycleModalVisible(true);
  const handleCloseMesocycleModal = () => setMesocycleModalVisible(false);

  const handleOpenMesocycleList = () => setMesocycleListVisible(true);
  const handleCloseMesocycleList = () => setMesocycleListVisible(false);

  const handleSelectMesocycle = (id) => {
    setMesocycleListVisible(false);
    selectActiveMesocycle(id);
  };

  const handleDeleteMesocycle = (id) => deleteMesocycle(id);

  // Swaps the list for the creation form rather than stacking two modals.
  const handleCreateFromList = () => {
    setMesocycleListVisible(false);
    setMesocycleModalVisible(true);
  };

  const handleCreateMesocycle = (payload) => createMesocycle(payload);
  const handleChangeWeek = (week) => setCurrentWeek(week);
  const handleEndMesocycle = () => selectActiveMesocycle(null);
  const handleSetOneRm = (exerciseId, oneRm) => setOneRm(exerciseId, oneRm);

  // Tags the session with the active mesocycle's id/week when one is
  // running, same context logSession uses when it auto-starts a session.
  const handleStartWorkout = () =>
    startSession({
      mesocycleId: activeMesocycleId || undefined,
      mesocycleWeek: activeMesocycle?.current_week,
    });
  const handleFinishWorkout = () => {
    restTimer.stop();
    finishSession();
  };

  return {
    activeTab,
    setActiveTab,
    exercises: displayExercises,
    isLoading,
    removeExercise,

    modalVisible,
    editingExercise,
    handleOpenAdd,
    handleOpenEdit,
    handleCloseModal,
    handleSave,

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
    isLoadingActive,
    isStartingSession,
    isFinishingSession,
    handleStartWorkout,
    handleFinishWorkout,
    restTimer,
    restTimerSeconds,
  };
}
