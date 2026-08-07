export function isAdminSession(session: {
  user?: { roles?: string[] } | null;
} | null): boolean {
  return Boolean(session?.user?.roles?.includes("admin"));
}
