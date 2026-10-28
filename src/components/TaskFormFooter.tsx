import { Pressable, StyleSheet, Text, View } from "react-native";

type TaskFormFooterProps = {
  submitLabel: string;
  submitBusyLabel: string;
  submitPending: boolean;
  deleteLabel?: string;
  deleteBusyLabel?: string;
  deletePending: boolean;
  disabled: boolean;
  onDelete?: () => void;
  onSubmit: () => void;
};

export default function TaskFormFooter({
  submitLabel,
  submitBusyLabel,
  submitPending,
  deleteLabel,
  deleteBusyLabel,
  deletePending,
  disabled,
  onDelete,
  onSubmit,
}: TaskFormFooterProps) {
  return (
    <View style={styles.footer}>
      {onDelete ? (
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={onDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            disabled && styles.buttonBusy,
            pressed && !disabled && styles.deleteButtonPressed,
          ]}
        >
          <Text style={styles.deleteButtonText}>
            {deletePending ? deleteBusyLabel : deleteLabel}
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onSubmit}
        style={({ pressed }) => [
          styles.submitButton,
          disabled && styles.buttonBusy,
          pressed && !disabled && styles.submitButtonPressed,
        ]}
      >
        <Text style={styles.submitButtonText}>
          {submitPending ? submitBusyLabel : submitLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    gap: 10,
  },
  submitButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  submitButtonPressed: {
    backgroundColor: "#1d4ed8",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  deleteButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dc2626",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  deleteButtonPressed: {
    backgroundColor: "#fef2f2",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#b91c1c",
  },
  buttonBusy: {
    opacity: 0.6,
  },
});
