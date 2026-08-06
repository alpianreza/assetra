import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ANY_PERMISSIONS_KEY, PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { SanitizedUserDto } from '../dto/user-response.dto';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? [];
    const anyPermissions = this.reflector.getAllAndOverride<string[]>(ANY_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? [];

    if (requiredPermissions.length === 0 && anyPermissions.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: SanitizedUserDto = request.user;

    if (!user || !user.permissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const wildcard = user.permissions.includes('*');
    const hasAll = wildcard || requiredPermissions.every(permission => user.permissions.includes(permission));
    const hasAny = wildcard || anyPermissions.length === 0 || anyPermissions.some(permission => user.permissions.includes(permission));

    if (!hasAll || !hasAny) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
