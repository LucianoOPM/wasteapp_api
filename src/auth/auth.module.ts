import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '@/users/users.module';
import { UtilsModule } from '@/utils/utils.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // Configuración se pasa en cada sign/verify
    UsersModule, // Para acceder a UsersService
    UtilsModule, // Para acceder a PasswordManager
    PrismaModule, // Para acceder a PrismaService
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, JwtStrategy],
  exports: [AuthService], // Exportar para uso en otros módulos si es necesario
})
export class AuthModule {}
