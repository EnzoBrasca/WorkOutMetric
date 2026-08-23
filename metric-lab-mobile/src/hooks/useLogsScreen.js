import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSessionStore } from '../store/useSessionStore';

export function useLogsScreen() {
  const {
    history,
    isLoadingHistory,
    isLoadingMoreHistory,
    hasMoreHistory,
    historyError,
    loadHistory,
    loadMoreHistory,
  } = useSessionStore();

  const [selectedSessionId, setSelectedSessionId] = useState(null);

  // Refetches from page one every time the screen gains focus, same as the
  // rest of the app's stores — always shows the latest finished workout
  // rather than a stale cached page.
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const handleSelectSession = (id) =>
    setSelectedSessionId((prev) => (prev === id ? null : id));

  const handleRetry = () => loadHistory();
  const handleLoadMore = () => loadMoreHistory();

  return {
    history,
    isLoading: isLoadingHistory,
    isLoadingMore: isLoadingMoreHistory,
    hasMore: hasMoreHistory,
    error: historyError,
    selectedSessionId,
    handleSelectSession,
    handleRetry,
    handleLoadMore,
  };
}
