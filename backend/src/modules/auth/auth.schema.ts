import { z } from "zod";

export const googleLoginSchema = z.object({
  idToken: z.string().min(1, "Google ID token is required"),
});

export const demoLoginSchema = z.object({
  email: z.string().email("Valid email required"),
});

export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
export type DemoLoginInput = z.infer<typeof demoLoginSchema>;
