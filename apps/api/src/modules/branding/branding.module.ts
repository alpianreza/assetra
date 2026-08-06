import { Module, Global } from '@nestjs/common';
import { BrandingService } from './branding.service';
import { PrismaModule } from '../../database/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [BrandingService],
  exports: [BrandingService],
})
export class BrandingModule {}
