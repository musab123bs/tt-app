import { z } from "zod";

export const registrationSchema = z
  .object({
    name: z.string().trim().min(2, "Full name must be at least 2 characters.").max(100),
    email: z.email("Please enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long.")
      .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
      .regex(/[a-z]/, "Password must include at least one lowercase letter.")
      .regex(/[0-9]/, "Password must include at least one number."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(8, "Please enter your password."),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Please enter a valid email address."),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "A reset token is required."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long.")
      .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
      .regex(/[a-z]/, "Password must include at least one lowercase letter.")
      .regex(/[0-9]/, "Password must include at least one number."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const playerProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required.").max(100),
  bio: z.string().max(500, "Bio cannot exceed 500 characters. ").optional().or(z.literal("")),
  country: z.string().max(80).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  clubName: z.string().max(120).optional().or(z.literal("")),
  playingHand: z.enum(["RIGHT_HANDED", "LEFT_HANDED"]).optional().nullable(),
  playingStyle: z.enum(["OFFENSIVE", "DEFENSIVE", "ALL_ROUND"]).optional().nullable(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "PROFESSIONAL"]).default("BEGINNER"),
  dateOfBirth: z.iso.date().optional().nullable(),
  isPublic: z.boolean().default(true),
});
