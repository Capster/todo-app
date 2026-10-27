import type { CreateTaskResult } from "../tasks/taskService";
import TaskFormSheet from "./TaskFormSheet";

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
  return (
    <TaskFormSheet
      busy={busy}
      initialDescription=""
      initialName=""
      onClose={onClose}
      onSubmit={onCreate}
      submitBusyLabel="Creating..."
      submitLabel="Create"
      title="New task"
      visible={visible}
    />
  );
}
