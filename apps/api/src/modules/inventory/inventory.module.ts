import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryQrService } from './inventory-qr.service';
import { InventoryMediaService } from './inventory-media.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, InventoryQrService, InventoryMediaService],
  exports: [InventoryService],
})
export class InventoryModule {}
