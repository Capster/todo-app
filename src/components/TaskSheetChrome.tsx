import type { ReactNode } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type TaskSheetChromeProps = {
  visible: boolean;
  title: string;
  sheetHeight: number;
  backdropOpacity: Animated.Value;
  sheetTranslate: Animated.Value;
  interactionsDisabled: boolean;
  onDismiss: () => void;
  children: ReactNode;
};

// This component intentionally nests deeper than the usual limit because
// Modal, the animated backdrop, and KeyboardAvoidingView require it.
export default function TaskSheetChrome({
  visible,
  title,
  sheetHeight,
  backdropOpacity,
  sheetTranslate,
  interactionsDisabled,
  onDismiss,
  children,
}: TaskSheetChromeProps) {
  return (
    <Modal
      animationType="none"
      onRequestClose={onDismiss}
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
            onPress={onDismiss}
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
                onPress={onDismiss}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && !interactionsDisabled && styles.closeButtonPressed,
                ]}
              >
                <Text style={styles.closeIcon}>×</Text>
              </Pressable>
            </View>

            {children}
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
});
