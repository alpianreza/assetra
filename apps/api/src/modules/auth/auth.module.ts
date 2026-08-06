import { Module, Global } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { PasswordService } from './password.service';
import { PrismaModule } from '../../database/prisma.module';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { CsrfGuard } from './guards/csrf.guard';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LocalStrategy } from './strategies/local.strategy';

import { AuditService } from './audit.service';

@Global()
@Module({
  imports: [
    PrismaModule,
    PassportModule,
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      // Use higher limit in test environment to avoid rate limiting during e2e tests
      limit: process.env.NODE_ENV === 'test' ? 1000 : 10,
    }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    PasswordService,
    AuditService,
    LocalStrategy,
    SessionAuthGuard,
    PermissionsGuard,
    CsrfGuard,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
  exports: [
    AuthService,
    SessionService,
    PasswordService,
    AuditService,
    LocalStrategy,
    SessionAuthGuard,
    PermissionsGuard,
    CsrfGuard,
  ],
})
export class AuthModule {}