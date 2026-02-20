import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProfileEntity } from '../entities';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  validate(payload: {
    sub: string;
    email: string;
    role: string;
    isEmailVerified: boolean;
  }): ProfileEntity {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      isEmailVerified: payload.isEmailVerified,
    } as ProfileEntity;
  }
}
