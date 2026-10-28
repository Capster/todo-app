import { useEffect, useSyncExternalStore } from "react";

import {
  getState,
  load,
  refresh,
  setCompleted,
  subscribe,
} from "../tasks/taskService";

export function useTaskList() {
  const state = useSyncExternalStore(subscribe, getState, getState);

  useEffect(() => {
    void load().catch(() => {
      // The service reports load errors through its state.
    });
  }, []);

  const isLoading = state.status === "loading";
  const isRefreshing = state.status === "refreshing";
  const isBusy = state.status !== "idle";
  const showInitialLoading = !state.hasLoaded && isLoading;

  function handleRefresh() {
    void refresh().catch(() => {
      // The service reports refresh errors through its state.
    });
  }

  function handleToggle(fileName: string, completed: boolean) {
    void setCompleted(fileName, completed).catch(() => {
      // The service reports mutation errors through its state.
    });
  }

  return {
    state,
    tasks: state.tasks,
    isLoading,
    isRefreshing,
    isBusy,
    showInitialLoading,
    refresh: handleRefresh,
    toggle: handleToggle,
  };
}
