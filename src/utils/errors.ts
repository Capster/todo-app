export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function redactToken(message: string, token: string): string {
  return token ? message.split(token).join("[redacted]") : message;
}

export function formatMessage(prefix: string, error: unknown): string {
  return `${prefix}: ${messageOf(error)}`;
}
