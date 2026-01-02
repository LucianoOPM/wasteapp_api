import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { NewTransaction } from './entities/transaction.entity';

@Injectable()
export class TransactionsRepository {
  constructor(protected readonly db: PrismaService) {}

  async create(data: NewTransaction) {
    return await this.db.transaction.create({ data });
  }

  /**
   * Obtiene todas las transacciones completadas de una cuenta
   * @param accountId ID de la cuenta
   */
  async findAllByAccount(accountId: string) {
    return await this.db.transaction.findMany({
      where: {
        accountId,
        status: 'COMPLETED',
      },
      orderBy: {
        date: 'asc',
      },
    });
  }
}
