import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email address").max(254),
  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(5000, "Message is too long"),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
