import { z } from 'zod';

export const UserFilterSchema = z.object({
  page: z.coerce.number().nonnegative().optional(),
  limit: z.coerce.number().nonnegative().optional(),
  name: z.coerce.string().nonempty().optional(),
  orderBy: z.enum(['created', 'name', 'updated', 'id']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export type UserFilterDto = z.infer<typeof UserFilterSchema>;
