import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SanitizedUserDto } from '../dto/user-response.dto';

export const CurrentUser = createParamDecorator(
  (data: keyof SanitizedUserDto | undefined, ctx: ExecutionContext): SanitizedUserDto | SanitizedUserDto[keyof SanitizedUserDto] | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user: SanitizedUserDto | undefined = request.user;

    if (!user) return undefined;

    return data ? user[data] : user;
  },
);