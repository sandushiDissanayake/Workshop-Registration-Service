import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { DbService } from '../db/db.service';
import { AuthUser, Role } from '../common/types';
import { IS_PUBLIC, ROLES_KEY } from './roles';

/** Verifies the bearer token, then reloads the user so deactivation / role changes apply immediately. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private reflector: Reflector, private jwt: JwtService, private db: DbService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) return true;
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Missing bearer token');
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    const { rows } = await this.db.query<{ id: string; email: string; name: string; role: Role; is_active: boolean }>(
      'SELECT id, email, name, role, is_active FROM users WHERE id = $1',
      [payload.sub],
    );
    const u = rows[0];
    if (!u || !u.is_active) throw new UnauthorizedException('Account is disabled or no longer exists');
    req.user = { id: u.id, email: u.email, name: u.name, role: u.role } satisfies AuthUser;
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) return true;
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    const user: AuthUser | undefined = ctx.switchToHttp().getRequest().user;
    if (!roles || !user || !roles.includes(user.role)) {
      throw new ForbiddenException('Your role is not permitted to perform this action');
    }
    return true;
  }
}
