import { StatusBar } from "expo-status-bar";
import { useEffect, useSyncExternalStore } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { WEB_UNSUPPORTED_MESSAGE } from "../git/repository";
import {
  getState,
  load,
  refresh,
  setCompleted,
  subscribe,
  type TaskView,
} from "../tasks/taskService";
import TaskRow from "./TaskRow";

export default function HomeScreen() {
  const isWeb = Platform.OS === "web";
  const state = useSyncExternalStore(subscribe, getState, getState);

  useEffect(() => {
    if (isWeb) {
      return;
    }

    void load().catch(() => {
      // The service reports load errors through its state.
    });
  }, [isWeb]);

  const isLoading = state.status === "loading";
  const isRefreshing = state.status === "refreshing";
  const isBusy = state.status !== "idle" || state.pendingFileName !== null;
  const showInitialLoading = !state.hasLoaded && isLoading;
  const tasks = state.tasks;

  function handleToggle(fileName: string, completed: boolean) {
    void setCompleted(fileName, completed).catch(() => {
      // Busy or web operations are ignored; the service owns user-facing errors.
    });
  }

  function handleRefresh() {
    void refresh().catch(() => {
      // The service reports refresh errors through its state.
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Todo App</Text>
      <Text style={styles.subtitle}>One checklist for open and done tasks.</Text>

      {isWeb ? (
        <Text style={styles.webMessage}>{WEB_UNSUPPORTED_MESSAGE}</Text>
      ) : (
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
      )}

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
  webMessage: {
    marginTop: 16,
    alignSelf: "center",
    fontSize: 15,
    color: "#4b5563",
    textAlign: "center",
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
    paddingVertical: 4,
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
});
