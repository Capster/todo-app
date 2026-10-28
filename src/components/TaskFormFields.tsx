import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputContentSizeChangeEvent,
} from "react-native";

type TaskFormFieldsProps = {
  name: string;
  description: string;
  error: string | null;
  nameHeight: number;
  disabled: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onNameContentSize: (event: TextInputContentSizeChangeEvent) => void;
};

export default function TaskFormFields({
  name,
  description,
  error,
  nameHeight,
  disabled,
  onNameChange,
  onDescriptionChange,
  onNameContentSize,
}: TaskFormFieldsProps) {
  return (
    <>
      <TextInput
        accessibilityLabel="Task name"
        editable={!disabled}
        multiline
        onChangeText={onNameChange}
        onContentSizeChange={onNameContentSize}
        placeholder="Task name"
        placeholderTextColor="#9ca3af"
        scrollEnabled={false}
        style={[styles.nameInput, { height: nameHeight }]}
        value={name}
      />

      <TextInput
        accessibilityLabel="Description"
        editable={!disabled}
        multiline
        onChangeText={onDescriptionChange}
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
    </>
  );
}

const styles = StyleSheet.create({
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
});
