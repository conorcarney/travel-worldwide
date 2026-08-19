type ApiList = {
  ok: boolean;
  data?: unknown[];
  source?: string;
  error?: string;
};

export async function fetchApiList(
  path: string,
  init?: RequestInit,
): Promise<ApiList> {
  const response = await (init ? fetch(path, init) : fetch(path));
  if (!response.ok) {
    return { ok: false, error: `HTTP ${response.status}` };
  }
  return (await response.json()) as ApiList;
}
