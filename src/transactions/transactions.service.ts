import { Injectable, NotFoundException } from '@nestjs/common';
import type { BodyTransaction } from '@/transactions/dto/create-transaction.dto';
import { TransactionsRepository } from './transactions.repository';
import { AccountsRepository } from '@/accounts/accounts.repository';
import type { AccountType } from '@/generated/prisma/enums';
import type {
  NewTransaction,
  InitialTransaction,
  BalanceTransaction,
  DebtTransaction,
} from './entities/transaction.entity';

@Injectable()
export class TransactionsService {
  constructor(
    protected readonly repository: TransactionsRepository,
    protected readonly accountsRepository: AccountsRepository,
  ) {}

  async create(createTransactionDto: BodyTransaction) {
    const account = await this.accountsRepository.getById(
      createTransactionDto.account,
    );
    if (!account) throw new NotFoundException('Account not found');
  }

  /**
   * Obtiene todas las transacciones de una cuenta
   * @param accountId ID de la cuenta
   */
  async getTransactionsByAccount(accountId: string) {
    return await this.repository.findAllByAccount(accountId);
  }

  /**
   * Crea las transacciones iniciales al crear una cuenta nueva
   * Maneja toda la lógica de qué transacciones crear según el tipo de cuenta:
   * - Cuentas normales (CASH, SAVINGS, etc.): 1 transacción de ADJUSTMENT si balance > 0
   * - Tarjetas de crédito: 1 ADJUSTMENT (límite) + 1 EXPENSE (deuda inicial si existe)
   */
  async createInitialTransactions(transaction: InitialTransaction) {
    let flag = false;
    // Todas las cuentas: crear transacción de saldo/límite inicial si balance > 0
    if (transaction.balance > 0) {
      await this.createBalanceTransaction({
        accountId: transaction.accountId,
        userId: transaction.userId,
        accountType: transaction.accountType,
        balance: transaction.balance,
      });
      flag = true;
    }

    // Solo tarjetas de crédito: crear transacción de deuda inicial si existe
    if (
      transaction.accountType === 'CREDIT_CARD' &&
      transaction.initialDebt &&
      transaction.initialDebt > 0
    ) {
      flag = false;
      await this.createDebtTransaction({
        accountId: transaction.accountId,
        userId: transaction.userId,
        initialDebt: transaction.initialDebt,
      });
      flag = true;
    }

    return flag;
  }

  /**
   * Crea una transacción de balance/límite inicial
   */
  private async createBalanceTransaction(data: BalanceTransaction) {
    const transactionData: NewTransaction = {
      userId: data.userId,
      accountId: data.accountId,
      amount: data.balance,
      date: new Date(),
      status: 'COMPLETED',
      type: 'ADJUSTMENT',
      description: this.getInitialBalanceDescription(data.accountType),
      notes: 'Saldo inicial de la cuenta',
      attachments: [],
      tags: ['saldo-inicial'],
    };

    const transaction = await this.repository.create(transactionData);

    // Actualizar el balance de la cuenta
    await this.updateAccountBalance(
      data.accountId,
      transactionData.type,
      Number(transactionData.amount),
    );

    return transaction;
  }

  /**
   * Crea una transacción de deuda inicial para tarjetas de crédito
   */
  private async createDebtTransaction(data: DebtTransaction) {
    const transactionData: NewTransaction = {
      userId: data.userId,
      accountId: data.accountId,
      amount: data.initialDebt,
      date: new Date(),
      status: 'COMPLETED',
      type: 'EXPENSE',
      description: 'Deuda inicial de tarjeta de crédito',
      notes: 'Adeudo inicial registrado al crear la cuenta',
      attachments: [],
      tags: ['deuda-inicial', 'tarjeta-credito'],
    };

    const transaction = await this.repository.create(transactionData);

    // Actualizar el balance de la cuenta (EXPENSE resta del balance)
    await this.updateAccountBalance(
      data.accountId,
      transactionData.type,
      Number(transactionData.amount),
    );

    return transaction;
  }

  /**
   * Actualiza el balance de una cuenta basado en el tipo de transacción
   * @param accountId ID de la cuenta a actualizar
   * @param transactionType Tipo de transacción (INCOME, EXPENSE, ADJUSTMENT)
   * @param amount Monto de la transacción (siempre positivo)
   */
  private async updateAccountBalance(
    accountId: string,
    transactionType: 'INCOME' | 'EXPENSE' | 'ADJUSTMENT' | 'TRANSFER',
    amount: number,
  ): Promise<void> {
    // Calcular el impacto en el balance según el tipo de transacción
    let balanceChange: number;

    switch (transactionType) {
      case 'INCOME':
      case 'ADJUSTMENT':
        // Ingresos y ajustes suman al balance
        balanceChange = amount;
        break;

      case 'EXPENSE':
        // Gastos restan del balance
        balanceChange = -amount;
        break;

      case 'TRANSFER':
        // Las transferencias se manejan de forma especial (no en este método)
        throw new Error(
          'Las transferencias deben manejarse con lógica específica',
        );

      default:
        throw new Error(`Tipo de transacción desconocido: ${transactionType}`);
    }

    // Actualizar el balance en la base de datos
    await this.accountsRepository.updateBalance(accountId, balanceChange);
  }

  /**
   * Genera la descripción apropiada según el tipo de cuenta
   */
  private getInitialBalanceDescription(accountType: AccountType): string {
    switch (accountType) {
      case 'CREDIT_CARD':
        return 'Límite de crédito inicial';

      case 'CASH':
        return 'Saldo inicial en efectivo';

      case 'SAVINGS':
        return 'Saldo inicial en cuenta de ahorros';

      case 'CHECKING':
        return 'Saldo inicial en cuenta de cheques';

      case 'INVESTMENT':
        return 'Saldo inicial en inversión';

      default:
        return 'Saldo inicial de cuenta';
    }
  }
}
