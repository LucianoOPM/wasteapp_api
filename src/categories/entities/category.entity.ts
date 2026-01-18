import {
  CategoryModel,
  CategoryUncheckedCreateInput,
  CategoryUncheckedUpdateInput,
} from '@/generated/prisma/models';

export type Category = CategoryModel;
export type NewCategory = CategoryUncheckedCreateInput;
export type UpdateCategory = CategoryUncheckedUpdateInput;
