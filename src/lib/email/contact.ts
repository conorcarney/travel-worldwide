import { Resend } from "resend";
import type { ContactFormInput } from "@/lib/validations/contact-write";

export const CONTACT_EMAIL_SUBJECT = "Ah Be Grand Contact Form";

export class ContactEmailError extends Error {
  status: number;

  constructor(message: string, status = 503) {
    super(message);
    this.name = "ContactEmailError";
    this.status = status;
  }
}

function requireContactConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.CONTACT_TO_EMAIL?.trim();
  const from = process.env.CONTACT_FROM_EMAIL?.trim();

  if (!apiKey || !to || !from) {
    throw new ContactEmailError(
      "Contact email is not configured on the server.",
      503,
    );
  }

  return { apiKey, to, from };
}

export async function sendContactEmail(input: ContactFormInput): Promise<void> {
  const { apiKey, to, from } = requireContactConfig();
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: input.email,
    subject: CONTACT_EMAIL_SUBJECT,
    text: [
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      "",
      input.message,
    ].join("\n"),
    html: [
      "<p><strong>Name:</strong> ",
      escapeHtml(input.name),
      "</p>",
      "<p><strong>Email:</strong> ",
      escapeHtml(input.email),
      "</p>",
      "<p><strong>Message:</strong></p>",
      "<p>",
      escapeHtml(input.message).replace(/\n/g, "<br>"),
      "</p>",
    ].join(""),
  });

  if (error) {
    throw new ContactEmailError(error.message || "Failed to send email.", 502);
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
