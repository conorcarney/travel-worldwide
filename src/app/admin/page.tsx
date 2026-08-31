import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin",
};

export default function AdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl text-foreground">Admin</h1>
      <p className="mt-2 text-sm text-muted">
        Manage travel data stored in MongoDB.
      </p>
      <ul className="mt-8 space-y-3 text-foreground">
        <li>
          <Link
            href="/admin/flights"
            className="text-accent underline-offset-2 hover:underline"
          >
            Flights
          </Link>
          <span className="ml-2 text-sm text-muted">
            Add, update, and delete flight routes
          </span>
        </li>
        <li>
          <Link
            href="/admin/land-routes"
            className="text-accent underline-offset-2 hover:underline"
          >
            Land routes
          </Link>
          <span className="ml-2 text-sm text-muted">
            Bus, train, ferry, and car routes
          </span>
        </li>
        <li>
          <Link
            href="/admin/visited"
            className="text-accent underline-offset-2 hover:underline"
          >
            Visited countries
          </Link>
          <span className="ml-2 text-sm text-muted">
            Add, update, and remove visited countries
          </span>
        </li>
        <li>
          <Link
            href="/admin/country-ratings"
            className="text-accent underline-offset-2 hover:underline"
          >
            Country ratings
          </Link>
          <span className="ml-2 text-sm text-muted">
            Add, update, and remove personal country ratings
          </span>
        </li>
        <li>
          <Link
            href="/admin/passat-border-crossings"
            className="text-accent underline-offset-2 hover:underline"
          >
            Passat border crossings
          </Link>
          <span className="ml-2 text-sm text-muted">
            Road-trip border names, dates, and crossing times
          </span>
        </li>
        <li>
          <Link
            href="/admin/blogs"
            className="text-accent underline-offset-2 hover:underline"
          >
            Blogs
          </Link>
          <span className="ml-2 text-sm text-muted">
            Add travel blog posts
          </span>
        </li>
        <li>
          <Link
            href="/admin/users"
            className="text-accent underline-offset-2 hover:underline"
          >
            Users
          </Link>
          <span className="ml-2 text-sm text-muted">
            Create accounts and assign roles
          </span>
        </li>
      </ul>
    </main>
  );
}
