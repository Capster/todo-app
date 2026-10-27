import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputContentSizeChangeEvent,
} from "react-native";

const MIN_NAME_HEIGHT = 48;
const MAX_NAME_HEIGHT = 120;

export type TaskFormResult = {
  status:
    | "success"
    | "saved_locally"
    | "deleted_locally"
    | "invalid"
    | "failed";
  error?: string;
};

type TaskFormSheetProps = {
  visible: boolean;
  busy: boolean;
  title: string;
  submitLabel: string;
  submitBusyLabel: string;
  initialName: string;
  initialDescription: string;
  onClose: () => void;
  onSubmit: (name: string, description: string) => Promise<TaskFormResult>;
  onDelete?: () => Promise<TaskFormResult>;
  deleteLabel?: string;
  deleteBusyLabel?: string;
};

type PendingAction = "submit" | "delete" | null;

function isCommitted(result: TaskFormResult): boolean {
  return (
    result.status === "success" ||
    result.status === "saved_locally" ||
    result.status === "deleted_locally"
  );
}

export default function TaskFormSheet({
  visible,
  busy,
  title,
  submitLabel,
  submitBusyLabel,
  initialName,
  initialDescription,
  onClose,
  onSubmit,
  onDelete,
  deleteLabel = "Delete",
  deleteBusyLabel = "Deleting...",
}: TaskFormSheetProps) {
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = Math.max(240, Math.round(windowHeight * 0.5));
  const useNativeDriver = Platform.OS !== "web";
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);
  const [nameHeight, setNameHeight] = useState(MIN_NAME_HEIGHT);
  const [isClosing, setIsClosing] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const sheetTranslate = useRef(new Animated.Value(sheetHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);
  const actionInFlight = useRef(false);

  const interactionsDisabled = busy || isClosing || pendingAction !== null;
  const submitPending =
    pendingAction === "submit" || (busy && pendingAction === null);
  const deletePending = pendingAction === "delete";

  function resetDraft() {
    setName(initialName);
    setDescription(initialDescription);
    setError(null);
    setNameHeight(MIN_NAME_HEIGHT);
    setPendingAction(null);
    actionInFlight.current = false;
  }

  useEffect(() => {
    if (!visible) {
      resetDraft();
      sheetTranslate.setValue(sheetHeight);
      backdropOpacity.setValue(0);
      closingRef.current = false;
      setIsClosing(false);
      return;
    }

    resetDraft();
    closingRef.current = false;
    setIsClosing(false);
    sheetTranslate.setValue(sheetHeight);
    backdropOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver,
      }),
      Animated.timing(sheetTranslate, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      }),
    ]).start();
  }, [
    visible,
    initialName,
    initialDescription,
    sheetHeight,
    sheetTranslate,
    backdropOpacity,
    useNativeDriver,
  ]);

  function animateOut(then: () => void) {
    if (closingRef.current) {
      return;
    }

    closingRef.current = true;
    setIsClosing(true);

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver,
      }),
      Animated.timing(sheetTranslate, {
        toValue: sheetHeight,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver,
      }),
    ]).start(() => {
      closingRef.current = false;
      setIsClosing(false);
      then();
    });
  }

  function handleDismiss() {
    if (interactionsDisabled) {
      return;
    }

    animateOut(() => {
      resetDraft();
      onClose();
    });
  }

  function handleNameChange(value: string) {
    setName(value.replace(/[\r\n]+/g, " "));
  }

  function handleNameContentSize(
    event: TextInputContentSizeChangeEvent,
  ) {
    const height = event.nativeEvent.contentSize.height;
    setNameHeight(Math.min(MAX_NAME_HEIGHT, Math.max(MIN_NAME_HEIGHT, height)));
  }

  async function handleSubmit() {
    if (interactionsDisabled || actionInFlight.current) {
      return;
    }

    actionInFlight.current = true;
    setError(null);
    setPendingAction("submit");

    try {
      const result = await onSubmit(name, description);

      if (isCommitted(result)) {
        animateOut(() => {
          resetDraft();
          onClose();
        });
        return;
      }

      actionInFlight.current = false;
      setPendingAction(null);
      setError(result.error ?? "Could not save the task.");
    } catch (submitError) {
      actionInFlight.current = false;
      setPendingAction(null);
      setError(
        submitError instanceof Error
          ? submitError.message
          : String(submitError),
      );
    }
  }

  async function handleDelete() {
    if (interactionsDisabled || actionInFlight.current || !onDelete) {
      return;
    }

    actionInFlight.current = true;
    setError(null);
    setPendingAction("delete");

    try {
      const result = await onDelete();

      if (isCommitted(result)) {
        animateOut(() => {
          resetDraft();
          onClose();
        });
        return;
      }

      actionInFlight.current = false;
      setPendingAction(null);
      setError(result.error ?? "Could not delete the task.");
    } catch (deleteError) {
      actionInFlight.current = false;
      setPendingAction(null);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : String(deleteError),
      );
    }
  }

  return (
    <Modal
      animationType="none"
      onRequestClose={handleDismiss}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Animated.View
          pointerEvents={interactionsDisabled ? "none" : "auto"}
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        >
          <Pressable
            accessibilityLabel={`Close ${title.toLowerCase()} sheet`}
            accessibilityRole="button"
            disabled={interactionsDisabled}
            onPress={handleDismiss}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          pointerEvents="box-none"
          style={styles.keyboardAvoiding}
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                height: sheetHeight,
                transform: [{ translateY: sheetTranslate }],
              },
            ]}
          >
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Pressable
                accessibilityLabel="Close"
                accessibilityRole="button"
                disabled={interactionsDisabled}
                hitSlop={8}
                onPress={handleDismiss}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && !interactionsDisabled && styles.closeButtonPressed,
                ]}
              >
                <Text style={styles.closeIcon}>×</Text>
              </Pressable>
            </View>

            <TextInput
              accessibilityLabel="Task name"
              editable={!interactionsDisabled}
              multiline
              onChangeText={handleNameChange}
              onContentSizeChange={handleNameContentSize}
              placeholder="Task name"
              placeholderTextColor="#9ca3af"
              scrollEnabled={false}
              style={[styles.nameInput, { height: nameHeight }]}
              value={name}
            />

            <TextInput
              accessibilityLabel="Description"
              editable={!interactionsDisabled}
              multiline
              onChangeText={setDescription}
              placeholder="Description (optional)"
              placeholderTextColor="#9ca3af"
              style={styles.descriptionInput}
              textAlignVertical="top"
              value={description}
            />

            {error ? (
              <View style={styles.errorArea}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.footer}>
              {onDelete ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={interactionsDisabled}
                  onPress={() => {
                    void handleDelete();
                  }}
                  style={({ pressed }) => [
                    styles.deleteButton,
                    interactionsDisabled && styles.buttonBusy,
                    pressed && !interactionsDisabled && styles.deleteButtonPressed,
                  ]}
                >
                  <Text style={styles.deleteButtonText}>
                    {deletePending ? deleteBusyLabel : deleteLabel}
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                accessibilityRole="button"
                disabled={interactionsDisabled}
                onPress={() => {
                  void handleSubmit();
                }}
                style={({ pressed }) => [
                  styles.submitButton,
                  interactionsDisabled && styles.buttonBusy,
                  pressed && !interactionsDisabled && styles.submitButtonPressed,
                ]}
              >
                <Text style={styles.submitButtonText}>
                  {submitPending ? submitBusyLabel : submitLabel}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
  },
  keyboardAvoiding: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonPressed: {
    backgroundColor: "#f3f4f6",
  },
  closeIcon: {
    fontSize: 24,
    lineHeight: 26,
    color: "#4b5563",
  },
  nameInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    textAlignVertical: "top",
  },
  descriptionInput: {
    flex: 1,
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  errorArea: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 13,
    color: "#b91c1c",
  },
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
