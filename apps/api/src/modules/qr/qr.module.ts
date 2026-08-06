import { Module } from '@nestjs/common';
import { QrService } from './qr.service';
import { QrController, PublicController } from './qr.controller';

@Module({
  imports: [],
  controllers: [QrController, PublicController],
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
