import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { TransactionsRepository } from './transactions.repository';
import { PrismaModule } from '@/prisma/prisma.module';
import { AccountsRepository } from '@/accounts/accounts.repository';

@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionsRepository, AccountsRepository],
  exports: [TransactionsService],
  imports: [PrismaModule],
})
export class TransactionsModule {}
