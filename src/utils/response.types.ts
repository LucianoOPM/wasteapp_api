/**
 * Estructura de paginación para respuestas
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Respuesta estándar exitosa
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
  pagination?: PaginationMeta;
  timestamp: string;
}

/**
 * Detalle de error de validación
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
}

/**
 * Estructura de error
 */
export interface ApiErrorData {
  code: string;
  message: string;
  details?: ValidationErrorDetail[];
}

/**
 * Respuesta estándar de error
 */
export interface ApiErrorResponse {
  success: false;
  error: ApiErrorData;
  timestamp: string;
  path: string;
}

/**
 * Respuesta paginada (extiende ApiResponse)
 */
export type PaginatedResponse<T> = ApiResponse<T[]> & {
  pagination: PaginationMeta;
};

/**
 * Helper para construir metadata de paginación
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Helper para construir respuesta paginada
 */
export function buildPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination: buildPaginationMeta(page, limit, total),
    timestamp: new Date().toISOString(),
  };
}
