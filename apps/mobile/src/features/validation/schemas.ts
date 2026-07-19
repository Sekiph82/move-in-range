import { z } from "zod";

const email = z.string().trim().email("Enter a valid email address.");
const password = z.string()
  .min(10, "Use at least 10 characters.")
  .regex(/[A-Z]/, "Add an uppercase letter.")
  .regex(/[a-z]/, "Add a lowercase letter.")
  .regex(/[0-9]/, "Add a number.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required."),
  rememberSession: z.boolean().default(true)
});

export const registerSchema = z.object({
  preferredName: z.string().trim().min(2, "Preferred name is required."),
  email,
  password,
  confirmPassword: z.string(),
  acceptedTerms: z.boolean().refine(Boolean, "Terms and wellness limitation consent is required."),
  marketingConsent: z.boolean().default(false)
}).superRefine((payload, ctx) => {
  if (payload.password !== payload.confirmPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Passwords must match." });
  }
});

export const forgotPasswordSchema = z.object({ email });

export const glucoseSchema = z.object({
  timing: z.enum(["pre", "post", "delayed"]),
  value: z.coerce.number().positive().max(600),
  unit: z.enum(["mg/dL", "mmol/L"]),
  trend: z.enum(["steady", "rising", "falling", "unknown"]),
  source: z.string().min(1),
  delayedCheckMinutes: z.coerce.number().min(15).max(240).optional()
});

export const inviteSchema = z.object({
  email,
  scopes: z.array(z.string()).min(1, "Choose at least one sharing scope."),
  expiryDays: z.coerce.number().min(1).max(365)
});

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
