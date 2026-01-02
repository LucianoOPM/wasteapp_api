import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.email().min(1).nonoptional(),
  password: z.string().min(1).nonoptional(),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginDto = z.infer<typeof LoginSchema>;
