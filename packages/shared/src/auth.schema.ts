import { z } from "zod";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),

  email: z.email("Please enter a valid email address"),

  password: z
    .string()
    .min(
      8,
      "Password must contain uppercase, lowercase, number and special character",
    )
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/,
      "Password must contain uppercase, lowercase, number and special character",
    ),
});

export const signupExtendedSchema = signupSchema
  .extend({
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const GoogleOauthDto = z.object({
  token: z.string().min(1),
});

export type GoogleOauthDto = z.infer<typeof GoogleOauthDto>;

export type SignupExtendedDto = z.infer<typeof signupExtendedSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type SignupDto = z.infer<typeof signupSchema>;
