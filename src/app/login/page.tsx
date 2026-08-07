import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminSession } from "@/lib/authz";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
};

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const params = await searchParams;
  const callbackUrl =
    params.callbackUrl && params.callbackUrl.startsWith("/")
      ? params.callbackUrl
      : "/admin";

  if (isAdminSession(session)) {
    redirect(callbackUrl);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl text-foreground">Admin sign in</h1>
      <p className="mt-2 text-sm text-muted">
        Sign in with your account to manage travel data.
      </p>
      <LoginForm callbackUrl={callbackUrl} />
    </main>
  );
}
