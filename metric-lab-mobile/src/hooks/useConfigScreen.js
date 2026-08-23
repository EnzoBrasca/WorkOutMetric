import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useConfigStore } from '../store/useConfigStore';
import { useSettingsStore } from '../store/useSettingsStore';

// A 1RM has to be a positive number: the mesocycle planner multiplies it by a
// percentage, so an empty or non-numeric value would silently plan 0kg.
function validateLiftValue(value) {
  const text = String(value ?? '').trim();
  if (!text) return 'VALIDATION_REQUIRED';
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return 'VALIDATION_NUMERIC';
  if (parsed <= 0) return 'VALIDATION_POSITIVE';
  return null;
}

export function useConfigScreen() {
  const { lifts1rm, isLoading, error, loadStats, resetLifts, saveConfig } = useConfigStore();
  const [localLifts, setLocalLifts] = useState(lifts1rm);

  const { restTimerSeconds, setRestTimerSeconds } = useSettingsStore();
  const [localRestTimerSeconds, setLocalRestTimerSeconds] = useState(String(restTimerSeconds));

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  useEffect(() => {
    setLocalLifts(lifts1rm);
  }, [lifts1rm]);

  useEffect(() => {
    setLocalRestTimerSeconds(String(restTimerSeconds));
  }, [restTimerSeconds]);

  const liftErrors = useMemo(() => {
    const errors = {};
    localLifts.forEach((lift) => {
      const problem = validateLiftValue(lift.value);
      if (problem) errors[lift.id] = problem;
    });
    return errors;
  }, [localLifts]);

  const restTimerError = useMemo(() => {
    const parsed = parseInt(localRestTimerSeconds, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return 'VALIDATION_POSITIVE';
    return null;
  }, [localRestTimerSeconds]);

  const canSave = Object.keys(liftErrors).length === 0 && localLifts.length > 0;

  const handleUpdateLift = (id, newValue) => {
    setLocalLifts((prev) =>
      prev.map((lift) => (lift.id === id ? { ...lift, value: newValue } : lift))
    );
  };

  const handleReset = () => {
    resetLifts();
  };

  const handleSaveConfig = () => {
    if (!canSave) return;
    saveConfig(localLifts);
  };

  const handleRetry = () => {
    loadStats();
  };

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

  return {
    localLifts,
    liftErrors,
    canSave,
    isLoading,
    error,
    isEmpty: !isLoading && !error && localLifts.length === 0,
    handleUpdateLift,
    handleReset,
    handleSaveConfig,
    handleRetry,
    localRestTimerSeconds,
    restTimerError,
    handleChangeRestTimerSeconds,
  };
}
