import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";

import EmptyState from "./EmptyState";

export default function HomeLoading() {
  return (
    <View style={styles.container}>
      <EmptyState loading hasLoaded={false} />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    paddingTop: 64,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});
