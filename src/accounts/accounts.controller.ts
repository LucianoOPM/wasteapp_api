import {
  Controller,
  Post,
  Body,
  UsePipes,
  Get,
  Query,
  Param,
  Patch,
  Put,
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

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountService: AccountsService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(AccountSchema))
  async create(@Body() createAccountDto: BodyAccount) {
    return await this.accountService.create(createAccountDto);
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
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateAccountSchema))
    updateData: UpdateAccountDto,
  ) {
    return await this.accountService.update(id, updateData);
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
