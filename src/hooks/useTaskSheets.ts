import { useState } from "react";

import {
  createTask,
  deleteTask,
  loadTaskDraft,
  saveTask,
  type CreateTaskResult,
  type DeleteTaskResult,
  type SaveTaskResult,
  type TaskView,
} from "../tasks/taskService";

export type SheetState =
  | null
  | { mode: "create" }
  | { mode: "edit"; task: TaskView; initialDescription: string };

export function useTaskSheets() {
  const [sheet, setSheet] = useState<SheetState>(null);

  function openCreate() {
    setSheet({ mode: "create" });
  }

  function closeSheet() {
    setSheet(null);
  }

  function openEdit(task: TaskView) {
    void loadTaskDraft(task)
      .then(result => {
        if (result.status === "loaded") {
          setSheet({
            mode: "edit",
            task,
            initialDescription: result.content,
          });
        }
      })
      .catch(() => {
        // The service reports load errors through its state.
      });
  }

  function create(
    name: string,
    description: string,
  ): Promise<CreateTaskResult> {
    return createTask(name, description);
  }

  function save(name: string, description: string): Promise<SaveTaskResult> {
    if (sheet?.mode !== "edit") {
      return Promise.resolve({
        status: "failed",
        error: "No task is being edited.",
      });
    }

    return saveTask(sheet.task, name, description);
  }

  function remove(): Promise<DeleteTaskResult> {
    if (sheet?.mode !== "edit") {
      return Promise.resolve({
        status: "failed",
        error: "No task is being edited.",
      });
    }

    return deleteTask(sheet.task);
  }

  return {
    sheet,
    openCreate,
    closeSheet,
    openEdit,
    create,
    save,
    remove,
  };
}
