import { z } from 'zod';

// Schema para crear una categoría
export const CreateCategorySchema = z.object({
  userId: z.string().cuid2().optional().nullable(), // NULL = categoría del sistema
  name: z.string().trim().min(1).max(50),
  type: z.enum(['INCOME', 'EXPENSE']),
  icon: z.string().trim().min(1).optional(),
  color: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).optional(), // Hex color validation
  parentId: z.number().int().positive().optional(), // ID de la categoría padre (para subcategorías)
});

export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;
