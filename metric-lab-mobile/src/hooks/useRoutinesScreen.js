import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useMesocycleStore } from '../store/useMesocycleStore';
import { useConfigStore } from '../store/useConfigStore';

/**
 * Only the fields the user actually changed. The backend PATCH is a partial
 * update, so sending the whole form would rewrite a description the user never
 * touched — and a null type compares as '' here because that is what the form
 * produces for "no tag".
 */
export function buildRoutinePatch(form, original) {
  const patch = {};

  if (form.name !== original.name) patch.name = form.name;
  if (form.type !== (original.type ?? '')) patch.type = form.type;
  if (form.description !== (original.description ?? '')) patch.description = form.description;

  return patch;
}

// Membership is a set: the picker's order is the tap order, which says nothing
// about whether the routine changed.
export function haveSameMembers(a = [], b = []) {
  if (a.length !== b.length) return false;
  const inB = new Set(b);
  return a.every((id) => inB.has(id));
}

export function useRoutinesScreen() {
  const {
    routines,
    isSavingRoutine,
    error,
    loadRoutines,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    fetchRoutineDetail,
    syncRoutineExercises,
  } = useMesocycleStore();

  // The exercise picker reads the Config catalog rather than keeping a list of
  // its own: Config is where exercises are created, renamed and deleted.
  const { lifts1rm, isLoading, loadStats } = useConfigStore();

  useFocusEffect(
    useCallback(() => {
      loadRoutines();
      loadStats();
    }, [loadRoutines, loadStats])
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [isPreparingEdit, setIsPreparingEdit] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const handleOpenCreate = () => {
    setEditingRoutine(null);
    setModalVisible(true);
  };

  // The list endpoint carries no membership, so the picker's initial selection
  // has to come from the routine's detail — fetched before the modal opens so
  // it never flashes an empty list the user could save over.
  const handleOpenEdit = async (routine) => {
    setIsPreparingEdit(true);
    const detail = await fetchRoutineDetail(routine.id);
    setIsPreparingEdit(false);

    if (!detail) return;

    setEditingRoutine({
      id: routine.id,
      name: routine.name,
      type: routine.type,
      description: routine.description,
      exerciseIds: (detail.exercises ?? []).map((membership) => membership.exercise_id),
    });
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingRoutine(null);
  };

  /**
   * Create is one call. Edit is up to two — the routine's own fields and its
   * membership travel through different endpoints — and each is skipped when
   * nothing in it changed, so reopening a routine and saving it unchanged
   * costs no requests at all.
   */
  const handleSave = async (form) => {
    if (!editingRoutine) {
      return createRoutine(form);
    }

    const patch = buildRoutinePatch(form, editingRoutine);
    if (Object.keys(patch).length > 0) {
      const result = await updateRoutine(editingRoutine.id, patch);
      if (!result.success) return result;
    }

    if (!haveSameMembers(form.exerciseIds, editingRoutine.exerciseIds)) {
      const result = await syncRoutineExercises(
        editingRoutine.id,
        form.exerciseIds,
        editingRoutine.exerciseIds
      );
      if (!result.success) return result;
    }

    return { success: true };
  };

  // Destructive, so it takes a second tap on the same card rather than firing
  // straight away — same pattern as the Config catalog.
  const handleDeleteRoutine = (id) => {
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id);
      return;
    }
    setPendingDeleteId(null);
    deleteRoutine(id);
  };

  return {
    routines,
    catalogOptions: lifts1rm,
    isLoading,
    isSaving: isSavingRoutine || isPreparingEdit,
    error,
    isEmpty: !isLoading && routines.length === 0,
    handleRetry: loadRoutines,

    modalVisible,
    editingRoutine,
    handleOpenCreate,
    handleOpenEdit,
    handleCloseModal,
    handleSave,

    pendingDeleteId,
    handleDeleteRoutine,
  };
}
