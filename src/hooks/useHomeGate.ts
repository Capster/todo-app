import { useFocusEffect, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

import {
  hasCheckout,
  readCheckoutConfiguration,
} from "../git/checkout";
import { checkoutConfigurationMatches } from "../settings/checkoutMatching";
import {
  getSnapshot,
  loadSettings,
  subscribe,
} from "../settings/settingsService";
import { validateGitSettings } from "../settings/validation";

type CheckoutDecision = {
  key: string;
  status: "ready" | "mismatch";
};

export type HomeGateStatus = "loading" | "ready";

export function useHomeGate(): { status: HomeGateStatus } {
  const router = useRouter();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [decision, setDecision] = useState<CheckoutDecision | null>(null);

  useEffect(() => {
    void loadSettings();
  }, []);

  const settings = snapshot.settings;
  const settingsKey = settings
    ? JSON.stringify([settings.repositoryUrl, settings.branch])
    : "missing";
  const settingsValid =
    settings !== null && validateGitSettings(settings).ok;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      if (snapshot.status !== "ready") {
        setDecision(null);
        return () => {
          cancelled = true;
        };
      }

      if (!settings || !settingsValid) {
        setDecision(null);
        router.replace("/settings");
        return () => {
          cancelled = true;
        };
      }

      setDecision(null);

      void (async () => {
        try {
          if (!(await hasCheckout())) {
            if (!cancelled) {
              setDecision({ key: settingsKey, status: "ready" });
            }
            return;
          }

          const checkout = await readCheckoutConfiguration();

          if (cancelled) {
            return;
          }

          const matches =
            checkout !== null &&
            checkoutConfigurationMatches(settings, checkout);

          if (matches) {
            setDecision({ key: settingsKey, status: "ready" });
            return;
          }

          setDecision({ key: settingsKey, status: "mismatch" });
          router.replace("/settings");
        } catch {
          if (!cancelled) {
            setDecision({ key: settingsKey, status: "mismatch" });
            router.replace("/settings");
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [snapshot.status, settings, settingsKey, settingsValid, router]),
  );

  if (
    snapshot.status !== "ready" ||
    !settings ||
    !settingsValid ||
    !decision ||
    decision.key !== settingsKey ||
    decision.status !== "ready"
  ) {
    return { status: "loading" };
  }

  return { status: "ready" };
}
