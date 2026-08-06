import { IsString, IsInt, IsOptional, IsArray, IsIn, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export const INVENTORY_STATUSES = ['active', 'inactive', 'maintenance', 'disposed'] as const;
export type InventoryStatus = typeof INVENTORY_STATUSES[number];

/**
 * `assetCode` is intentionally absent: the nomor inventaris is always generated
 * server-side as KODEKATEGORI-KODEITEM-NOURUT and is read-only in the UI.
 */
export class CreateInventoryDto {
  @IsInt()
  itemTypeId!: number;

  @IsInt()
  areaId!: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  specificArea?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  typeDescription?: string;

  @IsIn(INVENTORY_STATUSES)
  @IsOptional()
  status?: InventoryStatus;

  @IsString()
  @IsOptional()
  remark?: string;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  picUserIds?: number[];
}

export class UpdateInventoryDto {
  @IsInt()
  @IsOptional()
  itemTypeId?: number;

  @IsInt()
  @IsOptional()
  areaId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  specificArea?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  typeDescription?: string;

  @IsIn(INVENTORY_STATUSES)
  @IsOptional()
  status?: InventoryStatus;

  @IsString()
  @IsOptional()
  remark?: string;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  picUserIds?: number[];
}

export class UpdateInventoryStatusDto {
    @IsIn(INVENTORY_STATUSES)
    status!: InventoryStatus;
}

export class PreviewAssetCodeDto {
  @Type(() => Number)
  @IsInt()
  itemTypeId!: number;
}

export class QueryInventoryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  itemTypeId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  areaId?: number;

  @IsOptional()
  @IsIn(INVENTORY_STATUSES)
  status?: InventoryStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  picId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}
