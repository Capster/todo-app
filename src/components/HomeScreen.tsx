import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  buildTree,
  cloneOrUpdateRepository,
  WEB_UNSUPPORTED_MESSAGE,
} from "../git/repository";

export default function HomeScreen() {
  const isWeb = Platform.OS === "web";
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<string | null>(null);

  async function handleClone() {
    if (isWeb || isRunning) {
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      const { files } = await cloneOrUpdateRepository(setStatus);
      setTree(buildTree(files));
    } catch (cloneError) {
      const message =
        cloneError instanceof Error ? cloneError.message : String(cloneError);
      setError(message);
    } finally {
      setIsRunning(false);
      setStatus(null);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Todo App</Text>
      <Text style={styles.subtitle}>
        Your cross-platform todo app is ready.
      </Text>

      {isWeb ? (
        <Text style={styles.webMessage}>{WEB_UNSUPPORTED_MESSAGE}</Text>
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            disabled={isRunning}
            onPress={handleClone}
            style={({ pressed }) => [
              styles.button,
              isRunning && styles.buttonDisabled,
              pressed && !isRunning && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonLabel}>Clone</Text>
          </Pressable>

          {isRunning && (
            <Text style={styles.status}>{status ?? "Working..."}</Text>
          )}
          {error && <Text style={styles.error}>{error}</Text>}

          {tree !== null && (
            <ScrollView
              style={styles.treeContainer}
              contentContainerStyle={styles.treeContent}
            >
              <Text style={styles.tree}>{tree}</Text>
            </ScrollView>
          )}
        </>
      )}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
  },
  webMessage: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#2563eb",
  },
  buttonPressed: {
    backgroundColor: "#1d4ed8",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  status: {
    fontSize: 14,
    color: "#555",
  },
  error: {
    fontSize: 14,
    color: "#b91c1c",
    textAlign: "center",
  },
  treeContainer: {
    alignSelf: "stretch",
    flex: 1,
    marginTop: 8,
  },
  treeContent: {
    paddingVertical: 8,
  },
  tree: {
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
    fontSize: 13,
    color: "#111",
  },
});
