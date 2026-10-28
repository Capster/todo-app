import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";

import { useTaskList } from "../hooks/useTaskList";
import { useTaskSheets } from "../hooks/useTaskSheets";
import CreateTaskButton from "./CreateTaskButton";
import CreateTaskSheet from "./CreateTaskSheet";
import EditTaskSheet from "./EditTaskSheet";
import TaskList from "./TaskList";
import TaskListHeader from "./TaskListHeader";

export default function HomeScreen() {
  const list = useTaskList();
  const sheets = useTaskSheets();
  const sheet = sheets.sheet;

  return (
    <View style={styles.container}>
      <TaskListHeader
        disabled={list.isLoading || list.isRefreshing}
        onRefresh={list.refresh}
        refreshing={list.isRefreshing}
      />

      <TaskList
        disabled={list.isBusy}
        error={list.state.error}
        hasLoaded={list.state.hasLoaded}
        isLoading={list.isLoading}
        isRefreshing={list.isRefreshing}
        onEdit={sheets.openEdit}
        onRefresh={list.refresh}
        onToggle={list.toggle}
        pendingKeys={list.state.pendingKeys}
        showInitialLoading={list.showInitialLoading}
        tasks={list.tasks}
      />

      {!sheet ? (
        <CreateTaskButton
          disabled={list.isBusy}
          onPress={sheets.openCreate}
        />
      ) : null}

      <CreateTaskSheet
        busy={list.isBusy}
        onClose={sheets.closeSheet}
        onCreate={sheets.create}
        visible={sheet?.mode === "create"}
      />

      {sheet?.mode === "edit" ? (
        <EditTaskSheet
          key={`${sheet.task.completed ? "archived" : "open"}:${sheet.task.fileName}`}
          busy={list.isBusy}
          initialDescription={sheet.initialDescription}
          initialName={sheet.task.displayName}
          onClose={sheets.closeSheet}
          onDelete={sheets.remove}
          onSave={sheets.save}
          visible
        />
      ) : null}

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
});
