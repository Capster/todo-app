import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

type EmptyStateProps = {
  loading: boolean;
  hasLoaded: boolean;
};

export default function EmptyState({
  loading,
  hasLoaded,
}: EmptyStateProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.status}>Loading tasks...</Text>
      </View>
    );
  }

  if (!hasLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emptyText}>No tasks yet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 15,
    color: "#6b7280",
  },
  status: {
    fontSize: 14,
    color: "#4b5563",
  },
});
