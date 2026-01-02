import { z } from 'zod';

/**
 * Opciones de configuración para el schema de query base
 */
export interface QuerySchemaOptions<T extends string> {
  /** Campos permitidos para ordenamiento (orderBy) */
  orderByFields: readonly T[];
  /** Página por defecto (opcional) */
  defaultPage?: number;
  /** Límite por defecto (opcional) */
  defaultLimit?: number;
  /** Orden por defecto (opcional) */
  defaultOrder?: 'asc' | 'desc';
  /** Campo de ordenamiento por defecto (opcional) */
  defaultOrderBy?: T;
  /** Traer elementos inactivos  */
  includeInactive?: boolean;
}

/**
 * Schema base para paginación
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().nonnegative().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

/**
 * Tipo inferido de paginación
 */
export type PaginationDto = z.infer<typeof PaginationSchema>;

/**
 * Schema base para ordenamiento (sin orderBy, ya que es específico de cada modelo)
 */
export const OrderSchema = z.object({
  order: z.enum(['asc', 'desc']).optional(),
});

/**
 * Tipo inferido de ordenamiento
 */
export type OrderDto = z.infer<typeof OrderSchema>;

/**
 * Crea un schema de query base con paginación, límite, orden y orderBy tipado
 *
 * @template T - Tipo literal de string para los campos de ordenamiento
 * @param options - Opciones de configuración del schema
 * @returns Schema de Zod con paginación y ordenamiento tipado
 *
 * @example
 * ```typescript
 * // Definir los campos permitidos para ordenamiento
 * const userOrderByFields = ['id', 'name', 'email', 'createdAt', 'updatedAt'] as const;
 *
 * // Crear el schema base
 * const UserQueryBaseSchema = createQuerySchema({
 *   orderByFields: userOrderByFields,
 *   defaultPage: 1,
 *   defaultLimit: 10,
 *   defaultOrder: 'desc',
 *   defaultOrderBy: 'createdAt',
 * });
 *
 * // Extender con filtros adicionales
 * const UserFilterSchema = UserQueryBaseSchema.extend({
 *   name: z.string().optional(),
 *   email: z.string().email().optional(),
 *   isActive: z.coerce.boolean().optional(),
 * });
 *
 * // Tipo inferido
 * type UserFilterDto = z.infer<typeof UserFilterSchema>;
 * ```
 */
export function orderAndPageSchema<T extends string>(
  options: QuerySchemaOptions<T>,
) {
  const {
    orderByFields,
    defaultPage,
    defaultLimit,
    defaultOrder,
    defaultOrderBy,
  } = options;

  // Validar que haya al menos un campo de ordenamiento
  if (orderByFields.length === 0) {
    throw new Error('orderByFields debe contener al menos un campo');
  }

  // Crear el enum de orderBy con los campos proporcionados
  const orderByEnum = z.enum(orderByFields as [T, ...T[]]);

  // Schema base con valores por defecto opcionales
  let baseSchema = z.object({
    page:
      defaultPage !== undefined
        ? z.coerce.number().int().nonnegative().default(defaultPage)
        : z.coerce.number().int().nonnegative().optional(),
    limit:
      defaultLimit !== undefined
        ? z.coerce.number().int().positive().default(defaultLimit)
        : z.coerce.number().int().positive().optional(),
    order:
      defaultOrder !== undefined
        ? z.enum(['asc', 'desc']).default(defaultOrder)
        : z.enum(['asc', 'desc']).optional(),
    orderBy:
      defaultOrderBy !== undefined
        ? orderByEnum.default(defaultOrderBy)
        : orderByEnum.optional(),
  });

  return baseSchema;
}

/**
 * Clase builder para crear esquemas de query de forma más fluida
 *
 * @template T - Tipo literal de string para los campos de ordenamiento
 *
 * @example
 * ```typescript
 * const UserQuerySchema = new QuerySchemaBuilder(['id', 'name', 'email', 'createdAt'] as const)
 *   .withDefaultPage(1)
 *   .withDefaultLimit(20)
 *   .withDefaultOrder('desc')
 *   .withDefaultOrderBy('createdAt')
 *   .build();
 *
 * // Extender con filtros
 * const UserFilterSchema = UserQuerySchema.extend({
 *   search: z.string().optional(),
 *   role: z.enum(['ADMIN', 'USER']).optional(),
 * });
 * ```
 */
export class QuerySchemaBuilder<T extends string> {
  private options: QuerySchemaOptions<T>;

  constructor(orderByFields: readonly T[]) {
    this.options = { orderByFields };
  }

  /**
   * Establece la página por defecto
   */
  withDefaultPage(page: number): this {
    this.options.defaultPage = page;
    return this;
  }

  /**
   * Establece el límite por defecto
   */
  withDefaultLimit(limit: number): this {
    this.options.defaultLimit = limit;
    return this;
  }

  /**
   * Establece el orden por defecto
   */
  withDefaultOrder(order: 'asc' | 'desc'): this {
    this.options.defaultOrder = order;
    return this;
  }

  /**
   * Establece el campo de ordenamiento por defecto
   */
  withDefaultOrderBy(orderBy: T): this {
    this.options.defaultOrderBy = orderBy;
    return this;
  }

  /**
   * Construye el schema de Zod
   */
  build() {
    return orderAndPageSchema(this.options);
  }
}

/**
 * Helper para crear tipos de QueryDto desde un schema
 *
 * @example
 * ```typescript
 * const UserQuerySchema = createQuerySchema({
 *   orderByFields: ['id', 'name'] as const,
 * });
 *
 * type UserQueryDto = InferQueryDto<typeof UserQuerySchema>;
 * // { page?: number; limit?: number; order?: 'asc' | 'desc'; orderBy?: 'id' | 'name' }
 * ```
 */
export type InferQueryDto<T extends z.ZodTypeAny> = z.infer<T>;
