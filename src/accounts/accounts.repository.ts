import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import type { NewAccount, UpdateAccount } from './entities/account.entity';
import type { AccountFilter } from './dto/query-account.dto';
import type { Prisma } from '@/generated/prisma/client';

export interface FindAllResult {
  data: Awaited<ReturnType<typeof PrismaService.prototype.account.findMany>>;
  total: number;
}

@Injectable()
export class AccountsRepository {
  constructor(protected readonly db: PrismaService) {}

  async create(data: NewAccount) {
    return await this.db.account.create({ data });
  }

  async getById(id: string) {
    return await this.db.account.findUnique({
      where: {
        id,
      },
    });
  }

  async findAll(filter: AccountFilter): Promise<FindAllResult> {
    const {
      page = 1,
      limit = 10,
      order = 'desc',
      orderBy = 'createdAt',
      name,
      type,
      bankName,
      isActive,
      currency,
    } = filter;

    const where: Prisma.AccountWhereInput = {};

    if (name) {
      where.name = { contains: name, mode: 'insensitive' };
    }

    if (type) {
      where.type = type as Prisma.AccountWhereInput['type'];
    }

    if (bankName) {
      where.bankName = { contains: bankName, mode: 'insensitive' };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (currency) {
      where.currency = currency;
    }

    const orderByClause: Prisma.AccountOrderByWithRelationInput = {
      [orderBy]: order,
    };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.db.account.findMany({
        where,
        orderBy: orderByClause,
        skip,
        take: limit,
      }),
      this.db.account.count({ where }),
    ]);

    return { data, total };
  }

  async update(id: string, data: UpdateAccount) {
    return await this.db.account.update({
      where: { id },
      data,
    });
  }

  /**
   * Actualiza el balance de una cuenta incrementando o decrementando el valor actual
   * @param accountId ID de la cuenta
   * @param amount Cantidad a sumar (positiva) o restar (negativa)
   */
  async updateBalance(accountId: string, amount: number) {
    return await this.db.account.update({
      where: { id: accountId },
      data: {
        currentBalance: {
          increment: amount,
        },
      },
    });
  }

  /**
   * Establece el balance de una cuenta a un valor específico
   * @param accountId ID de la cuenta
   * @param newBalance Nuevo balance
   */
  async setBalance(accountId: string, newBalance: number) {
    return await this.db.account.update({
      where: { id: accountId },
      data: {
        currentBalance: newBalance,
      },
    });
  }
}
