import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SessionService } from '../session.service';
import { AuthService } from '../auth.service';

@Injectable()
export class SessionAuthGuard extends AuthGuard('session') {
  constructor(
    private readonly sessionService: SessionService,
    private readonly authService: AuthService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sessionToken = request.cookies?.assetra_session;

    if (!sessionToken) {
      throw new UnauthorizedException('Authentication required');
    }

    const session = await this.sessionService.findSession(sessionToken);

    if (!session || !session.user || session.user.status !== 'active') {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Attach the sanitized user (with roles + permissions, no passwordHash)
    // as `request.user` so permission guards and controllers can use it safely.
    const currentUser = await this.authService.getCurrentUser(session.user.id);
    if (!currentUser) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    request.user = currentUser;
    return true;
  }
}
