export type GitSettings = {
  repositoryUrl: string;
  branch: string;
  token: string;
  authorName: string;
  authorEmail: string;
};

export type GitSettingsField = keyof GitSettings;

export type GitSettingsErrors = Partial<Record<GitSettingsField, string>>;

export type GitSettingsValidation =
  | { ok: true; settings: GitSettings }
  | { ok: false; errors: GitSettingsErrors; settings: GitSettings };

export const EMPTY_GIT_SETTINGS: GitSettings = {
  repositoryUrl: "",
  branch: "",
  token: "",
  authorName: "",
  authorEmail: "",
};

export const GIT_SETTINGS_FIELDS: readonly GitSettingsField[] = [
  "repositoryUrl",
  "branch",
  "token",
  "authorName",
  "authorEmail",
];

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const WHITESPACE = /\s/;

export function normalizeRepositoryUrl(value: string): string {
  return value.trim();
}

export function normalizeBranch(value: string): string {
  return value.trim();
}

export function normalizeToken(value: string): string {
  return value.trim();
}

export function normalizeAuthorName(value: string): string {
  return value.trim();
}

export function normalizeAuthorEmail(value: string): string {
  return value.trim();
}

export function normalizeGitSettings(input: GitSettings): GitSettings {
  return {
    repositoryUrl: normalizeRepositoryUrl(input.repositoryUrl),
    branch: normalizeBranch(input.branch),
    token: normalizeToken(input.token),
    authorName: normalizeAuthorName(input.authorName),
    authorEmail: normalizeAuthorEmail(input.authorEmail),
  };
}

function repositoryUrlError(value: string): string | null {
  if (value.length === 0) {
    return "Enter a repository URL.";
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return "Enter an absolute http or https repository URL.";
  }

  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.hostname.length === 0
  ) {
    return "Enter an absolute http or https repository URL.";
  }

  return null;
}

function branchError(value: string): string | null {
  if (value.length === 0) {
    return "Enter a branch name.";
  }

  if (value === "HEAD") {
    return 'Branch cannot be "HEAD".';
  }

  if (WHITESPACE.test(value) || CONTROL_CHARACTERS.test(value)) {
    return "Branch cannot contain whitespace or control characters.";
  }

  if (value.startsWith("-")) {
    return 'Branch cannot start with "-".';
  }

  if (value.includes("..")) {
    return 'Branch cannot contain "..".';
  }

  return null;
}

function tokenError(value: string): string | null {
  if (value.length === 0) {
    return "Enter a token.";
  }

  return null;
}

export function validateGitSettings(input: GitSettings): GitSettingsValidation {
  const settings = normalizeGitSettings(input);
  const errors: GitSettingsErrors = {};

  const repositoryUrl = repositoryUrlError(settings.repositoryUrl);
  if (repositoryUrl) {
    errors.repositoryUrl = repositoryUrl;
  }

  const branch = branchError(settings.branch);
  if (branch) {
    errors.branch = branch;
  }

  const token = tokenError(settings.token);
  if (token) {
    errors.token = token;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, settings };
  }

  return { ok: true, settings };
}
