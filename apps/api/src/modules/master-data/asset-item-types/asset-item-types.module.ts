import { Module } from '@nestjs/common';
import { AssetItemTypesController } from './asset-item-types.controller';
import { AssetItemTypesService } from './asset-item-types.service';

@Module({
  controllers: [AssetItemTypesController],
  providers: [AssetItemTypesService],
  exports: [AssetItemTypesService],
})
export class AssetItemTypesModule {}
