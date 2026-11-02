export type CheckoutConfiguration = {
  repositoryUrl: string;
  branch: string;
};

export function normalizeCheckoutUrl(url: string): string {
  return url
    .trim()
    .replace(/\/+$/, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "");
}

export function normalizeCheckoutBranch(branch: string): string {
  return branch.trim();
}

export function checkoutConfigurationMatches(
  configured: { repositoryUrl: string; branch: string },
  checkout: CheckoutConfiguration,
): boolean {
  return (
    normalizeCheckoutUrl(configured.repositoryUrl) ===
      normalizeCheckoutUrl(checkout.repositoryUrl) &&
    normalizeCheckoutBranch(configured.branch) ===
      normalizeCheckoutBranch(checkout.branch)
  );
}
