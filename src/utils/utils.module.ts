import { Module } from '@nestjs/common';
import { PasswordManager } from './password.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [PasswordManager],
  exports: [PasswordManager],
})
export class UtilsModule {}
