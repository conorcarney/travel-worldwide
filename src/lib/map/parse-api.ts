type ApiList = {
  ok: boolean;
  data?: unknown[];
  source?: string;
  error?: string;
};

export async function fetchApiList(path: string): Promise<ApiList> {
  const response = await fetch(path);
  if (!response.ok) {
    return { ok: false, error: `HTTP ${response.status}` };
  }
  return (await response.json()) as ApiList;
}
