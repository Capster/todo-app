import { useEffect, useRef, useState } from "react";
import type { TextInputContentSizeChangeEvent } from "react-native";

const MIN_NAME_HEIGHT = 48;
const MAX_NAME_HEIGHT = 120;

export type TaskFormResult = {
  status:
    | "success"
    | "saved_locally"
    | "deleted_locally"
    | "invalid"
    | "failed";
  error?: string;
};

type PendingAction = "submit" | "delete" | null;

type UseTaskFormOptions = {
  visible: boolean;
  busy: boolean;
  isClosing: boolean;
  initialName: string;
  initialDescription: string;
  onDismiss: () => void;
  onCommitted: () => void;
  onSubmit: (name: string, description: string) => Promise<TaskFormResult>;
  onDelete?: () => Promise<TaskFormResult>;
};

function isCommitted(result: TaskFormResult): boolean {
  return (
    result.status === "success" ||
    result.status === "saved_locally" ||
    result.status === "deleted_locally"
  );
}

export function useTaskForm({
  visible,
  busy,
  isClosing,
  initialName,
  initialDescription,
  onDismiss,
  onCommitted,
  onSubmit,
  onDelete,
}: UseTaskFormOptions) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);
  const [nameHeight, setNameHeight] = useState(MIN_NAME_HEIGHT);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const actionInFlight = useRef(false);

  useEffect(() => {
    setName(initialName);
    setDescription(initialDescription);
    setError(null);
    setNameHeight(MIN_NAME_HEIGHT);
    setPendingAction(null);
    actionInFlight.current = false;
  }, [visible, initialName, initialDescription]);

  const interactionsDisabled =
    busy || isClosing || pendingAction !== null;
  const submitPending =
    pendingAction === "submit" || (busy && pendingAction === null);
  const deletePending = pendingAction === "delete";

  function handleDismiss() {
    if (interactionsDisabled) {
      return;
    }

    onDismiss();
  }

  function handleNameChange(value: string) {
    setName(value.replace(/[\r\n]+/g, " "));
  }

  function handleNameContentSize(
    event: TextInputContentSizeChangeEvent,
  ) {
    const height = event.nativeEvent.contentSize.height;
    setNameHeight(Math.min(MAX_NAME_HEIGHT, Math.max(MIN_NAME_HEIGHT, height)));
  }

  async function runAction(
    action: "submit" | "delete",
    operation: () => Promise<TaskFormResult>,
    fallbackError: string,
  ) {
    if (interactionsDisabled || actionInFlight.current) {
      return;
    }

    actionInFlight.current = true;
    setError(null);
    setPendingAction(action);

    try {
      const result = await operation();

      if (isCommitted(result)) {
        actionInFlight.current = false;
        onCommitted();
        return;
      }

      actionInFlight.current = false;
      setPendingAction(null);
      setError(result.error ?? fallbackError);
    } catch (operationError) {
      actionInFlight.current = false;
      setPendingAction(null);
      setError(
        operationError instanceof Error
          ? operationError.message
          : String(operationError),
      );
    }
  }

  function handleSubmit() {
    return runAction(
      "submit",
      () => onSubmit(name, description),
      "Could not save the task.",
    );
  }

  function handleDelete() {
    if (!onDelete) {
      return Promise.resolve();
    }

    return runAction("delete", onDelete, "Could not delete the task.");
  }

  return {
    name,
    description,
    error,
    nameHeight,
    pendingAction,
    interactionsDisabled,
    submitPending,
    deletePending,
    handleDismiss,
    handleNameChange,
    handleNameContentSize,
    handleDescriptionChange: setDescription,
    handleSubmit,
    handleDelete,
  };
}
