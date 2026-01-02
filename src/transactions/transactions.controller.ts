import { Controller, Post, Body, UsePipes } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import {
  type BodyTransaction,
  TransactionSchema,
} from './dto/create-transaction.dto';
import { ZodValidationPipe } from '@/pipes/ZodValidationPipe';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(TransactionSchema))
  async create(@Body() createTransactionDto: BodyTransaction) {
    return await this.transactionsService.create(createTransactionDto);
  }
}
