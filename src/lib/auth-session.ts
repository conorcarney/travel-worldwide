function errorText(error: unknown, depth = 0): string {
  if (!error || depth > 3) return "";
  if (typeof error === "string") return error;
  if (typeof error !== "object") return "";

  const record = error as {
    name?: unknown;
    type?: unknown;
    message?: unknown;
    cause?: unknown;
  };
  const parts = [record.name, record.type, record.message].filter(
    (value): value is string => typeof value === "string",
  );

  if (record.cause && typeof record.cause === "object") {
    const nested = record.cause as { err?: unknown };
    if ("err" in nested) parts.push(errorText(nested.err, depth + 1));
    parts.push(errorText(record.cause, depth + 1));
  }

  return parts.join(" ");
}

/** True when Auth.js failed to decrypt a leftover or mismatched session cookie. */
export function isInvalidSessionError(error: unknown): boolean {
  const text = errorText(error);
  return (
    text.includes("JWTSessionError") ||
    text.includes("SessionTokenError") ||
    text.includes("no matching decryption secret")
  );
}

/** Read a session; invalid cookies count as logged out. */
export async function readAuthSession<T>(
  load: () => Promise<T | null>,
): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    if (isInvalidSessionError(error)) return null;
    throw error;
  }
}
