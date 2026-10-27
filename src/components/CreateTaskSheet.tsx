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

import type { CreateTaskResult } from "../tasks/taskService";

const MIN_NAME_HEIGHT = 48;
const MAX_NAME_HEIGHT = 120;

type CreateTaskSheetProps = {
  visible: boolean;
  busy: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => Promise<CreateTaskResult>;
};

export default function CreateTaskSheet({
  visible,
  busy,
  onClose,
  onCreate,
}: CreateTaskSheetProps) {
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = Math.max(240, Math.round(windowHeight * 0.5));
  const useNativeDriver = Platform.OS !== "web";
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [nameHeight, setNameHeight] = useState(MIN_NAME_HEIGHT);
  const [isClosing, setIsClosing] = useState(false);
  const sheetTranslate = useRef(new Animated.Value(sheetHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  const interactionsDisabled = busy || isClosing;

  function resetDraft() {
    setName("");
    setDescription("");
    setError(null);
    setNameHeight(MIN_NAME_HEIGHT);
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
  }, [visible, sheetHeight, sheetTranslate, backdropOpacity, useNativeDriver]);

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

  async function handleCreate() {
    if (interactionsDisabled) {
      return;
    }

    setError(null);

    try {
      const result = await onCreate(name, description);

      if (result.status === "success" || result.status === "saved_locally") {
        animateOut(() => {
          resetDraft();
          onClose();
        });
        return;
      }

      setError(result.error);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : String(createError),
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
            accessibilityLabel="Close task creation sheet"
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
              <Text style={styles.title}>New task</Text>
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

            <Pressable
              accessibilityRole="button"
              disabled={interactionsDisabled}
              onPress={() => {
                void handleCreate();
              }}
              style={({ pressed }) => [
                styles.createButton,
                interactionsDisabled && styles.createButtonBusy,
                pressed && !interactionsDisabled && styles.createButtonPressed,
              ]}
            >
              <Text style={styles.createButtonText}>
                {busy ? "Creating..." : "Create"}
              </Text>
            </Pressable>
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
  createButton: {
    borderRadius: 10,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  createButtonBusy: {
    opacity: 0.6,
  },
  createButtonPressed: {
    backgroundColor: "#1d4ed8",
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
});
