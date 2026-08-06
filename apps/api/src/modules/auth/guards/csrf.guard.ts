import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

const CSRF_COOKIE_NAME = 'assetra_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Allow GET, HEAD, OPTIONS to bypass CSRF check
    const method = request.method.toUpperCase();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    const cookieToken = request.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = request.headers[CSRF_HEADER_NAME];

    if (!cookieToken || !headerToken) {
      throw new UnauthorizedException('CSRF token missing');
    }

    // Timing-safe comparison
    const cookieBuf = Buffer.from(cookieToken);
    const headerBuf = Buffer.from(headerToken);

    if (cookieBuf.length !== headerBuf.length) {
      throw new UnauthorizedException('CSRF token invalid');
    }

    if (!crypto.timingSafeEqual(cookieBuf, headerBuf)) {
      throw new UnauthorizedException('CSRF token invalid');
    }

    return true;
  }
}