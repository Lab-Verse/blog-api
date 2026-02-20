import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/modules/users/users.service';

interface JwtPayload {
  sub: string;
  email?: string;
  role_id?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    console.log('JWT Strategy constructor called');
    const secret =
      configService.get<string>('JWT_SECRET') || 'your_super_secret_jwt_key';
    console.log('JWT Strategy secret:', secret);
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
    console.log('JWT Strategy initialized');
  }

  validate(payload: JwtPayload) {
    console.log('JWT Strategy validate called with payload:', payload);
    if (!payload.sub) {
      console.error('Invalid token: missing sub');
      throw new UnauthorizedException('Invalid token payload');
    }
    return {
      id: payload.sub,
      email: payload.email,
      role_id: payload.role_id,
    };
  }
}
