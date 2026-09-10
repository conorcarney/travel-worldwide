import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative flex flex-1 flex-col">
      <Image
        src="/home-background.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-background/70"
      />
      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-16 sm:px-6 sm:py-24">
        <h1 className="mt-4 max-w-4xl text-lg text-foreground sm:text-xl">
          I built this site initially as an interesting side project, to keep track of places I've travelled, the number of flights, buses, and trains, and the total kilometers passed by.
          Since then it's morphed into a map tracking, blog filled complex travel site, that covers a good array of just how much there is to see in the world. I've added a statistics page,
          and the map is good fun.
          Click through to the map, use the filters, and hopefully, it might be an interest to someone other than me!
        </h1>
        <h1 className="mt-4 max-w-4xl text-lg text-foreground sm:text-xl">
          The name AhBeGrand is a general rule of how to live life - a mix of both it'll be fine, and, what's the worst that could happen? I've found it a good philosophy while travelling, and throughout day to day life.
        </h1>
        <h1 className="mt-4 max-w-4xl text-lg text-foreground sm:text-xl">
          On the tech side, I built the website using nextjs, react, with a mongodb backend. Images and videos are stored in an S3 bucket. The first version was manually coded in 2022, and the initial data manually entered from then until 2026.
          Version 2.0 (current) was built primarily using cursor as a junior web developer, and me as a senior dev/ project lead, that gave the agent a detailed breakdown of what I wanted,
          my vision, rules to follow, and stylistic guides through a variety of agent.md files.
        </h1>
        <h1 className="mt-4 max-w-4xl text-lg text-foreground sm:text-xl">
          More on the tech side - there's an auth stream for access to admin, customised admin panels for a variety of CRUD functions, and for viewing google analytics. The statistics page
          has drilldown graphs so users can deep dive into the data.
        </h1>
        <h1 className="mt-4 max-w-4xl text-lg text-foreground sm:text-xl">
          At the moment data is still manually entered.  Statistics update automatically.
        </h1>
        <h1 className="mt-4 max-w-4xl text-lg text-foreground sm:text-xl">
          Future plans is an AI that will automatically scrap my email for new flights/bus tickets/train tickets/countries and add that data automatically. Be grand.
        </h1>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/map"
            className="inline-flex items-center rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Open map
          </Link>
          <Link
            href="/stats"
            className="inline-flex items-center rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Open Statistics
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
