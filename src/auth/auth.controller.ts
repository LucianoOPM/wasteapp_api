import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, RegisterSchema } from './dto/register.dto';
import { LoginDto, LoginSchema } from './dto/login.dto';
import { RefreshDto, RefreshSchema } from './dto/refresh.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ZodValidationPipe } from '@/pipes/ZodValidationPipe';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserData,
} from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(protected readonly authService: AuthService) {}

  /**
   * POST /auth/register
   */
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(RegisterSchema)) registerDto: RegisterDto,
  ): Promise<AuthResponseDto> {
    const { user, tokens } = await this.authService.register(registerDto);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      message: 'Usuario registrado exitosamente',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * POST /auth/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) loginDto: LoginDto,
  ): Promise<AuthResponseDto> {
    const { user, tokens } = await this.authService.login(loginDto);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      message: 'Inicio de sesión exitoso',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * POST /auth/logout
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body(new ZodValidationPipe(RefreshSchema)) refreshDto: RefreshDto,
  ): Promise<{ message: string }> {
    await this.authService.logout(refreshDto.refreshToken);

    return { message: 'Sesión cerrada exitosamente' };
  }

  /**
   * POST /auth/refresh
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body(new ZodValidationPipe(RefreshSchema)) refreshDto: RefreshDto,
  ): Promise<AuthResponseDto> {
    const { accessToken, user } = await this.authService.refresh(
      refreshDto.refreshToken,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      message: 'Token renovado exitosamente',
      accessToken,
    };
  }

  /**
   * GET /auth/me - Endpoint protegido de ejemplo
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: CurrentUserData) {
    return user;
  }
}
