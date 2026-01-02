import { z } from 'zod';

const PASSWORD_REGEXP = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/gm;

export const CreateUserSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.email().min(1).max(100),
  password: z.string().regex(PASSWORD_REGEXP),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
