import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';

@Injectable()
export class PasswordManager {
  private readonly salt: number;

  constructor(private readonly configService: ConfigService) {
    this.salt = this.configService.getOrThrow<number>('app.salt');
  }

  /**
   * Hashea una contraseña usando bcrypt
   * @param password - Contraseña en texto plano
   * @returns Promise con el hash de la contraseña
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.salt);
  }

  /**
   * Compara una contraseña en texto plano con un hash
   * @param password - Contraseña en texto plano
   * @param hash - Hash almacenado
   * @returns Promise con true si coinciden, false si no
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Genera un salt (útil si quieres generar salts dinámicos)
   * @param rounds - Número de rondas (por defecto usa el configurado)
   * @returns Promise con el salt generado
   */
  async generateSalt(rounds?: number): Promise<string> {
    return bcrypt.genSalt(rounds || this.salt);
  }
}
