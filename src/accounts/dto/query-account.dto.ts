import { orderAndPageSchema } from '@/utils/zod-query-schema.builder';
import { AccountType } from '@/generated/prisma/enums';
import { z } from 'zod';

const accountTypeValues = Object.values(AccountType) as [string, ...string[]];

export const AccountFilterSchema = orderAndPageSchema({
  orderByFields: [
    'id',
    'name',
    'currentBalance',
    'createdAt',
    'type',
    'cutoffDay',
    'creditLimit',
  ],
  defaultLimit: 10,
  defaultOrderBy: 'createdAt',
  defaultOrder: 'desc',
  defaultPage: 1,
}).extend({
  name: z.string().optional(),
  type: z.enum(accountTypeValues).optional(),
  bankName: z.string().optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  currency: z.string().optional(),
});

export type AccountFilter = z.infer<typeof AccountFilterSchema>;
