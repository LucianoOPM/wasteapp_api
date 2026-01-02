import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import type { ApiErrorResponse, ValidationErrorDetail } from '@/utils/response.types';

interface ExceptionResponseObject {
  message?: string | string[];
  error?: string;
  errors?: ValidationErrorDetail[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, code, message, details } = this.parseException(exception);

    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }

  private parseException(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details?: ValidationErrorDetail[];
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Si es un string simple
      if (typeof exceptionResponse === 'string') {
        return {
          status,
          code: this.getErrorCode(status),
          message: exceptionResponse,
        };
      }

      // Si es un objeto (como los errores de validación)
      const responseObj = exceptionResponse as ExceptionResponseObject;

      // Errores de validación del ZodValidationPipe
      if (responseObj.errors) {
        return {
          status,
          code: 'VALIDATION_ERROR',
          message: responseObj.message as string || 'Error de validación',
          details: responseObj.errors,
        };
      }

      // Mensaje puede ser string o array
      let message = 'Error en la solicitud';
      if (typeof responseObj.message === 'string') {
        message = responseObj.message;
      } else if (Array.isArray(responseObj.message)) {
        message = responseObj.message.join(', ');
      }

      return {
        status,
        code: this.getErrorCode(status),
        message,
      };
    }

    // Error no controlado
    console.error('Unhandled exception:', exception);
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Error interno del servidor',
    };
  }

  private getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
      [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
    };
    return codes[status] || 'UNKNOWN_ERROR';
  }
}
