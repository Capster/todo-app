import { StyleSheet, Text, View } from "react-native";

type CheckboxProps = {
  checked: boolean;
  disabled?: boolean;
  pending?: boolean;
};

export default function Checkbox({
  checked,
  disabled = false,
  pending = false,
}: CheckboxProps) {
  const isDisabled = disabled || pending;

  return (
    <View
      accessible={false}
      style={[
        styles.box,
        checked && styles.boxChecked,
        isDisabled && styles.boxDisabled,
      ]}
    >
      {checked ? <Text style={styles.mark}>✓</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#9ca3af",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  boxChecked: {
    borderColor: "#2563eb",
    backgroundColor: "#2563eb",
  },
  boxDisabled: {
    opacity: 0.5,
  },
  mark: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 18,
  },
});
