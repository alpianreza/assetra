import { Module } from '@nestjs/common';
import { AreasModule } from './areas/areas.module';
import { CategoriesModule } from './categories/categories.module';
import { AssetItemTypesModule } from './asset-item-types/asset-item-types.module';

@Module({
  imports: [AreasModule, CategoriesModule, AssetItemTypesModule],
  exports: [AreasModule, CategoriesModule, AssetItemTypesModule],
})
export class MasterDataModule {}