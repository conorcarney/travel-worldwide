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
        <h1 className="mt-4 max-w-4xl text-lg text-muted sm:text-xl">
          I built this site initially as an interesting side project, to keep track of places I've travelled, the number of flights, buses, and trains, and the total kilometers passed by.
          Since then it's morphed into a map tracking, blog filled complex travel site, that covers a good array of just how much there is to see in the world. I've added a statistics page,
          and the map is good fun.
          Click through to the map, use the filters, and hopefully, it might be an interest to someone other than me!
        </h1>
        <h1 className="mt-4 max-w-4xl text-lg text-muted sm:text-xl">
          On the tech side, it's built on nextjs, react, with a mongodb backend. Images and videos are stored in an S3 bucket. The first version was manually coded in 2022, and the initial data manually entered from then until 2026.
          Version 2.0 (current) was built primarily using cursor as a junior web developer, and me as a senior dev/ project lead, that gave the agent a detailed breakdown of what I wanted,
          my vision, rules to follow, and stylistic guides through a variety of agent.md files.
        </h1>
        <h1 className="mt-4 max-w-4xl text-lg text-muted sm:text-xl">
          More on the tech side - there's an auth stream for access to admin, customised admin panels for a variety of CRUD functions, and for viewing google analytics.
        </h1>
        <h1 className="mt-4 max-w-4xl text-lg text-muted sm:text-xl">
          At the moment data is still manually entered.  Statistics update automatically.
        </h1>
        <h1 className="mt-4 max-w-4xl text-lg text-muted sm:text-xl">
          Future plans is an AI that will automatically scrap my email for new flights/bus tickets/train tickets/countries and add that data automatically.
        </h1>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/map"
            className="inline-flex items-center rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Open map
          </Link>
          <Link
            href="/blogs"
            className="inline-flex items-center rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Open blogs
          </Link>
        </div>

      </div>
    </main>
  );
}
