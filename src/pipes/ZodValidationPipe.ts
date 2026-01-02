import { PipeTransform, BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import type { ValidationErrorDetail } from '@/utils/response.types';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: z.ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errors = this.formatErrors(result.error);
      throw new BadRequestException({
        message: 'Error de validación',
        errors,
      });
    }

    return result.data;
  }

  private formatErrors(zodError: z.core.$ZodError): ValidationErrorDetail[] {
    return zodError.issues.map((issue) => ({
      field: this.formatPath(issue.path),
      message: this.getErrorMessage(issue),
      code: issue.code,
    }));
  }

  private formatPath(path: PropertyKey[]): string {
    if (path.length === 0) return 'root';
    return path.map(String).join('.');
  }

  private getErrorMessage(issue: z.core.$ZodIssue): string {
    switch (issue.code) {
      case 'invalid_type':
        return `Se esperaba ${issue.expected}, pero se recibió ${typeof issue.input}`;

      case 'invalid_format':
        if (issue.format === 'email') return 'Email inválido';
        if (issue.format === 'url') return 'URL inválida';
        if (issue.format === 'cuid2') return 'ID inválido';
        if (issue.format === 'regex') return 'Formato inválido';
        return `Formato inválido: ${issue.format}`;

      case 'too_small':
        if (issue.minimum === 1 && issue.origin === 'string') {
          return 'Este campo es requerido';
        }
        if (issue.origin === 'string') {
          return `Mínimo ${issue.minimum} caracteres`;
        }
        if (issue.origin === 'number') {
          return `El valor mínimo es ${issue.minimum}`;
        }
        if (issue.origin === 'array') {
          return `Mínimo ${issue.minimum} elementos`;
        }
        return issue.message ?? `Valor muy pequeño (mínimo: ${issue.minimum})`;

      case 'too_big':
        if (issue.origin === 'string') {
          return `Máximo ${issue.maximum} caracteres`;
        }
        if (issue.origin === 'number') {
          return `El valor máximo es ${issue.maximum}`;
        }
        if (issue.origin === 'array') {
          return `Máximo ${issue.maximum} elementos`;
        }
        return issue.message ?? `Valor muy grande (máximo: ${issue.maximum})`;

      case 'invalid_value':
        if ('values' in issue && Array.isArray(issue.values)) {
          return `Valor inválido. Opciones: ${issue.values.join(', ')}`;
        }
        return issue.message ?? 'Valor inválido';

      case 'invalid_union':
        return 'Ninguna de las opciones válidas coincide';

      case 'custom':
        return issue.message ?? 'Error de validación personalizado';

      default:
        return issue.message ?? 'Error de validación';
    }
  }
}
