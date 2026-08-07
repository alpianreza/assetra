import { Module } from '@nestjs/common';
import { QrService } from './qr.service';
import { QrController, PublicController } from './qr.controller';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [QrController, PublicController],
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
