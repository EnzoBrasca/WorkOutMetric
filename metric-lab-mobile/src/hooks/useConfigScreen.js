import { useState, useEffect } from 'react';
import { useConfigStore } from '../store/useConfigStore';

export function useConfigScreen() {
  const { lifts1rm, resetLifts, saveConfig } = useConfigStore();
  const [localLifts, setLocalLifts] = useState(lifts1rm);

  useEffect(() => {
    setLocalLifts(lifts1rm);
  }, [lifts1rm]);

  const handleUpdateLift = (id, newValue) => {
    setLocalLifts((prev) =>
      prev.map((lift) => (lift.id === id ? { ...lift, value: newValue } : lift))
    );
  };

  const handleReset = () => {
    resetLifts();
  };

  const handleSaveConfig = () => {
    saveConfig(localLifts);
  };

  return {
    localLifts,
    handleUpdateLift,
    handleReset,
    handleSaveConfig,
  };
}
