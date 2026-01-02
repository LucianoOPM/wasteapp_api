import {
  AccountModel,
  AccountUncheckedCreateInput,
  AccountUncheckedUpdateInput,
} from '@/generated/prisma/models';

export type Account = AccountModel;
export type NewAccount = AccountUncheckedCreateInput;
export type UpdateAccount = AccountUncheckedUpdateInput;
