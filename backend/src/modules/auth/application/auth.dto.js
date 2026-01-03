import { z } from "zod";

export const RegisterDto = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["user", "admin"]).optional()
});

export const LoginDto = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});
