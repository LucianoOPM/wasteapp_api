import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '@/users/users.service';
import { PasswordManager } from '@/utils/password.service';
import { AuthRepository } from './auth.repository';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { UserModel } from '@/generated/prisma/models/User';
import { randomBytes } from 'crypto';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    protected readonly usersService: UsersService,
    protected readonly passwordManager: PasswordManager,
    protected readonly authRepository: AuthRepository,
    protected readonly jwtService: JwtService,
    protected readonly configService: ConfigService,
  ) {}

  /**
   * Registro de nuevo usuario
   */
  async register(registerDto: RegisterDto) {
    // Delegar creación de usuario al UsersService (ya valida email duplicado)
    const user = await this.usersService.create({
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      email: registerDto.email,
      password: registerDto.password,
    });

    // Generar tokens (pasando rememberMe)
    const tokens = await this.generateTokenPair(
      user,
      registerDto.rememberMe ?? false,
    );

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Login de usuario
   */
  async login(loginDto: LoginDto) {
    // Validar credenciales
    const user = await this.validateUser(loginDto.email, loginDto.password);

    // Generar tokens (pasando rememberMe)
    const tokens = await this.generateTokenPair(
      user,
      loginDto.rememberMe ?? false,
    );

    // Log exitoso
    this.logger.log(
      `Successful login for user: ${user.email} (ID: ${user.id})`,
    );

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Logout: invalida refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    const storedToken =
      await this.authRepository.findRefreshToken(refreshToken);

    if (storedToken) {
      this.logger.log(`User logged out: ${storedToken.userId}`);
    }

    await this.authRepository.deleteRefreshToken(refreshToken);
  }

  /**
   * Refresh: genera nuevos access y refresh tokens, revocando el anterior
   */
  async refresh(refreshToken: string) {
    // 1. Buscar refresh token en BD
    const storedToken =
      await this.authRepository.findRefreshToken(refreshToken);

    if (!storedToken) {
      throw new UnauthorizedException('Token inválido');
    }

    // 2. Verificar si el token fue marcado como "usado" (detección de reuso)
    if (storedToken.wasUsed) {
      // ¡Token reutilizado! Posible robo - revocar todas las sesiones del usuario
      this.logger.error(
        `SECURITY: Token reuse detected for user ${storedToken.userId}. All sessions revoked.`,
      );

      await this.authRepository.revokeAllUserTokens(storedToken.userId);
      throw new UnauthorizedException(
        'Token reuse detected. All sessions have been invalidated for security.',
      );
    }

    // 3. Verificar expiración en BD
    if (storedToken.expiresAt < new Date()) {
      await this.authRepository.deleteRefreshToken(refreshToken);
      throw new UnauthorizedException('Token expirado');
    }

    // 4. Verificar que el usuario esté activo
    if (!storedToken.user.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // 5. Verificar firma del refresh token
    try {
      const refreshSecret =
        this.configService.getOrThrow<string>('jwt.refreshSecret');
      await this.jwtService.verifyAsync(refreshToken, {
        secret: refreshSecret,
      });
    } catch (error) {
      await this.authRepository.deleteRefreshToken(refreshToken);
      throw new UnauthorizedException('Token inválido');
    }

    // 6. Marcar token como "usado" antes de eliminarlo (para detectar reuso)
    await this.authRepository.markTokenAsUsed(refreshToken);

    // 7. Determinar si el token original era de larga duración (rememberMe)
    const tokenDurationMs =
      storedToken.expiresAt.getTime() - storedToken.createdAt.getTime();
    const tokenDurationDays = tokenDurationMs / (1000 * 60 * 60 * 24);
    const rememberMe = tokenDurationDays > 7;

    // 8. Generar NUEVOS tokens
    const accessToken = await this.generateAccessToken(storedToken.user);
    const newRefreshToken = await this.generateRefreshToken(
      storedToken.user,
      rememberMe,
    );

    // 9. Revocar/invalidar el refresh token anterior (eliminarlo de BD)
    await this.authRepository.deleteRefreshToken(refreshToken);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: this.sanitizeUser(storedToken.user),
    };
  }

  /**
   * Valida credenciales de usuario
   */
  async validateUser(email: string, password: string): Promise<UserModel> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      this.logger.warn(`Failed login attempt - user not found: ${email}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isActive) {
      this.logger.warn(`Failed login attempt - inactive user: ${email}`);
      throw new UnauthorizedException('Usuario inactivo');
    }

    const isPasswordValid = await this.passwordManager.comparePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      this.logger.warn(
        `Failed login attempt - invalid password for user: ${email}`,
      );
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return user;
  }

  /**
   * Valida un usuario por ID (usado por JwtStrategy)
   */
  async validateUserById(userId: string): Promise<UserModel> {
    const user = await this.usersService.findOne(userId);

    if (!user.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    return user;
  }

  /**
   * Verifica y decodifica un access token
   */
  verifyAccessToken(token: string, secret: string): JwtPayload {
    return this.jwtService.verify(token, { secret });
  }

  /**
   * Genera par de tokens (access + refresh)
   */
  private async generateTokenPair(
    user: UserModel,
    rememberMe: boolean,
  ): Promise<TokenPair> {
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user, rememberMe);

    return { accessToken, refreshToken };
  }

  /**
   * Genera access token
   */
  private async generateAccessToken(user: UserModel): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    const accessSecret =
      this.configService.getOrThrow<string>('jwt.accessSecret');
    const accessExpiresIn = this.configService.getOrThrow<'15m' | '30d'>(
      'jwt.accessExpiresIn',
    );
    const issuer = this.configService.getOrThrow<string>('jwt.issuer');
    const audience = this.configService.getOrThrow<string>('jwt.audience');

    return await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      algorithm: 'HS256',
      expiresIn: accessExpiresIn,
      issuer,
      audience,
    });
  }

  /**
   * Genera refresh token y lo almacena en BD (hasheado)
   */
  private async generateRefreshToken(
    user: UserModel,
    rememberMe: boolean,
  ): Promise<string> {
    const jti = randomBytes(32).toString('hex');

    const payload = {
      sub: user.id,
      email: user.email,
      jti,
    };

    const refreshSecret =
      this.configService.getOrThrow<string>('jwt.refreshSecret');
    const issuer = this.configService.getOrThrow<string>('jwt.issuer');
    const audience = this.configService.getOrThrow<string>('jwt.audience');

    // Seleccionar duración según rememberMe
    const refreshExpiresIn = rememberMe
      ? this.configService.getOrThrow<'30d'>('jwt.refreshExpiresInLong') // 30 días
      : this.configService.getOrThrow<'7d'>('jwt.refreshExpiresInShort'); // 7 días

    // Generar token JWT con jti único
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      algorithm: 'HS256',
      expiresIn: refreshExpiresIn,
      issuer,
      audience,
    });

    // Calcular fecha de expiración
    const expiresAt = this.calculateExpirationDate(refreshExpiresIn);

    // Guardar en BD (hasheado)
    await this.authRepository.createRefreshToken(
      user.id,
      refreshToken,
      expiresAt,
    );

    return refreshToken;
  }

  /**
   * Calcula la fecha de expiración basada en un string de duración
   */
  private calculateExpirationDate(duration: string): Date {
    const expiresAt = new Date();

    // Parsear duración (ej: "30d", "1h", "15m")
    const daysMatch = duration.match(/(\d+)d/);
    const hoursMatch = duration.match(/(\d+)h/);
    const minutesMatch = duration.match(/(\d+)m/);

    if (daysMatch) {
      expiresAt.setDate(expiresAt.getDate() + parseInt(daysMatch[1]));
    } else if (hoursMatch) {
      expiresAt.setHours(expiresAt.getHours() + parseInt(hoursMatch[1]));
    } else if (minutesMatch) {
      expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(minutesMatch[1]));
    }

    return expiresAt;
  }

  /**
   * Remueve información sensible del usuario
   */
  private sanitizeUser(user: UserModel) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
