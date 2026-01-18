import { z } from 'zod';
import { CreateCategorySchema } from './create-category.dto';

// Schema para actualizar una categoría (todos los campos opcionales)
export const UpdateCategorySchema = CreateCategorySchema.partial();

export type UpdateCategoryDto = z.infer<typeof UpdateCategorySchema>;
