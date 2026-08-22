import { useState } from 'react';
import { useWorkoutStore } from '../store/useWorkoutStore';

export function useTrainScreen() {
  const { activeTab, setActiveTab, exercises, addExercise, updateExercise, removeExercise, logSession, isLoading } = useWorkoutStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);

  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [sessionExercise, setSessionExercise] = useState(null);

  const handleOpenAdd = () => {
    setEditingExercise(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (exercise) => {
    setEditingExercise(exercise);
    setModalVisible(true);
  };

  const handleCloseModal = () => setModalVisible(false);

  const handleSave = (data) => {
    if (editingExercise) {
      updateExercise(editingExercise.id, data);
    } else {
      addExercise(data);
    }
  };

  const handleOpenSession = (exercise) => {
    setSessionExercise(exercise);
    setSessionModalVisible(true);
  };

  const handleCloseSessionModal = () => setSessionModalVisible(false);

  const handleSaveSession = ({ completedSets, completedReps }) => {
    if (sessionExercise) {
      logSession(sessionExercise.id, completedSets, completedReps);
    }
  };

  return {
    activeTab,
    setActiveTab,
    exercises,
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
  };
}
