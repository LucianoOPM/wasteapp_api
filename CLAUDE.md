# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **NestJS backend** for a personal finance management application called "WasteApp". The application tracks financial transactions, accounts (bank accounts, credit cards, cash), budgets, recurring transactions, installments (MSI - Meses Sin Intereses), and financial goals.

**Tech Stack:**

- Framework: NestJS
- Database: PostgreSQL with Prisma ORM
- Validation: Zod schemas
- Authentication: bcryptjs for password hashing
- Package Manager: pnpm

## Common Commands

### Development

```bash
# Install dependencies
pnpm install

# Start development server (watch mode)
pnpm run start:dev

# Start in debug mode
pnpm run start:debug

# Build for production
pnpm run build

# Run production build
pnpm run start:prod
```

### Database (Prisma)

```bash
# Generate Prisma client (after schema changes)
npx prisma generate

# Create a new migration
npx prisma migrate dev --name <migration_name>

# Apply migrations in production
npx prisma migrate deploy

# Open Prisma Studio (database GUI)
npx prisma studio

# Reset database (warning: deletes all data)
npx prisma migrate reset
```

### Code Quality

```bash
# Run linter
pnpm run lint

# Format code
pnpm run format
```

### Testing

```bash
# Run unit tests
pnpm run test

# Run e2e tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```

## Architecture

### Application Structure

The application follows a **modular architecture** with the following key patterns:

```
src/
├── accounts/          # Account management (bank, credit cards, cash)
├── auth/              # User authentication
├── transactions/      # Transaction handling
├── users/            # User management
├── utils/            # Shared utilities (PasswordManager)
├── pipes/            # Custom validation pipes (ZodValidationPipe)
├── prisma/           # Prisma service configuration
├── generated/        # Auto-generated Prisma types (DO NOT EDIT)
├── app.module.ts     # Root application module
├── config.ts         # Configuration loader
└── main.ts           # Application entry point
```

### Module Pattern

Each feature module follows this structure:

```
module/
├── dto/                    # Data Transfer Objects with Zod schemas
├── entities/               # Entity type definitions
├── module.controller.ts    # HTTP endpoints
├── module.service.ts       # Business logic
├── module.repository.ts    # Database access layer
└── module.module.ts        # Module definition
```

### Key Architectural Decisions

1. **Validation Strategy**: Use **Zod schemas** for DTOs instead of class-validator
   - Define schemas with `z.object()`
   - Export inferred types with `z.infer<typeof Schema>`
   - Apply validation using custom `ZodValidationPipe`

2. **Database Access Pattern**: Repository pattern with Prisma
   - **Services** contain business logic, never directly access Prisma
   - **Repositories** handle all database operations
   - Use generated Prisma types from `src/generated/prisma/models/`
   - Import types like: `import type { UserModel, UserCreateInput } from '../generated/prisma/models/User'`

3. **Prisma Configuration**:
   - Client generates to `src/generated/prisma` (not default `node_modules/.prisma`)
   - Uses PostgreSQL adapter (`@prisma/adapter-pg`) in PrismaService
   - Custom PrismaService extends PrismaClient and implements OnModuleInit
   - Database URL comes from environment variable

4. **Dependency Injection**:
   - Use `@Inject(forwardRef(() => Service))` for circular dependencies (e.g., AccountsService ↔ TransactionsService)
   - Services are injected with `protected readonly` in constructors

5. **Global Configuration**:
   - ConfigModule is global (configured in app.module.ts)
   - Access config via `ConfigService.getOrThrow<T>('path.to.value')`
   - Configuration structure defined in `src/config.ts`

6. **API Prefix**: All routes are prefixed with `/api/v1` (set in main.ts)

## Database Schema Overview

The Prisma schema (`prisma/schema.prisma`) models a comprehensive personal finance system:

**Core Entities:**

- **User**: User accounts with authentication and preferences
- **Account**: Bank accounts, credit cards, cash, savings, investments
- **Transaction**: Income, expenses, transfers, adjustments
- **Category**: Hierarchical categories for organizing transactions
- **Budget**: Monthly budgets per category
- **RecurringTransaction**: Automated recurring transactions (daily, weekly, monthly, etc.)
- **Installment**: Installment purchases (MSI - interest-free monthly payments)
- **InstallmentPayment**: Individual payments for installments
- **CreditCardPeriod**: Credit card billing periods with cutoff/due dates
- **FinancialGoal**: Savings goals with targets and deadlines
- **Reminder**: User reminders for bills, budgets, goals
- **BalanceHistory**: Historical balance tracking for charts

**Important Enums:**

- `AccountType`: CHECKING, SAVINGS, CREDIT_CARD, CASH, INVESTMENT
- `TransactionType`: INCOME, EXPENSE, TRANSFER, ADJUSTMENT
- `TransactionStatus`: PENDING, COMPLETED, CANCELLED
- `CategoryType`: INCOME, EXPENSE
- `RecurrenceFrequency`: DAILY, WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, YEARLY

**Key Relationships:**

- Cascade deletes: User deletion cascades to all related entities
- Credit card accounts have periods with cutoff/due dates
- Transactions can be part of credit card periods, recurring transactions, or installments
- Transfers create two related transactions (source and destination)

## Development Guidelines

### Adding New Features

1. **Generate NestJS resources**:

   ```bash
   nest g resource <name>
   ```

2. **Create Zod schemas for DTOs** (not class-validator decorators)

3. **Use repository pattern**:
   - Create `<name>.repository.ts` for database operations
   - Import Prisma types from generated models
   - Services should only call repository methods

4. **Handle circular dependencies**:
   - Use `@Inject(forwardRef(() => Service))` when needed
   - Common between AccountsService ↔ TransactionsService

5. **Follow existing patterns**:
   - Look at `users/` or `accounts/` modules as reference
   - DTO validation: Define Zod schema → Export type → Use ZodValidationPipe in controller

### Working with Prisma

1. **After modifying schema.prisma**:

   ```bash
   npx prisma generate      # Regenerate types
   npx prisma migrate dev   # Create and apply migration
   ```

2. **Generated types location**: `src/generated/prisma/models/<Model>.ts`
   - Import types like `UserModel`, `UserCreateInput`, `UserFindManyArgs`
   - Never edit generated files

3. **PrismaService usage**:
   - Inject into repositories: `constructor(protected readonly db: PrismaService)`
   - Access models: `this.db.user.findMany(...)`, `this.db.account.create(...)`

### Path Aliases

TypeScript path alias `@/*` maps to `src/*`:

```typescript
import { UsersService } from '@/users/users.service';
```

### Environment Variables

Required in `.env`:

- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (default: 8080)
- `HOST`: Server host (default: localhost)
- `SALT`: bcrypt salt rounds for password hashing (default: 10)

## Notes

- **No global validation pipes**: Validation uses ZodValidationPipe per-endpoint
- **Password hashing**: Use `PasswordManager` service (in utils module) for all password operations
- **API responses**: No global response transformation; controllers return data directly
- **Error handling**: Use NestJS exceptions (`BadRequestException`, `NotFoundException`, etc.)
- **Spanish comments**: Schema uses Spanish comments (this is intentional for the Mexican market)
