import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type {
  RefreshTokenModel,
  RefreshTokenCreateInput,
} from '@/generated/prisma/models/RefreshToken';
import { createHash } from 'crypto';

@Injectable()
export class AuthRepository {
  constructor(protected readonly db: PrismaService) {}

  /**
   * Crea un refresh token en la BD (hasheado)
   */
  async createRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<RefreshTokenModel> {
    const hashedToken = this.hashToken(token);

    const data: RefreshTokenCreateInput = {
      token: hashedToken,
      user: { connect: { id: userId } },
      expiresAt,
    };

    return await this.db.refreshToken.create({ data });
  }

  /**
   * Busca un refresh token por su hash
   */
  async findRefreshToken(token: string) {
    const hashedToken = this.hashToken(token);

    return await this.db.refreshToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });
  }

  /**
   * Elimina un refresh token específico (logout)
   */
  async deleteRefreshToken(token: string): Promise<void> {
    const hashedToken = this.hashToken(token);

    await this.db.refreshToken.deleteMany({
      where: { token: hashedToken },
    });
  }

  /**
   * Elimina todos los refresh tokens de un usuario
   */
  async deleteAllUserRefreshTokens(userId: string): Promise<void> {
    await this.db.refreshToken.deleteMany({
      where: { userId },
    });
  }

  /**
   * Marca un refresh token como usado (para detección de reuso)
   */
  async markTokenAsUsed(token: string): Promise<void> {
    const hashedToken = this.hashToken(token);

    await this.db.refreshToken.update({
      where: { token: hashedToken },
      data: { wasUsed: true },
    });
  }

  /**
   * Revoca todos los tokens de un usuario (usado en caso de detección de reuso)
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.db.refreshToken.deleteMany({
      where: { userId },
    });
  }

  /**
   * Limpia tokens expirados (job periódico opcional)
   */
  async cleanExpiredTokens(): Promise<number> {
    const result = await this.db.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }

  /**
   * Hash SHA-256 para tokens
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
