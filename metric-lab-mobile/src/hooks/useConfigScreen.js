import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useConfigStore } from '../store/useConfigStore';
import { useMesocycleStore } from '../store/useMesocycleStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { EQUIPMENT, normalizeUnits, splitsAcrossUnits } from '../utils/equipment';
import { suggestExercises } from '../utils/exerciseGuide';

// Mirrors the backend's own rule (services/exercisesService.setOneRm) so a bad
// set is rejected before it ever reaches the network: weight must be a
// positive number, reps a positive whole number. The server still validates
// too — this only makes the failure feel instant.
function validateSet(weightText, repsText) {
  const errors = {};

  const weightTrimmed = String(weightText ?? '').trim();
  if (!weightTrimmed) {
    errors.weight = 'VALIDATION_REQUIRED';
  } else {
    const weight = Number(weightTrimmed);
    if (!Number.isFinite(weight) || weight <= 0) errors.weight = 'VALIDATION_POSITIVE';
  }

  const repsTrimmed = String(repsText ?? '').trim();
  if (!repsTrimmed) {
    errors.reps = 'VALIDATION_REQUIRED';
  } else {
    const reps = Number(repsTrimmed);
    if (!Number.isInteger(reps)) errors.reps = 'VALIDATION_INTEGER';
    else if (reps <= 0) errors.reps = 'VALIDATION_POSITIVE';
  }

  return errors;
}

// How many exercise cards Config reveals at a time. Each card carries a 1RM
// readout and a weight x reps form, so a catalog of any size buries the
// sections below it unless it is paged.
export const CATALOG_PAGE_SIZE = 5;

/**
 * The slice of the catalog currently on screen, plus whether a "load more"
 * button is warranted. `visibleCount` can exceed the list — deleting exercises
 * with several pages open shrinks it — so `remaining` never goes negative.
 */
export function paginateLifts(lifts, visibleCount) {
  const all = lifts ?? [];
  return {
    visible: all.slice(0, visibleCount),
    hasMore: all.length > visibleCount,
    remaining: Math.max(all.length - visibleCount, 0),
  };
}

