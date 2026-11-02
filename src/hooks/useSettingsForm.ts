import { useRouter } from "expo-router";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  hasCheckout,
  readCheckoutConfiguration,
} from "../git/checkout";
import { cloneConfiguredRepository } from "../git/repository";
import { checkoutConfigurationMatches } from "../settings/checkoutMatching";
import {
  getActiveConnection,
  getSnapshot,
  loadSettings,
  saveGitSettings,
  subscribe,
} from "../settings/settingsService";
import {
  EMPTY_GIT_SETTINGS,
  type GitSettings,
  type GitSettingsErrors,
  type GitSettingsField,
  validateGitSettings,
} from "../settings/validation";
import { messageOf } from "../utils/errors";

type PendingAction = "save" | "clone" | null;

const CLONE_REQUIRED_NOTICE =
  "Clone is required to replace the existing checkout with this configuration.";

export function useSettingsForm() {
  const router = useRouter();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [form, setForm] = useState<GitSettings>(EMPTY_GIT_SETTINGS);
  const [errors, setErrors] = useState<GitSettingsErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const actionInFlight = useRef(false);
  const initialized = useRef(false);
  const touched = useRef(false);

  useEffect(() => {
    void loadSettings();
  }, []);

  useEffect(() => {
    if (initialized.current || snapshot.status !== "ready") {
      return;
    }

    initialized.current = true;

    if (snapshot.settings && !touched.current) {
      setForm(snapshot.settings);
    }
  }, [snapshot.status, snapshot.settings]);

  const busy = pendingAction !== null;
  const editable = !busy;

  function handleChange(field: GitSettingsField, value: string) {
    touched.current = true;
    setForm(current => ({ ...current, [field]: value }));
    setErrors(current => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
    setBanner(null);
    setNotice(null);
  }

  function goHome() {
    router.dismissTo("/");
  }

  async function handleSave() {
    if (actionInFlight.current) {
      return;
    }

    const validation = validateGitSettings(form);

    if (!validation.ok) {
      setErrors(validation.errors);
      setBanner(null);
      setNotice(null);
      return;
    }

    actionInFlight.current = true;
    setErrors({});
    setBanner(null);
    setNotice(null);
    setPendingAction("save");

    try {
      await saveGitSettings(validation.settings);
      setForm(validation.settings);
      const checkout = await readCheckoutConfiguration();
      const checkoutExists = await hasCheckout();
      const matches =
        checkout !== null &&
        checkoutConfigurationMatches(validation.settings, checkout);

      if (checkoutExists && !matches) {
        setNotice(CLONE_REQUIRED_NOTICE);
        actionInFlight.current = false;
        setPendingAction(null);
        return;
      }

      actionInFlight.current = false;
      setPendingAction(null);
      goHome();
    } catch (error) {
      actionInFlight.current = false;
      setPendingAction(null);
      setBanner(messageOf(error));
    }
  }

  async function handleClone() {
    if (actionInFlight.current) {
      return;
    }

    const validation = validateGitSettings(form);

    if (!validation.ok) {
      setErrors(validation.errors);
      setBanner(null);
      setNotice(null);
      return;
    }

    actionInFlight.current = true;
    setErrors({});
    setBanner(null);
    setNotice(null);
    setProgress("Saving configuration...");
    setPendingAction("clone");

    try {
      await saveGitSettings(validation.settings);
      setForm(validation.settings);
      const connection = await getActiveConnection();
      await cloneConfiguredRepository(connection, message =>
        setProgress(message),
      );
      actionInFlight.current = false;
      setPendingAction(null);
      setProgress(null);
      goHome();
    } catch (error) {
      actionInFlight.current = false;
      setPendingAction(null);
      setProgress(null);
      setBanner(messageOf(error));
    }
  }

  return {
    form,
    errors,
    banner,
    notice,
    progress,
    editable,
    saving: pendingAction === "save",
    cloning: pendingAction === "clone",
    handleChange,
    handleSave,
    handleClone,
  };
}
