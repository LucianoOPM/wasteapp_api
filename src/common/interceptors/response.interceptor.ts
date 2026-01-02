import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiResponse, PaginationMeta } from '@/utils/response.types';

interface ResponseWithPagination<T> {
  data: T;
  pagination?: PaginationMeta;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((response) => {
        // Si ya tiene el formato estándar (success, data), no lo transformamos
        if (response && typeof response === 'object' && 'success' in response) {
          return {
            ...response,
            timestamp: response.timestamp ?? new Date().toISOString(),
          };
        }

        // Si es una respuesta con paginación (tiene data y pagination)
        if (this.isPaginatedResponse(response)) {
          return {
            success: true as const,
            data: response.data,
            pagination: response.pagination,
            timestamp: new Date().toISOString(),
          };
        }

        // Respuesta simple
        return {
          success: true as const,
          data: response,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }

  private isPaginatedResponse(response: unknown): response is ResponseWithPagination<T> {
    return (
      response !== null &&
      typeof response === 'object' &&
      'data' in response &&
      'pagination' in response
    );
  }
}
