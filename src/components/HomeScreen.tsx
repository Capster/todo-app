import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  createTask,
  getState,
  load,
  refresh,
  setCompleted,
  subscribe,
  type CreateTaskResult,
  type TaskView,
} from "../tasks/taskService";
import CreateTaskSheet from "./CreateTaskSheet";
import TaskRow from "./TaskRow";

export default function HomeScreen() {
  const isWeb = Platform.OS === "web";
  const state = useSyncExternalStore(subscribe, getState, getState);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    void load().catch(() => {
      // The service reports load errors through its state.
    });
  }, []);

  const isLoading = state.status === "loading";
  const isRefreshing = state.status === "refreshing";
  const isCreating = state.status === "creating";
  const isBusy = state.status !== "idle" || state.pendingFileName !== null;
  const showInitialLoading = !state.hasLoaded && isLoading;
  const tasks = state.tasks;

  function handleToggle(fileName: string, completed: boolean) {
    void setCompleted(fileName, completed).catch(() => {
      // Busy operations are ignored; the service owns user-facing errors.
    });
  }

  function handleRefresh() {
    void refresh().catch(() => {
      // The service reports refresh errors through its state.
    });
  }

  function handleCreateTask(
    name: string,
    description: string,
  ): Promise<CreateTaskResult> {
    return createTask(name, description);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Todo App</Text>
      <Text style={styles.subtitle}>One checklist for open and done tasks.</Text>

      {isWeb ? (
        <Pressable
          accessibilityRole="button"
          disabled={isLoading || isRefreshing}
          onPress={handleRefresh}
          style={[
            styles.refreshButton,
            (isLoading || isRefreshing) && styles.refreshButtonDisabled,
          ]}
        >
          <Text style={styles.refreshButtonText}>
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.listContainer}>
        {state.error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{state.error}</Text>
          </View>
        ) : null}

        <FlatList<TaskView>
          data={tasks}
          keyExtractor={item =>
            `${item.completed ? "archived" : "open"}:${item.fileName}`
          }
          renderItem={({ item }) => (
            <TaskRow
              task={item}
              pending={state.pendingFileName === item.fileName}
              disabled={isBusy}
              onToggle={handleToggle}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            showInitialLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.status}>Loading tasks...</Text>
              </View>
            ) : state.hasLoaded ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No tasks yet.</Text>
              </View>
            ) : undefined
          }
          contentContainerStyle={[
            styles.listContent,
            tasks.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              enabled={!isLoading}
            />
          }
        />
      </View>

      {!isSheetOpen ? (
        <Pressable
          accessibilityLabel="Create task"
          accessibilityRole="button"
          disabled={isBusy}
          onPress={() => setIsSheetOpen(true)}
          style={({ pressed }) => [
            styles.fab,
            isBusy && styles.fabDisabled,
            pressed && !isBusy && styles.fabPressed,
          ]}
        >
          <View style={styles.plus}>
            <View style={styles.plusVertical} />
            <View style={styles.plusHorizontal} />
          </View>
        </Pressable>
      ) : null}

      <CreateTaskSheet
        busy={isCreating}
        onClose={() => setIsSheetOpen(false)}
        onCreate={handleCreateTask}
        visible={isSheetOpen}
      />

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    paddingTop: 64,
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 8,
  },
  title: {
    alignSelf: "center",
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
  },
  subtitle: {
    alignSelf: "center",
    fontSize: 16,
    color: "#4b5563",
  },
  refreshButton: {
    alignSelf: "center",
    borderRadius: 10,
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
  refreshButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
  listContainer: {
    flex: 1,
    alignSelf: "stretch",
    marginTop: 8,
    gap: 8,
  },
  errorBanner: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 14,
    color: "#b91c1c",
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 88,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  separator: {
    height: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 15,
    color: "#6b7280",
  },
  status: {
    fontSize: 14,
    color: "#4b5563",
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#111827",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabDisabled: {
    opacity: 0.5,
  },
  fabPressed: {
    backgroundColor: "#1d4ed8",
  },
  plus: {
    width: 22,
    height: 22,
  },
  plusVertical: {
    position: "absolute",
    top: 0,
    left: 9.5,
    width: 3,
    height: 22,
    borderRadius: 2,
    backgroundColor: "#ffffff",
  },
  plusHorizontal: {
    position: "absolute",
    top: 9.5,
    left: 0,
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#ffffff",
  },
});
