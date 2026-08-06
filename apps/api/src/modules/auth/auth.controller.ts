import { Controller, Post, Get, Body, Req, Res, HttpCode, HttpStatus, UseGuards, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SanitizedUserDto } from './dto/user-response.dto';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import * as crypto from 'crypto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private readonly AUTH_COOKIE_NAME = 'assetra_session';
  private readonly CSRF_COOKIE_NAME = 'assetra_csrf';
  private readonly COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  private readonly CSRF_COOKIE_OPTIONS = {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  @Get('csrf')
  @HttpCode(HttpStatus.OK)
  async getCsrf(@Res({ passthrough: true }) res: Response) {
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie(this.CSRF_COOKIE_NAME, csrfToken, this.CSRF_COOKIE_OPTIONS);
    return { success: true, data: { csrfToken } };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SanitizedUserDto> {
    const ipAddress = req.ip;
    const result = await this.authService.validateUser(loginDto.identifier, loginDto.password, ipAddress);

    if (!result) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { user, rawToken } = result;
    const csrfToken = crypto.randomBytes(32).toString('hex');

    res.cookie(this.AUTH_COOKIE_NAME, rawToken, this.COOKIE_OPTIONS);
    res.cookie(this.CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return await this.authService.getUserWithPermissions(user.id) as SanitizedUserDto;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionAuthGuard)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const sessionToken = req.cookies?.assetra_session;
    if (sessionToken) {
      await this.authService.logout(sessionToken, req.ip);
    }
    res.clearCookie(this.AUTH_COOKIE_NAME, { ...this.COOKIE_OPTIONS, maxAge: 0 });
    res.clearCookie(this.CSRF_COOKIE_NAME, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 0
    });
    return { message: 'Logout successful' };
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  async me(
    @CurrentUser() user: SanitizedUserDto,
  ): Promise<SanitizedUserDto> {
    return user;
  }
}