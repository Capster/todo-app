import { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { TaskView } from "../tasks/taskService";
import Checkbox from "./Checkbox";

type TaskRowProps = {
  task: TaskView;
  pending: boolean;
  disabled: boolean;
  onToggle: (fileName: string, completed: boolean) => void;
  onEdit: (task: TaskView) => void;
};

export default function TaskRow({
  task,
  pending,
  disabled,
  onToggle,
  onEdit,
}: TaskRowProps) {
  const isDisabled = disabled || pending;
  const longPressTriggered = useRef(false);

  return (
    <Pressable
      accessibilityActions={[{ name: "edit", label: "Edit task" }]}
      accessibilityHint="Tap to toggle completion, hold to edit"
      accessibilityRole="checkbox"
      accessibilityLabel={task.displayName}
      accessibilityState={{ checked: task.completed, disabled: isDisabled }}
      disabled={isDisabled}
      onAccessibilityAction={event => {
        if (event.nativeEvent.actionName === "edit" && !isDisabled) {
          onEdit(task);
        }
      }}
      onLongPress={() => {
        longPressTriggered.current = true;
        onEdit(task);
      }}
      onPress={() => {
        if (longPressTriggered.current) {
          longPressTriggered.current = false;
          return;
        }

        onToggle(task.fileName, !task.completed);
      }}
      onPressIn={() => {
        longPressTriggered.current = false;
      }}
      style={({ pressed }) => [
        styles.row,
        pressed && !isDisabled && styles.rowPressed,
        isDisabled && styles.rowDisabled,
        pending && styles.rowPending,
      ]}
    >
      <Checkbox checked={task.completed} disabled={disabled} pending={pending} />
      <View style={styles.labelContainer}>
        <Text
          numberOfLines={2}
          style={[styles.label, task.completed && styles.labelCompleted]}
        >
          {task.displayName}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  rowPressed: {
    backgroundColor: "#eff6ff",
  },
  rowDisabled: {
    opacity: 0.55,
  },
  rowPending: {
    backgroundColor: "#f8fafc",
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    color: "#111827",
  },
  labelCompleted: {
    color: "#6b7280",
    textDecorationLine: "line-through",
  },
});
