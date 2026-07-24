import { z } from "zod";

// .strict() rejects any unknown fields in the request body — this is the
// primary defense against mass-assignment attacks (e.g. a client sneaking
// `role: "admin"` or `id: "..."` into a signup/update payload).
export const signupSchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(10).max(256),
    name: z.string().min(1).max(120).optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(256),
  })
  .strict();

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
