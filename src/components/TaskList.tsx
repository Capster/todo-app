import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";

import type { TaskView } from "../tasks/taskService";
import { taskKey } from "../tasks/tasks";
import EmptyState from "./EmptyState";
import ErrorBanner from "./ErrorBanner";
import TaskRow from "./TaskRow";

type TaskListProps = {
  tasks: TaskView[];
  pendingKeys: ReadonlySet<string>;
  error: string | null;
  disabled: boolean;
  showInitialLoading: boolean;
  hasLoaded: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onEdit: (task: TaskView) => void;
  onToggle: (fileName: string, completed: boolean) => void;
};

export default function TaskList({
  tasks,
  pendingKeys,
  error,
  disabled,
  showInitialLoading,
  hasLoaded,
  isLoading,
  isRefreshing,
  onRefresh,
  onEdit,
  onToggle,
}: TaskListProps) {
  return (
    <View style={styles.container}>
      {error ? <ErrorBanner message={error} /> : null}

      <FlatList<TaskView>
        data={tasks}
        keyExtractor={item =>
          `${item.completed ? "archived" : "open"}:${item.fileName}`
        }
        renderItem={({ item }) => (
          <TaskRow
            task={item}
            pending={pendingKeys.has(taskKey(item))}
            disabled={disabled}
            onEdit={onEdit}
            onToggle={onToggle}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyState
            loading={showInitialLoading}
            hasLoaded={hasLoaded}
          />
        }
        contentContainerStyle={[
          styles.content,
          tasks.length === 0 && styles.emptyContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            enabled={!isLoading}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: "stretch",
    marginTop: 8,
    gap: 8,
  },
  content: {
    paddingTop: 4,
    paddingBottom: 88,
  },
  emptyContent: {
    flexGrow: 1,
  },
  separator: {
    height: 8,
  },
});
