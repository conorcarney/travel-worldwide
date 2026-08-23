"use server";

import { ContactEmailError, sendContactEmail } from "@/lib/email/contact";
import { contactFormSchema } from "@/lib/validations/contact-write";

export type ContactState = {
  error?: string;
  success?: boolean;
};

export async function contactAction(
  _prevState: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot) {
    return { success: true };
  }

  const parsed = contactFormSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }

  try {
    await sendContactEmail(parsed.data);
    return { success: true };
  } catch (error) {
    if (error instanceof ContactEmailError) {
      return { error: error.message };
    }
    return { error: "Something went wrong. Please try again later." };
  }
}
