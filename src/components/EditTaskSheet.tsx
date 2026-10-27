import type {
  DeleteTaskResult,
  SaveTaskResult,
} from "../tasks/taskService";
import TaskFormSheet from "./TaskFormSheet";

type EditTaskSheetProps = {
  visible: boolean;
  busy: boolean;
  initialName: string;
  initialDescription: string;
  onClose: () => void;
  onSave: (name: string, description: string) => Promise<SaveTaskResult>;
  onDelete: () => Promise<DeleteTaskResult>;
};

export default function EditTaskSheet({
  visible,
  busy,
  initialName,
  initialDescription,
  onClose,
  onSave,
  onDelete,
}: EditTaskSheetProps) {
  return (
    <TaskFormSheet
      busy={busy}
      deleteBusyLabel="Deleting..."
      deleteLabel="Delete"
      initialDescription={initialDescription}
      initialName={initialName}
      onClose={onClose}
      onDelete={onDelete}
      onSubmit={onSave}
      submitBusyLabel="Saving..."
      submitLabel="Save"
      title="Edit task"
      visible={visible}
    />
  );
}
