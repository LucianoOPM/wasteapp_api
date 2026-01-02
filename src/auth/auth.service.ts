import { Injectable, UnauthorizedException } from '@nestjs/common';
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
    console.log({ loginDto });

    // Validar credenciales
    const user = await this.validateUser(loginDto.email, loginDto.password);

    // Generar tokens (pasando rememberMe)
    const tokens = await this.generateTokenPair(
      user,
      loginDto.rememberMe ?? false,
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
    await this.authRepository.deleteRefreshToken(refreshToken);
  }

  /**
   * Refresh: genera nuevo access token usando refresh token
   */
  async refresh(refreshToken: string) {
    // Buscar refresh token en BD
    const storedToken =
      await this.authRepository.findRefreshToken(refreshToken);

    if (!storedToken) {
      throw new UnauthorizedException('Token inválido');
    }

    // Verificar expiración
    if (storedToken.expiresAt < new Date()) {
      await this.authRepository.deleteRefreshToken(refreshToken);
      throw new UnauthorizedException('Token expirado');
    }

    // Verificar que el usuario esté activo
    if (!storedToken.user.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // Verificar firma del refresh token
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

    // Generar SOLO nuevo access token (refresh token sigue siendo válido)
    const accessToken = await this.generateAccessToken(storedToken.user);

    return {
      accessToken,
      user: this.sanitizeUser(storedToken.user),
    };
  }

  /**
   * Valida credenciales de usuario
   */
  async validateUser(email: string, password: string): Promise<UserModel> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const isPasswordValid = await this.passwordManager.comparePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
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
    const accessExpiresIn = this.configService.getOrThrow<string>(
      'jwt.accessExpiresIn',
    );

    return await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn as any,
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

    // Seleccionar duración según rememberMe
    const refreshExpiresIn = rememberMe
      ? this.configService.getOrThrow<string>('jwt.refreshExpiresInLong') // 30 días
      : this.configService.getOrThrow<string>('jwt.refreshExpiresInShort'); // 1 hora

    // Generar token JWT con jti único
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn as any,
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
