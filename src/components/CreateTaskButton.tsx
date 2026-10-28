import { Pressable, StyleSheet, View } from "react-native";

type CreateTaskButtonProps = {
  disabled: boolean;
  onPress: () => void;
};

export default function CreateTaskButton({
  disabled,
  onPress,
}: CreateTaskButtonProps) {
  return (
    <Pressable
      accessibilityLabel="Create task"
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={styles.plus}>
        <View style={styles.plusVertical} />
        <View style={styles.plusHorizontal} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  disabled: {
    opacity: 0.5,
  },
  pressed: {
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
