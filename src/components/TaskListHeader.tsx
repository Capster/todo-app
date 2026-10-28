import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

type TaskListHeaderProps = {
  disabled: boolean;
  refreshing: boolean;
  onRefresh: () => void;
};

export default function TaskListHeader({
  disabled,
  refreshing,
  onRefresh,
}: TaskListHeaderProps) {
  const isWeb = Platform.OS === "web";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Todo App</Text>
      <Text style={styles.subtitle}>One checklist for open and done tasks.</Text>

      {isWeb ? (
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={onRefresh}
          style={[styles.refreshButton, disabled && styles.buttonDisabled]}
        >
          <Text style={styles.refreshButtonText}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
  },
  subtitle: {
    fontSize: 16,
    color: "#4b5563",
  },
  refreshButton: {
    borderRadius: 10,
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  refreshButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
});
