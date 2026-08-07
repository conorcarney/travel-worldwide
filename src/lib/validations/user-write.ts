import { z } from "zod";

export const USER_ROLE_NAMES = ["user", "moderator", "admin"] as const;

export const userWriteSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .max(40, "Username is too long")
      .regex(
        /^[a-zA-Z0-9._-]+$/,
        "Username can only use letters, numbers, dots, underscores, and hyphens",
      ),
    email: z.string().trim().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    role: z.enum(USER_ROLE_NAMES).optional().default("user"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type UserWriteInput = z.infer<typeof userWriteSchema>;

export type PublicUserRecord = {
  _id: string;
  username: string;
  email: string;
  roles: string[];
};
