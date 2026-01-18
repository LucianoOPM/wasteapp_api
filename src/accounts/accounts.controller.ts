import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Param,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { type BodyAccount, AccountSchema } from './dto/create-account.dto';
import {
  UpdateAccountSchema,
  type UpdateAccountDto,
} from './dto/update-account.dto';
import { ZodValidationPipe } from 'src/pipes/ZodValidationPipe';
import { AccountsService } from './accounts.service';
import {
  AccountFilterSchema,
  type AccountFilter,
} from '@/accounts/dto/query-account.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserData,
} from '@/auth/decorators/current-user.decorator';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountService: AccountsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body(new ZodValidationPipe(AccountSchema)) createAccountDto: BodyAccount,
    @CurrentUser() user: CurrentUserData,
  ) {
    return await this.accountService.create(createAccountDto, user.id);
  }

  @Get()
  async getAll(
    @Query(new ZodValidationPipe(AccountFilterSchema)) query: AccountFilter,
  ) {
    return await this.accountService.findAll(query);
  }

  @Get(':id')
  async getOne(@Param('id') idAccount: string) {
    return await this.accountService.findOne(idAccount);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateAccountSchema))
    updateData: UpdateAccountDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return await this.accountService.update(id, updateData, user.id);
  }

  @Patch('/delete/:id')
  async delete(@Param('id') id: string) {
    return await this.accountService.disable(id);
  }

  @Patch('/reactivate/:id')
  async reactivate(@Param('id') id: string) {
    return await this.accountService.enable(id);
  }
}
