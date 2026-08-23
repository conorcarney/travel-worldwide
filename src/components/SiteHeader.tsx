import Link from "next/link";
import { auth } from "@/auth";
import { logoutAction } from "@/app/login/actions";
import { isAdminSession } from "@/lib/authz";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Map" },
  { href: "/stats", label: "Statistics" },
  { href: "/blogs", label: "Blogs" },
  { href: "/contact", label: "Contact" },
] as const;

export async function SiteHeader() {
  const session = await auth();
  const showAdmin = isAdminSession(session);
  const isSignedIn = Boolean(session?.user);

  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="font-display text-lg tracking-tight text-foreground"
        >
          AhBeGrand
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted">
          {publicLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          {showAdmin ? (
            <>
              <Link
                href="/admin"
                className="transition-colors hover:text-foreground"
                data-testid="nav-admin"
              >
                Admin
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="transition-colors hover:text-foreground"
                  data-testid="nav-sign-out"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : isSignedIn ? (
            <form action={logoutAction}>
              <button
                type="submit"
                className="transition-colors hover:text-foreground"
                data-testid="nav-sign-out"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="transition-colors hover:text-foreground"
              data-testid="nav-sign-in"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
