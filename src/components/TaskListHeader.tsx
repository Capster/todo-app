import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

type TaskListHeaderProps = {
  disabled: boolean;
  refreshing: boolean;
  onOpenSettings: () => void;
  onRefresh: () => void;
};

export default function TaskListHeader({
  disabled,
  refreshing,
  onOpenSettings,
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

      <Pressable
        accessibilityLabel="Settings"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onOpenSettings}
        style={({ pressed }) => [
          styles.settingsButton,
          pressed && styles.settingsButtonPressed,
        ]}
      >
        <Text style={styles.settingsIcon}>{"\u2699\uFE0E"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 8,
  },
  settingsButton: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsButtonPressed: {
    backgroundColor: "#e5e7eb",
  },
  settingsIcon: {
    fontSize: 24,
    lineHeight: 28,
    color: "#374151",
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
