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
  const {
    activeRoutineId,
    setActiveRoutineId,
    exercises,
    logSession,
    isLoading,
    loadExercises,
    updateExercise,
  } = useWorkoutStore();

  const {
    mesocycles,
    activeMesocycleId,
    plan,
    isPlanLoading,
    isSettingOneRm,
    routines,
    activeRoutineDetail,
    isLoadingRoutineDetail,
    loadMesocycles,
    loadRoutines,
    loadRoutineDetail,
    refreshPlan,
    selectActiveMesocycle,
    setCurrentWeek,
    setOneRm,
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

  // Keeps the selection pointing at a routine that actually exists: nothing
  // selected yet (fresh install, or the first routine just created), or a
  // routine deleted from the Routines tab while it was the one on screen.
  useEffect(() => {
    if (routines.length === 0) {
      if (activeRoutineId) setActiveRoutineId(null);
      return;
    }
    if (!routines.some((routine) => routine.id === activeRoutineId)) {
      setActiveRoutineId(routines[0].id);
    }
  }, [routines, activeRoutineId, setActiveRoutineId]);

  // Loads the selected routine's membership whenever the selection changes or
  // the routines list refreshes.
  useEffect(() => {
    loadRoutineDetail(activeRoutineId);
  }, [activeRoutineId, routines, loadRoutineDetail]);

  const activeRoutine = useMemo(
    () => routines.find((routine) => routine.id === activeRoutineId) || null,
    [routines, activeRoutineId]
  );

  const hasRoutines = routines.length > 0;
  const routineMembership = activeRoutineDetail?.exercises ?? [];

  const exerciseCatalogById = useMemo(
    () => Object.fromEntries(exercises.map((ex) => [ex.id, ex])),
    [exercises]
  );

  // Overlays each exercise with its mesocycle-calculated target when one
  // exists for it. The plan now covers every exercise in ANY of the user's
  // routines, deduplicated, so this map is looked up by exercise id and the
  // routine currently on screen decides which of them are rendered. Exercises
  // in no routine at all (or when there is no active mesocycle) are untouched.
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
          type: nested.muscle_group || activeRoutine?.type || null,
          weight: '0.0',
          sets: `${membership.target_sets}x${membership.target_reps}`,
          week: 'WK 1/4',
          equipment: nested.equipment ?? null,
          equipment_units: nested.equipment_units ?? 1,
        };
        const planTarget = planByExerciseId[base.id];

        return {
          ...base,
          ...(planTarget ? { planTarget } : {}),
          targetSets: membership.target_sets,
          targetReps: membership.target_reps,
        };
      }),
    [routineMembership, exerciseCatalogById, planByExerciseId, activeRoutine, t]
  );

  // Catalog exercises available to add: same type as the tab, not already a
  // member of this routine (adding an existing member would just be editing
  // its target, which the card's own EDIT action already covers).
  const routineExerciseIds = useMemo(
    () => new Set(routineMembership.map((membership) => membership.exercise_id)),
    [routineMembership]
  );
  // Every catalog exercise not already in this routine — deliberately NOT
  // filtered by ex.type. Push/pull is assigned by adding the exercise here, so
  // filtering on it beforehand hid every exercise that had not been assigned
  // yet, which is all of them for anything created in the catalog.
  const catalogOptionsForAdd = useMemo(
    () => exercises.filter((ex) => !routineExerciseIds.has(ex.id)),
    [exercises, routineExerciseIds]
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

  // Train only picks WHICH block is active; creating and deleting them lives
  // on ConfigScreen.
  const [mesocyclePickerVisible, setMesocyclePickerVisible] = useState(false);

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
    // Routines are created explicitly on the Routines tab now, so there is
    // nothing to create on demand here — without a selected routine there is
    // simply nothing to add to.
    const routineId = activeRoutineDetail?.id ?? activeRoutineId;
    if (!routineId) return;

    await addExerciseToRoutine(routineId, exerciseId, targetSets, targetReps);

    // Keep the exercise's own type tag in step with the routine it was just
    // assigned to — /data/stats reports it and the catalog displays it. An
    // untagged routine leaves the exercise's tag alone rather than blanking it.
    const routineType = activeRoutine?.type;
    if (routineType && exerciseCatalogById[exerciseId]?.type !== routineType) {
      updateExercise(exerciseId, { type: routineType });
    }
  };

  const handleRemoveFromRoutine = (exerciseId) => {
    if (!activeRoutineDetail) return;
    removeExerciseFromRoutine(activeRoutineDetail.id, exerciseId);
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

  const handleOpenMesocyclePicker = () => setMesocyclePickerVisible(true);
  const handleCloseMesocyclePicker = () => setMesocyclePickerVisible(false);

  const handleSelectMesocycle = (id) => {
    setMesocyclePickerVisible(false);
    selectActiveMesocycle(id);
  };

  // A real override, not a preview: the backend re-anchors the block to this
  // week and keeps advancing from there every Monday.
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
    activeRoutineId,
    setActiveRoutineId,
    activeRoutine,
    exercises: displayExercises,
    isLoading: isLoading || isLoadingRoutineDetail,
    hasRoutines,
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
    isLoadingActive,
    isStartingSession,
    isFinishingSession,
    handleStartWorkout,
    handleFinishWorkout,
    restTimer,
    restTimerSeconds,
  };
}
