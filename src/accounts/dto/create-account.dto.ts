import { z } from 'zod';

export const BaseAccountSchema = z.object({
  accountName: z.string().trim().min(1).max(50),
  color: z.string().trim().min(1),
  balance: z.coerce.number().nonnegative(), //TODO el balance se colocará en el monto de la base de datos y además se generará como transacción
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((v) => v.toUpperCase()),
  icon: z.string().trim().min(1).optional(),
  notes: z.string().optional(),
});

export const DebitAccountSchema = BaseAccountSchema.extend({
  bankName: z.string().trim().min(1).max(50),
  type: z.literal('debit'),
  lastDigits: z
    .string()
    .regex(/^\d{1,4}$/)
    .optional(),
});
export const CashAccountSchema = BaseAccountSchema.extend({
  type: z.literal('cash'),
});
export const CreditAccountSchema = BaseAccountSchema.extend({
  bankName: z.string().trim().min(1).max(50),
  type: z.literal('credit'),
  cutoffDay: z.coerce.number().int().min(1).max(31),
  paymentDueDays: z.coerce.number().int().min(1).max(30),
  lastDigits: z
    .string()
    .regex(/^\d{1,4}$/)
    .optional(),
  creditLimit: z.coerce.number().positive(),
  annualInteres: z.coerce.number().nonnegative().optional(),
  minimumPayment: z.coerce.number().nonnegative().optional(),
  initialDebt: z.coerce.number().nonnegative().default(0),
});

export const QueryAccountSchema = z.object({});
export const AccountSchema = z.discriminatedUnion('type', [
  DebitAccountSchema,
  CreditAccountSchema,
  CashAccountSchema,
]);

export type BodyAccount = z.infer<typeof AccountSchema>;
export type CashAccount = z.infer<typeof CashAccountSchema>;
export type CreditAccount = z.infer<typeof CreditAccountSchema>;
export type DebitAccount = z.infer<typeof DebitAccountSchema>;
