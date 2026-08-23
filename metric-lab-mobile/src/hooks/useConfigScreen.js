import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useConfigStore } from '../store/useConfigStore';
import { useSettingsStore } from '../store/useSettingsStore';

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

  const { restTimerSeconds, setRestTimerSeconds } = useSettingsStore();
  const [localRestTimerSeconds, setLocalRestTimerSeconds] = useState(String(restTimerSeconds));

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
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

  // --- New exercise form ---
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseType, setNewExerciseType] = useState('push');
  const [createError, setCreateError] = useState(null);

  const handleCreateExercise = async () => {
    if (!newExerciseName.trim()) {
      setCreateError('VALIDATION_REQUIRED');
      return;
    }
    const result = await createExercise(newExerciseName, newExerciseType);
    if (result.success) {
      setNewExerciseName('');
      setNewExerciseType('push');
      setCreateError(null);
    } else {
      setCreateError('ERROR_GENERIC');
    }
  };

  // --- Rename ---
  const [editingId, setEditingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const handleStartRename = (lift) => {
    setEditingId(lift.id);
    setRenameValue(lift.name);
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
  // than firing straight away — same pattern as MesocycleListModal.
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
    localLifts: lifts1rm,
    isLoading,
    error,
    isEmpty: !isLoading && !error && lifts1rm.length === 0,
    handleRetry,

    newExerciseName,
    newExerciseType,
    createError,
    isCreatingExercise,
    handleChangeNewExerciseName: setNewExerciseName,
    handleChangeNewExerciseType: setNewExerciseType,
    handleCreateExercise,

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

    localRestTimerSeconds,
    restTimerError,
    handleChangeRestTimerSeconds,
  };
}
