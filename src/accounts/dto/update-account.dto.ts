import { z } from 'zod';
import { AccountType } from '@/generated/prisma/enums';

const accountTypeValues = Object.values(AccountType) as [string, ...string[]];

export const UpdateAccountSchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    type: z.enum(accountTypeValues).optional(),
    bankName: z.string().trim().min(1).max(50).nullable().optional(),
    currency: z
      .string()
      .trim()
      .length(3)
      .transform((v) => v.toUpperCase())
      .optional(),
    creditLimit: z.coerce.number().positive().nullable().optional(),
    cutoffDay: z.coerce.number().int().min(1).max(31).nullable().optional(),
    paymentDueDays: z.coerce.number().int().min(1).max(30).nullable().optional(),
    interestRate: z.coerce.number().nonnegative().nullable().optional(),
    minimumPaymentPct: z.coerce.number().nonnegative().nullable().optional(),
    lastFourDigits: z
      .string()
      .regex(/^\d{1,4}$/)
      .nullable()
      .optional(),
    color: z.string().trim().min(1).optional(),
    icon: z.string().trim().min(1).optional(),
    notes: z.string().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debe proporcionar al menos un campo para actualizar',
  });

export type UpdateAccountDto = z.infer<typeof UpdateAccountSchema>;
