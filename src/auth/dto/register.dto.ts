import { z } from 'zod';

const PASSWORD_REGEXP = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/gm;

export const RegisterSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.email().min(1).max(100),
  password: z.string().regex(PASSWORD_REGEXP),
  rememberMe: z.boolean().optional().default(false),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
