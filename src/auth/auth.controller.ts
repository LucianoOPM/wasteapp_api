import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
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
  constructor(
    protected readonly authService: AuthService,
    protected readonly configService: ConfigService,
  ) {}

  /**
   * Convierte una duración JWT (ej: "15m", "7d", "30d") a milisegundos para cookie maxAge
   */
  private getTokenMaxAge(duration: string): number {
    const daysMatch = duration.match(/(\d+)d/);
    const hoursMatch = duration.match(/(\d+)h/);
    const minutesMatch = duration.match(/(\d+)m/);

    if (daysMatch) {
      return parseInt(daysMatch[1]) * 24 * 60 * 60 * 1000;
    } else if (hoursMatch) {
      return parseInt(hoursMatch[1]) * 60 * 60 * 1000;
    } else if (minutesMatch) {
      return parseInt(minutesMatch[1]) * 60 * 1000;
    }

    throw new Error(`Invalid token duration format: ${duration}`);
  }

  /**
   * Configura cookies de autenticación en la respuesta
   */
  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    rememberMe: boolean,
  ): void {
    const isProduction = process.env.NODE_ENV === 'production';

    // Usar prefijos __Host- en producción para mayor seguridad
    const accessTokenName = isProduction ? '__Host-accessToken' : 'accessToken';
    const refreshTokenName = isProduction
      ? '__Host-refreshToken'
      : 'refreshToken';
    const rememberMeName = isProduction ? '__Host-rememberMe' : 'rememberMe';

    // Obtener duraciones desde configuración
    const accessExpiresIn =
      this.configService.getOrThrow<string>('jwt.accessExpiresIn');
    const refreshExpiresIn = rememberMe
      ? this.configService.getOrThrow<string>('jwt.refreshExpiresInLong')
      : this.configService.getOrThrow<string>('jwt.refreshExpiresInShort');

    // Convertir duraciones a milisegundos (alineando JWT con cookie maxAge)
    const accessMaxAge = this.getTokenMaxAge(accessExpiresIn);
    const refreshMaxAge = this.getTokenMaxAge(refreshExpiresIn);

    // Cookie para access token
    res.cookie(accessTokenName, accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/', // Requerido para __Host-
      maxAge: accessMaxAge,
    });

    // Cookie para refresh token
    res.cookie(refreshTokenName, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/', // Requerido para __Host-
      maxAge: refreshMaxAge,
    });

    // Cookie para indicar si rememberMe está activo (no httpOnly, el frontend la puede leer)
    res.cookie(rememberMeName, rememberMe.toString(), {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'strict',
      path: '/', // Requerido para __Host-
      maxAge: refreshMaxAge,
    });
  }

  /**
   * Limpia las cookies de autenticación
   */
  private clearAuthCookies(res: Response): void {
    const isProduction = process.env.NODE_ENV === 'production';

    const accessTokenName = isProduction ? '__Host-accessToken' : 'accessToken';
    const refreshTokenName = isProduction
      ? '__Host-refreshToken'
      : 'refreshToken';
    const rememberMeName = isProduction ? '__Host-rememberMe' : 'rememberMe';

    res.clearCookie(accessTokenName);
    res.clearCookie(refreshTokenName);
    res.clearCookie(rememberMeName);
  }

  /**
   * POST /auth/register
   */
  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 registros por minuto
  async register(
    @Body(new ZodValidationPipe(RegisterSchema)) registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { user, tokens } = await this.authService.register(registerDto);

    // Configurar cookies HTTP-only
    this.setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
      registerDto.rememberMe ?? false,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      message: 'Usuario registrado exitosamente. Cookies configuradas.',
    };
  }

  /**
   * POST /auth/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 intentos por minuto
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { user, tokens } = await this.authService.login(loginDto);

    // Configurar cookies HTTP-only
    this.setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
      loginDto.rememberMe ?? false,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      message: 'Inicio de sesión exitoso. Cookies configuradas.',
    };
  }

  /**
   * POST /auth/logout
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const isProduction = process.env.NODE_ENV === 'production';
    const refreshTokenName = isProduction
      ? '__Host-refreshToken'
      : 'refreshToken';

    // Obtener refresh token desde la cookie
    const refreshToken = req.cookies?.[refreshTokenName];

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    // Limpiar cookies
    this.clearAuthCookies(res);

    return { message: 'Sesión cerrada exitosamente. Cookies eliminadas.' };
  }

  /**
   * POST /auth/refresh
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const isProduction = process.env.NODE_ENV === 'production';
    const refreshTokenName = isProduction
      ? '__Host-refreshToken'
      : 'refreshToken';
    const rememberMeName = isProduction ? '__Host-rememberMe' : 'rememberMe';

    // Obtener refresh token desde la cookie
    const refreshToken = req.cookies?.[refreshTokenName];
    const rememberMe = req.cookies?.[rememberMeName] === 'true';

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token no encontrado en cookies');
    }

    const {
      accessToken,
      refreshToken: newRefreshToken,
      user,
    } = await this.authService.refresh(refreshToken);

    // Configurar nuevas cookies
    this.setAuthCookies(res, accessToken, newRefreshToken, rememberMe);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      message: 'Token renovado exitosamente. Cookies actualizadas.',
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

  /**
   * GET /auth/validate - Valida el token actual y retorna tiempo de expiración
   * Endpoint ligero para verificación de sesión sin datos de usuario completos
   */
  @Get('validate')
  @UseGuards(JwtAuthGuard)
  async validateToken(@Req() req: Request) {
    const isProduction = process.env.NODE_ENV === 'production';
    const accessTokenName = isProduction ? '__Host-accessToken' : 'accessToken';
    const token = req.cookies?.[accessTokenName];

    if (!token) {
      return {
        valid: false,
        expiresIn: 0,
      };
    }

    try {
      const accessSecret =
        this.configService.getOrThrow<string>('jwt.accessSecret');
      const payload = this.authService.verifyAccessToken(token, accessSecret);

      // Calcular tiempo restante hasta expiración (en segundos)
      const expiresIn = payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : 0;

      return {
        valid: true,
        expiresIn: Math.max(0, expiresIn), // No retornar valores negativos
      };
    } catch {
      return {
        valid: false,
        expiresIn: 0,
      };
    }
  }
}
