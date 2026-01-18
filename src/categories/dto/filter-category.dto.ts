import { z } from 'zod';

// Schema para filtrar categorías
export const FilterCategorySchema = z.object({
  userId: z.cuid2().optional(), // Filtrar por usuario (si no se envía, solo muestra categorías del sistema)
  type: z.enum(['INCOME', 'EXPENSE']).optional(), // Filtrar por tipo
  parentId: z.coerce.number().int().optional(), // Filtrar por categoría padre
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional(), // Filtrar por estado activo/inactivo
  includeSystem: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional(), // Incluir categorías del sistema (userId = null)
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  orderBy: z
    .enum(['name', 'createdAt', 'type'])
    .optional()
    .default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type FilterCategoryDto = z.infer<typeof FilterCategorySchema>;
