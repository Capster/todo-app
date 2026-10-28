import { useWindowDimensions } from "react-native";

import { useSheetAnimation } from "../hooks/useSheetAnimation";
import {
  useTaskForm,
  type TaskFormResult,
} from "../hooks/useTaskForm";
import TaskFormFields from "./TaskFormFields";
import TaskFormFooter from "./TaskFormFooter";
import TaskSheetChrome from "./TaskSheetChrome";

export type { TaskFormResult } from "../hooks/useTaskForm";

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
  const animation = useSheetAnimation({ visible, sheetHeight });

  function close() {
    animation.animateOut(onClose);
  }

  const form = useTaskForm({
    visible,
    busy,
    isClosing: animation.isClosing,
    initialName,
    initialDescription,
    onDismiss: close,
    onCommitted: close,
    onSubmit,
    onDelete,
  });

  return (
    <TaskSheetChrome
      backdropOpacity={animation.backdropOpacity}
      interactionsDisabled={form.interactionsDisabled}
      onDismiss={form.handleDismiss}
      sheetHeight={sheetHeight}
      sheetTranslate={animation.sheetTranslate}
      title={title}
      visible={visible}
    >
      <TaskFormFields
        description={form.description}
        disabled={form.interactionsDisabled}
        error={form.error}
        name={form.name}
        nameHeight={form.nameHeight}
        onDescriptionChange={form.handleDescriptionChange}
        onNameChange={form.handleNameChange}
        onNameContentSize={form.handleNameContentSize}
      />
      <TaskFormFooter
        deleteBusyLabel={deleteBusyLabel}
        deleteLabel={deleteLabel}
        deletePending={form.deletePending}
        disabled={form.interactionsDisabled}
        onDelete={
          onDelete
            ? () => {
                void form.handleDelete();
              }
            : undefined
        }
        onSubmit={() => {
          void form.handleSubmit();
        }}
        submitBusyLabel={submitBusyLabel}
        submitLabel={submitLabel}
        submitPending={form.submitPending}
      />
    </TaskSheetChrome>
  );
}
