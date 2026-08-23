import { useState, useMemo, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from '../i18n';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { useMesocycleStore } from '../store/useMesocycleStore';
import { useSessionStore } from '../store/useSessionStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useRestTimer } from './useRestTimer';

export function useTrainScreen() {
  const t = useTranslation();
  const { activeTab, setActiveTab, exercises, logSession, isLoading, loadExercises } =
    useWorkoutStore();

  const {
    mesocycles,
    activeMesocycleId,
    plan,
    isPlanLoading,
    isSettingOneRm,
    routines,
    activeRoutineDetail,
    isLoadingRoutineDetail,
    isLoading: isMesocycleSaving,
    loadMesocycles,
    loadRoutines,
    loadRoutineForTab,
    createRoutineForTab,
    refreshPlan,
    createMesocycle,
    selectActiveMesocycle,
    setCurrentWeek,
    setOneRm,
    deleteMesocycle,
    addExerciseToRoutine,
    removeExerciseFromRoutine,
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

  // Reload mesocycles/routines/the catalog and re-fetch the plan every time
  // this screen gains focus, so a 1RM edited on ConfigScreen (or a week
  // changed from another device) isn't shown stale. Also re-checks for an
  // in-progress workout (FRONTEND_TODO 2.6) so one started earlier — or
  // before the app was killed — is resumed rather than lost.
  useFocusEffect(
    useCallback(() => {
      loadMesocycles();
      loadRoutines();
      loadExercises();
      refreshActiveSession();
      if (activeMesocycleId) {
        refreshPlan();
      }
    }, [loadMesocycles, loadRoutines, loadExercises, refreshActiveSession, refreshPlan, activeMesocycleId])
  );

  // Resolves the active tab to its routine whenever the tab changes or the
  // routines list refreshes (e.g. right after creating the missing one).
  useEffect(() => {
    loadRoutineForTab(activeTab);
  }, [activeTab, routines, loadRoutineForTab]);

  const hasRoutineForTab = Boolean(activeRoutineDetail);
  const routineMembership = activeRoutineDetail?.exercises ?? [];

  const exerciseCatalogById = useMemo(
    () => Object.fromEntries(exercises.map((ex) => [ex.id, ex])),
    [exercises]
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

  // Train shows the ACTIVE ROUTINE's membership, not every catalog exercise
  // filtered by type. Each row is the catalog exercise (for its free-text
  // weight/sets fallback — vestigial, but still what SessionModal/ExerciseCard
  // fall back to without an active mesocycle) plus that membership's target
  // sets/reps, plus the mesocycle plan target when one covers it.
  const displayExercises = useMemo(
    () =>
      routineMembership.map((membership) => {
        const catalogExercise = exerciseCatalogById[membership.exercise_id];
        const nested = membership.exercises || {};
        const base = catalogExercise || {
          id: membership.exercise_id,
          name: nested.name || t('UNKNOWN_EXERCISE'),
          type: nested.muscle_group || activeTab,
          weight: '0.0',
          sets: `${membership.target_sets}x${membership.target_reps}`,
          week: 'WK 1/4',
        };
        const planTarget = planByExerciseId[base.id];

        return {
          ...base,
          ...(planTarget ? { planTarget } : {}),
          targetSets: membership.target_sets,
          targetReps: membership.target_reps,
        };
      }),
    [routineMembership, exerciseCatalogById, planByExerciseId, activeTab, t]
  );

  // Catalog exercises available to add: same type as the tab, not already a
  // member of this routine (adding an existing member would just be editing
  // its target, which the card's own EDIT action already covers).
  const routineExerciseIds = useMemo(
    () => new Set(routineMembership.map((membership) => membership.exercise_id)),
    [routineMembership]
  );
  const catalogOptionsForAdd = useMemo(
    () => exercises.filter((ex) => ex.type === activeTab && !routineExerciseIds.has(ex.id)),
    [exercises, activeTab, routineExerciseIds]
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
    setEditingExercise({
      exerciseId: exercise.id,
      name: exercise.name,
      targetSets: exercise.targetSets,
      targetReps: exercise.targetReps,
    });
    setModalVisible(true);
  };

  const handleCloseModal = () => setModalVisible(false);

  // Both add and edit collapse to the same call: setRoutineExercises upserts
  // on (routine_id, exercise_id), so "add" and "change this exercise's
  // target" are the same request, just with a different starting point.
  const handleSave = async ({ exerciseId, targetSets, targetReps }) => {
    if (!activeRoutineDetail) return;
    await addExerciseToRoutine(activeRoutineDetail.id, exerciseId, targetSets, targetReps);
  };

  const handleRemoveFromRoutine = (exerciseId) => {
    if (!activeRoutineDetail) return;
    removeExerciseFromRoutine(activeRoutineDetail.id, exerciseId);
  };

  const handleCreateRoutineForTab = () => createRoutineForTab(activeTab);

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
    isLoading: isLoading || isLoadingRoutineDetail,
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
    isLoadingActive,
    isStartingSession,
    isFinishingSession,
    handleStartWorkout,
    handleFinishWorkout,
    restTimer,
    restTimerSeconds,
  };
}
