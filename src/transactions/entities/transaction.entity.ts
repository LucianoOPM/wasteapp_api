import {
  TransactionModel,
  TransactionUncheckedCreateInput,
} from '@/generated/prisma/models';
import type { AccountType } from '@/generated/prisma/enums';

export type NewTransaction = TransactionUncheckedCreateInput;
export type Transaction = TransactionModel;

export type InitialTransaction = {
  accountId: string;
  userId: string;
  accountType: AccountType;
  balance: number;
  initialDebt?: number;
};

export type BalanceTransaction = Omit<InitialTransaction, 'initialDebt'>;
export type DebtTransaction = Required<
  Pick<InitialTransaction, 'accountId' | 'userId' | 'initialDebt'>
>;
