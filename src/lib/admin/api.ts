export type AdminJson<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  encodedSource?: string;
};

export async function parseAdminJson<T>(
  response: Response,
  fallbackError: string,
): Promise<AdminJson<T>> {
  const body = (await response.json()) as AdminJson<T>;
  if (!response.ok || !body.ok) {
    throw new Error(body.error ?? fallbackError);
  }
  return body;
}