export function useConfigScreen() {
  const {
    lifts1rm,
    isLoading,
    error,
    loadStats,
    submitOneRmEstimate,
    estimatingIds,
    lowConfidenceByExerciseId,
    createExercise,
    isCreatingExercise,
    renameExercise,
    deleteExercise,
  } = useConfigStore();

  // Mesocycles are configured here, not on Train: creating a block, listing
  // the past ones, activating one and deleting one are all setup, and Train is
  // left with just the current week and an activate/deactivate control.
  const {
    mesocycles,
    activeMesocycleId,
    isLoading: isMesocycleSaving,
    loadMesocycles,
    createMesocycle,
    selectActiveMesocycle,
    deleteMesocycle,
  } = useMesocycleStore();

  const { restTimerSeconds, setRestTimerSeconds } = useSettingsStore();
  const [localRestTimerSeconds, setLocalRestTimerSeconds] = useState(String(restTimerSeconds));

  useFocusEffect(
    useCallback(() => {
      loadStats();
      loadMesocycles();
    }, [loadStats, loadMesocycles])
  );

  useEffect(() => {
    setLocalRestTimerSeconds(String(restTimerSeconds));
  }, [restTimerSeconds]);

  const restTimerError = useMemo(() => {
    const parsed = parseInt(localRestTimerSeconds, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return 'VALIDATION_POSITIVE';
    return null;
  }, [localRestTimerSeconds]);

  // Persists as the user types, once the value is a usable positive integer;
  // an in-progress edit (e.g. an empty field while retyping) is kept locally
  // without pushing a bad value into the store.
  const handleChangeRestTimerSeconds = (text) => {
    setLocalRestTimerSeconds(text);
    const parsed = parseInt(text, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      setRestTimerSeconds(parsed);
    }
  };

  const handleRetry = () => {
    loadStats();
  };

  // --- Catalog paging ---
  const [visibleLiftCount, setVisibleLiftCount] = useState(CATALOG_PAGE_SIZE);

  const { visible: visibleLifts, hasMore: hasMoreLifts, remaining: remainingLiftCount } = useMemo(
    () => paginateLifts(lifts1rm, visibleLiftCount),
    [lifts1rm, visibleLiftCount]
  );

  const handleLoadMoreLifts = () =>
    setVisibleLiftCount((count) => count + CATALOG_PAGE_SIZE);

  // --- Mesocycles ---
  const [mesocycleModalVisible, setMesocycleModalVisible] = useState(false);
  const [pendingDeleteMesocycleId, setPendingDeleteMesocycleId] = useState(null);

  const handleOpenMesocycleModal = () => setMesocycleModalVisible(true);
  const handleCloseMesocycleModal = () => setMesocycleModalVisible(false);

  // The store makes a freshly created block the active one, so there is
  // nothing to activate afterwards.
  const handleCreateMesocycle = (payload) => createMesocycle(payload);

  const handleActivateMesocycle = (id) => selectActiveMesocycle(id);

  // Deactivating the running block without picking another one. Train falls
  // back to its pre-mesocycle behavior, and the block can be re-activated from
  // either screen.
  const handleDeactivateMesocycle = () => selectActiveMesocycle(null);

  // Destructive, so it takes a second tap on the same row — same pattern as
  // exercise deletion above.
  const handleDeleteMesocycle = (id) => {
    if (pendingDeleteMesocycleId !== id) {
      setPendingDeleteMesocycleId(id);
      return;
    }
    setPendingDeleteMesocycleId(null);
    deleteMesocycle(id);
  };

  // --- New exercise form ---
  // No push/pull here on purpose: the catalog holds every exercise whether it
  // belongs to a routine or not, and the training screen is what assigns one.
  const [newExerciseName, setNewExerciseName] = useState('');
  const [createError, setCreateError] = useState(null);
  // Barbell by default: it is how every exercise behaved before equipment
  // existed, so an untouched picker changes nothing about the weight shown.
  const [newExerciseEquipment, setNewExerciseEquipment] = useState(EQUIPMENT.BARBELL);
  const [newExerciseUnits, setNewExerciseUnits] = useState(1);
  // The illustrated movement the typed name was matched to, or null. Only set
  // by tapping a suggestion — never inferred from the text, because a name that
  // merely resembles a catalog entry is not a claim that it IS that movement.
  const [newExerciseGuideSlug, setNewExerciseGuideSlug] = useState(null);

  // Recomputed per keystroke rather than stored: searching 302 entries is
  // cheaper than keeping a second copy of the list in sync with the input.
  const exerciseSuggestions = useMemo(
    () => (newExerciseGuideSlug ? [] : suggestExercises(newExerciseName)),
    [newExerciseName, newExerciseGuideSlug]
  );

  // Editing the name after a match invalidates it: the slug would otherwise
  // outlive the text it was chosen for, illustrating a movement the name no
  // longer describes.
  const handleChangeNewExerciseName = (name) => {
    setNewExerciseName(name);
    setNewExerciseGuideSlug(null);
  };

  // Taking a suggestion fills in what the catalog knows, so the user is not
  // asked again for facts the movement already carries. Equipment stays
  // editable afterwards — the catalog files smith machine work as a generic
  // machine, so its guess is not always the one the user wants.
  const handleSelectSuggestion = (suggestion) => {
    setNewExerciseName(suggestion.name);
    setNewExerciseGuideSlug(suggestion.slug);
    setNewExerciseEquipment(suggestion.appEquipment);
    setNewExerciseUnits((units) => normalizeUnits(suggestion.appEquipment, units));
  };

  // Switching to equipment that cannot be split has to drop a previously
  // chosen "two", or a barbell would carry a unit count the picker no longer
  // shows and the label would claim something the user never selected.
  const handleChangeNewExerciseEquipment = (equipment) => {
    setNewExerciseEquipment(equipment);
    setNewExerciseUnits((units) => normalizeUnits(equipment, units));
  };

  const handleCreateExercise = async () => {
    if (!newExerciseName.trim()) {
      setCreateError('VALIDATION_REQUIRED');
      return;
    }
    const result = await createExercise(
      newExerciseName,
      null,
      newExerciseEquipment,
      newExerciseUnits,
      newExerciseGuideSlug
    );
    if (result.success) {
      setNewExerciseName('');
      setCreateError(null);
      setNewExerciseEquipment(EQUIPMENT.BARBELL);
      setNewExerciseUnits(1);
      setNewExerciseGuideSlug(null);
      // The store appends new exercises, so with the catalog paged the card the
      // user just created lands past the last visible one and the screen looks
      // like nothing happened. Reveal far enough to show it.
      const total = useConfigStore.getState().lifts1rm.length;
      setVisibleLiftCount((count) => Math.max(count, total));
    } else {
      setCreateError('ERROR_GENERIC');
    }
  };

  // --- Rename ---
  const [editingId, setEditingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const handleStartRename = (lift) => {
    setEditingId(lift.id);
    // The rename input caps at 40 chars (maxLength). Names created before
    // that cap, or via the API, can be longer — truncate here so the
    // displayed value matches what a save would actually persist.
    setRenameValue(lift.name.slice(0, 40));
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setRenameValue('');
  };

  const handleConfirmRename = () => {
    if (!editingId || !renameValue.trim()) return;
    renameExercise(editingId, renameValue);
    setEditingId(null);
    setRenameValue('');
  };

  // --- Delete: destructive, so it takes a second tap on the same row rather
  // than firing straight away — same pattern as mesocycle deletion above.
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const handleDeleteExercise = (id) => {
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id);
      return;
    }
    setPendingDeleteId(null);
    deleteExercise(id);
  };

  // --- Weight x reps -> 1RM estimate, submitted one row at a time ---
  const [rowInputs, setRowInputs] = useState({});
  const [rowErrors, setRowErrors] = useState({});

  const handleChangeRowWeight = (id, text) =>
    setRowInputs((prev) => ({ ...prev, [id]: { ...prev[id], weight: text } }));

  const handleChangeRowReps = (id, text) =>
    setRowInputs((prev) => ({ ...prev, [id]: { ...prev[id], reps: text } }));

  const handleSubmitOneRm = async (id) => {
    const input = rowInputs[id] || {};
    const errors = validateSet(input.weight, input.reps);
    setRowErrors((prev) => ({ ...prev, [id]: errors }));
    if (Object.keys(errors).length > 0) return;

    const result = await submitOneRmEstimate(id, Number(input.weight), parseInt(input.reps, 10));
    if (result.success) {
      setRowInputs((prev) => ({ ...prev, [id]: { weight: '', reps: '' } }));
      setRowErrors((prev) => ({ ...prev, [id]: {} }));
    } else {
      setRowErrors((prev) => ({ ...prev, [id]: { submit: 'ERROR_GENERIC' } }));
    }
  };

  return {
    localLifts: visibleLifts,
    hasMoreLifts,
    remainingLiftCount,
    handleLoadMoreLifts,
    isLoading,
    error,
    isEmpty: !isLoading && !error && lifts1rm.length === 0,
    handleRetry,

    newExerciseName,
    createError,
    isCreatingExercise,
    handleChangeNewExerciseName,
    handleCreateExercise,

    exerciseSuggestions,
    handleSelectSuggestion,

    newExerciseEquipment,
    newExerciseUnits,
    showUnitsPicker: splitsAcrossUnits(newExerciseEquipment),
    handleChangeNewExerciseEquipment,
    handleChangeNewExerciseUnits: setNewExerciseUnits,

    editingId,
    renameValue,
    handleChangeRenameValue: setRenameValue,
    handleStartRename,
    handleCancelRename,
    handleConfirmRename,

    pendingDeleteId,
    handleDeleteExercise,

    rowInputs,
    rowErrors,
    estimatingIds,
    lowConfidenceByExerciseId,
    handleChangeRowWeight,
    handleChangeRowReps,
    handleSubmitOneRm,

    mesocycles,
    activeMesocycleId,
    isMesocycleSaving,
    mesocycleModalVisible,
    pendingDeleteMesocycleId,
    handleOpenMesocycleModal,
    handleCloseMesocycleModal,
    handleCreateMesocycle,
    handleActivateMesocycle,
    handleDeactivateMesocycle,
    handleDeleteMesocycle,

    localRestTimerSeconds,
    restTimerError,
    handleChangeRestTimerSeconds,
  };
}
