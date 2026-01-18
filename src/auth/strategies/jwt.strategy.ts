import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService, JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    protected readonly configService: ConfigService,
    protected readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        JwtStrategy.extractJwtFromCookie,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.accessSecret'),
      algorithms: ['HS256'],
      issuer: configService.getOrThrow<string>('jwt.issuer'),
      audience: configService.getOrThrow<string>('jwt.audience'),
    });
  }

  /**
   * Extrae JWT desde cookie HTTP-only
   */
  private static extractJwtFromCookie(req: Request): string | null {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieName = isProduction ? '__Host-accessToken' : 'accessToken';

    if (req.cookies && req.cookies[cookieName]) {
      return req.cookies[cookieName];
    }
    return null;
  }

  /**
   * Valida el payload del JWT y retorna el usuario
   */
  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException();
    }

    // Este objeto se adjunta a request.user
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}
