import { Module, Global } from '@nestjs/common';
import { BrandingService } from './branding.service';
import { BrandingController } from './branding.controller';
import { PrismaModule } from '../../database/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [BrandingController],
  providers: [BrandingService],
  exports: [BrandingService],
})
export class BrandingModule {}
