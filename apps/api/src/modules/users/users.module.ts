import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersMediaService } from './users-media.service';
@Module({ controllers: [UsersController], providers: [UsersService, UsersMediaService], exports: [UsersService] })
export class UsersModule {}
