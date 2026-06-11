import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, SESSION_COOKIE } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { cookies?: Record<string, string> }>();
    const token = req.cookies?.[SESSION_COOKIE];
    const username = this.auth.verify(token);
    if (!username) throw new UnauthorizedException();
    (req as Request & { adminUser?: string }).adminUser = username;
    return true;
  }
}
