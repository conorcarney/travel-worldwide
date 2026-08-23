import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
};

export default function ContactPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl text-foreground">Contact</h1>
      <p className="mt-2 text-sm text-muted">
        Send a message and I&apos;ll get back to you.
      </p>
      <ContactForm />
    </main>
  );
}
