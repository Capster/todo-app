import git from "isomorphic-git";

import {
  checkoutConfigurationMatches,
  type CheckoutConfiguration,
} from "../settings/checkoutMatching";
import type { GitSettings } from "../settings/validation";
import { gitFileSystem } from "./fileSystem";

export type { CheckoutConfiguration } from "../settings/checkoutMatching";

export async function hasCheckout(): Promise<boolean> {
  return gitFileSystem.exists(
    `${gitFileSystem.repositoryDirectory}/.git/HEAD`,
  );
}

export async function readCheckoutConfiguration(): Promise<CheckoutConfiguration | null> {
  if (!(await hasCheckout())) {
    return null;
  }

  const directory = gitFileSystem.repositoryDirectory;

  try {
    const [repositoryUrl, branch] = await Promise.all([
      git.getConfig({
        fs: gitFileSystem.gitFs,
        dir: directory,
        path: "remote.origin.url",
      }),
      git.currentBranch({
        fs: gitFileSystem.gitFs,
        dir: directory,
        fullname: false,
      }),
    ]);

    if (!repositoryUrl || !branch) {
      return null;
    }

    return { repositoryUrl, branch };
  } catch {
    return null;
  }
}

export async function checkoutMatchesSettings(
  settings: Pick<GitSettings, "repositoryUrl" | "branch">,
): Promise<boolean> {
  const checkout = await readCheckoutConfiguration();

  if (!checkout) {
    return false;
  }

  return checkoutConfigurationMatches(settings, checkout);
}
