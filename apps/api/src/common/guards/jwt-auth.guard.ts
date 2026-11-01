import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private jwtService?: JwtService,
    private configService?: ConfigService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      try {
        const req = context.switchToHttp().getRequest();
        const token =
          req.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
          req.cookies?.['accessToken'] ||
          (req.query?.['token'] as string);

        if (token && this.jwtService && this.configService) {
          const secret =
            this.configService.get<string>('jwt.accessSecret') ||
            'chithi_super_secret_jwt_access_key_2026_dev';
          const payload = this.jwtService.verify(token, { secret });
          req.user = {
            userId: payload.sub,
            username: payload.username,
            sessionId: payload.sessionId,
          };
        }
      } catch {
        // Optional auth on public route: proceed without user attached
      }
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
