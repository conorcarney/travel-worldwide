import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,#1a4a3a_0%,transparent_50%),radial-gradient(ellipse_at_80%_60%,#163a52_0%,transparent_45%),linear-gradient(180deg,#0b1c24_0%,#0e2430_100%)]"
      />
      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-16 sm:px-6 sm:py-24">
        <p className="font-display text-4xl tracking-tight text-foreground sm:text-6xl">
          AhBeGrand
        </p>
        <h1 className="mt-4 max-w-xl text-lg text-muted sm:text-xl">
          A personal map of where you&apos;ve been, how you got there, and the
          places you saved along the way.
        </h1>
        <div className="mt-10">
          <Link
            href="/map"
            className="inline-flex items-center rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Open map
          </Link>
        </div>
      </div>
    </main>
  );
}
