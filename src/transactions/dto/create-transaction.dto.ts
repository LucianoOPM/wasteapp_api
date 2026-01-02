import { z } from 'zod';

export const BaseTransaction = z.object({
  user: z.cuid2().nonempty().nonoptional(),
  account: z.cuid2().nonempty().nonoptional(),
  category: z.number().nonnegative().nonoptional(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).nonoptional(),
  amount: z.number().nonnegative().nonoptional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  creditCardPeriod: z.number().nonnegative().optional(),
  recurringTransaction: z.number().nonnegative().optional(),
  file: z
    .instanceof(File)
    .refine(
      (file) => {
        const validType = ['image/jpeg', 'image/png', 'image/webp'];
        return validType.includes(file.type);
      },
      { error: 'Invalid file type' },
    )
    .refine(
      (file) => {
        const maxSizeFile = 5 * 1024 * 1024;
        return file.size <= maxSizeFile;
      },
      { error: 'Too heavy file' },
    ),
  tags: z.array(z.string()),
});

export const IncomeTransactionSchema = BaseTransaction.extend({
  type: z.literal('income'),
});
export const ExpenseTransactionSchema = BaseTransaction.extend({
  type: z.literal('expense'),
});
export const TransferTransactionSchema = BaseTransaction.extend({
  type: z.literal('transfer'),
  relatedTransaction: z.string().nonempty().nonoptional(),
  isTransferSource: z.boolean().nonoptional(),
});
export const AdjustmentTransactionSchema = BaseTransaction.extend({
  type: z.literal('adjustment'),
});

export const TransactionSchema = z.discriminatedUnion('type', [
  IncomeTransactionSchema,
  ExpenseTransactionSchema,
  TransferTransactionSchema,
  AdjustmentTransactionSchema,
]);

export type BodyTransaction = z.infer<typeof TransactionSchema>;
