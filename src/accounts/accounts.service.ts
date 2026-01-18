import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { BodyAccount } from './dto/create-account.dto';
import type { AccountFilter } from './dto/query-account.dto';
import type { UpdateAccountDto } from './dto/update-account.dto';
import { AccountsRepository } from './accounts.repository';
import { UsersService } from '@/users/users.service';
import type {
  NewAccount,
  UpdateAccount,
  Account,
} from './entities/account.entity';
import { TransactionsService } from '@/transactions/transactions.service';
import {
  buildPaginatedResponse,
  type PaginatedResponse,
} from '@/utils/response.types';

@Injectable()
export class AccountsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly transactionsService: TransactionsService,
    private readonly accountsRepository: AccountsRepository,
  ) {}

  async create(newdata: BodyAccount, userId: string) {
    const user = await this.usersService.findOne(userId);
    const accountType = this.accountTypeManager(newdata.type);

    const accountData: NewAccount = {
      userId: user.id,
      name: newdata.accountName,
      type: accountType,
      currency: newdata.currency,
      currentBalance: 0, // Todas las cuentas empiezan en 0, las transacciones ajustarán el balance
      color: newdata.color,
      icon: newdata.icon,
      notes: newdata.notes,
    };

    let initialDebt: number | undefined;
    let initialBalance: number = newdata.balance;

    if (newdata.type === 'credit') {
      initialDebt = newdata.initialDebt;
      // Para tarjetas de crédito: el balance se ajustará con transacciones
      accountData.bankName = newdata.bankName;
      accountData.creditLimit = newdata.creditLimit;
      accountData.cutoffDay = newdata.cutoffDay;
      accountData.paymentDueDays = newdata.paymentDueDays;
      accountData.interestRate = newdata.annualInteres;
      accountData.minimumPaymentPct = newdata.minimumPayment;
      accountData.lastFourDigits = newdata.lastDigits;
    }

    if (newdata.type === 'debit') {
      accountData.bankName = newdata.bankName;
      accountData.lastFourDigits = newdata.lastDigits;
    }

    const account = await this.accountsRepository.create(accountData);

    // Crear transacciones iniciales (balance y/o deuda según tipo de cuenta)
    await this.transactionsService.createInitialTransactions({
      accountId: account.id,
      userId: user.id,
      accountType: account.type,
      balance: initialBalance,
      initialDebt,
    });

    return account;
  }

  async findAll(filter: AccountFilter): Promise<PaginatedResponse<Account>> {
    const { data, total } = await this.accountsRepository.findAll(filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    return buildPaginatedResponse(data, page, limit, total);
  }

  async findOne(id: string) {
    const account = await this.accountsRepository.getById(id);
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  async update(id: string, updateData: UpdateAccountDto, userId: string) {
    const account = await this.findOne(id);

    // Validar que el usuario que está editando es el dueño de la cuenta
    if (account.userId !== userId) {
      throw new BadRequestException(
        'No tienes permisos para editar esta cuenta',
      );
    }

    const finalType = updateData.type ?? account.type;

    const creditCardFields = [
      'creditLimit',
      'cutoffDay',
      'paymentDueDays',
      'interestRate',
      'minimumPaymentPct',
    ] as const;

    const updatePayload: UpdateAccount = {
      ...updateData,
      type: finalType as UpdateAccount['type'],
    };

    // Si no es tarjeta de crédito, limpiar campos exclusivos de tarjeta
    if (finalType !== 'CREDIT_CARD') {
      for (const field of creditCardFields) {
        if (field in updatePayload) {
          delete updatePayload[field];
        }
      }
      // Limpiar campos en BD si cambia de CREDIT_CARD a otro tipo
      if (account.type === 'CREDIT_CARD' && updateData.type) {
        updatePayload.creditLimit = null;
        updatePayload.cutoffDay = null;
        updatePayload.paymentDueDays = null;
        updatePayload.interestRate = null;
        updatePayload.minimumPaymentPct = null;
      }
    }

    // Si es CASH, no debería tener bankName ni lastFourDigits
    if (finalType === 'CASH') {
      if (
        (account.type !== 'CASH' && updateData.type === 'CASH') ||
        updateData.bankName !== undefined
      ) {
        updatePayload.bankName = null;
        updatePayload.lastFourDigits = null;
      }
    }
    if (finalType === 'CREDIT_CARD') {
      //VALIDAR EL TIPO DE CUENTA ACTUAL, SI YA TIENE NOMBRE DE BANCO, CURRENT BALANCE NO SOLICITARLOS
      if (account.bankName && !updatePayload.bankName) {
        updatePayload.bankName = account.bankName;
      }
      this.validateBasicCreditCardFields(updatePayload);
    }
    return await this.accountsRepository.update(id, updatePayload);
  }

  async disable(id: string) {
    const account = await this.findOne(id);
    if (!account.isActive) {
      throw new BadRequestException('This account is already deleted');
    }
    return {
      message: `Account deleted`,
    };
  }

  async enable(id: string) {
    const account = await this.findOne(id);
    if (account.isActive) {
      throw new BadRequestException('This account is already active');
    }
    return {
      message: `Account reactivated`,
    };
  }

  private accountTypeManager(type: 'credit' | 'cash' | 'debit') {
    const typeMapper = {
      cash: 'CASH' as const,
      credit: 'CREDIT_CARD' as const,
      debit: 'SAVINGS' as const,
    };
    return typeMapper[type];
  }
  /**
   * Recalcula el balance de una cuenta sumando todas sus transacciones completadas
   * Útil para auditorías o para corregir inconsistencias
   * @param accountId ID de la cuenta
   * @returns El nuevo balance calculado
   */
  async recalculateBalance(accountId: string): Promise<{
    previousBalance: number;
    calculatedBalance: number;
    updated: boolean;
  }> {
    const account = await this.findOne(accountId);
    const previousBalance = Number(account.currentBalance);

    // Obtener todas las transacciones completadas
    const transactions =
      await this.transactionsService.getTransactionsByAccount(accountId);

    // Calcular el balance sumando todas las transacciones
    let calculatedBalance = 0;

    for (const transaction of transactions) {
      const amount = Number(transaction.amount);

      switch (transaction.type) {
        case 'INCOME':
        case 'ADJUSTMENT':
          calculatedBalance += amount;
          break;

        case 'EXPENSE':
          calculatedBalance -= amount;
          break;

        case 'TRANSFER':
          // Para transferencias, verificar si es origen o destino
          if (transaction.isTransferSource) {
            calculatedBalance -= amount;
          } else {
            calculatedBalance += amount;
          }
          break;
      }
    }

    // Actualizar el balance si hay diferencia
    const hasDiscrepancy = previousBalance !== calculatedBalance;

    if (hasDiscrepancy) {
      await this.accountsRepository.setBalance(accountId, calculatedBalance);
    }

    return {
      previousBalance,
      calculatedBalance,
      updated: hasDiscrepancy,
    };
  }

  private validateBasicCreditCardFields(data: UpdateAccount) {
    const requiredFields = [
      'bankName',
      'creditLimit',
      'cutoffDay',
      'paymentDueDays',
      'minimumPaymentPct',
    ];
    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new BadRequestException(
          `Al crear una cuenta de tarjeta de crédito, el campo ${field} es obligatorio.`,
        );
      }
    }
  }
}
