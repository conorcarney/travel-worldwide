import { auth } from "@/auth";
import { isAdminSession } from "@/lib/authz";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  if (!isAdminSession(session)) {
    redirect("/login?callbackUrl=/admin");
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border bg-surface/50 px-4 py-2 text-xs text-muted sm:px-6">
        Signed in as {session?.user?.name || session?.user?.email}
      </div>
      {children}
    </div>
  );
}
