import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSettingsForm } from "../hooks/useSettingsForm";
import ErrorBanner from "./ErrorBanner";
import SettingsField from "./SettingsField";

export default function SettingsScreen() {
  const settings = useSettingsForm();
  const { form, errors, editable } = settings;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Git settings</Text>
          <Text style={styles.subtitle}>
            Choose the repository, branch, and credentials this app uses.
          </Text>
        </View>

        {settings.banner ? <ErrorBanner message={settings.banner} /> : null}

        {settings.notice ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{settings.notice}</Text>
          </View>
        ) : null}

        <SettingsField
          editable={editable}
          error={errors.repositoryUrl}
          keyboardType="url"
          label="Repository URL"
          onChangeText={value => settings.handleChange("repositoryUrl", value)}
          placeholder="https://github.com/owner/repo.git"
          value={form.repositoryUrl}
        />

        <SettingsField
          editable={editable}
          error={errors.branch}
          label="Branch"
          onChangeText={value => settings.handleChange("branch", value)}
          placeholder="main"
          value={form.branch}
        />

        <SettingsField
          editable={editable}
          error={errors.token}
          label="Token"
          onChangeText={value => settings.handleChange("token", value)}
          placeholder="Repository access token"
          secureTextEntry
          value={form.token}
        />

        <SettingsField
          editable={editable}
          error={errors.authorName}
          label="Author name (optional)"
          onChangeText={value => settings.handleChange("authorName", value)}
          placeholder="Todo App"
          value={form.authorName}
        />

        <SettingsField
          editable={editable}
          error={errors.authorEmail}
          keyboardType="email-address"
          label="Author email (optional)"
          onChangeText={value => settings.handleChange("authorEmail", value)}
          placeholder="todo-app@example.com"
          value={form.authorEmail}
        />

        {settings.progress ? (
          <Text style={styles.progress}>{settings.progress}</Text>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={!editable}
            onPress={settings.handleSave}
            style={({ pressed }) => [
              styles.saveButton,
              !editable && styles.buttonDisabled,
              pressed && editable && styles.saveButtonPressed,
            ]}
          >
            <Text style={styles.saveButtonText}>
              {settings.saving ? "Saving..." : "Save"}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={!editable}
            onPress={settings.handleClone}
            style={({ pressed }) => [
              styles.cloneButton,
              !editable && styles.buttonDisabled,
              pressed && editable && styles.cloneButtonPressed,
            ]}
          >
            <Text style={styles.cloneButtonText}>
              {settings.cloning ? "Cloning..." : "Clone"}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.hint}>
          Save stores these values without contacting the repository. Clone
          saves first and replaces the local checkout. On the web the token is
          kept in browser storage and is not encrypted.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 16,
  },
  header: {
    gap: 6,
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
  notice: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  noticeText: {
    fontSize: 14,
    color: "#92400e",
  },
  progress: {
    fontSize: 14,
    color: "#2563eb",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  saveButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  saveButtonPressed: {
    backgroundColor: "#1d4ed8",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  cloneButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2563eb",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  cloneButtonPressed: {
    backgroundColor: "#eff6ff",
  },
  cloneButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1d4ed8",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  hint: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
});
