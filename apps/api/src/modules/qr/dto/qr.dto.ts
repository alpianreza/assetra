import { IsArray, IsInt, ArrayNotEmpty, IsOptional } from 'class-validator';

export class BatchQrDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  inventoryIds!: number[];
}

export class RegenerateQrDto {
  /** Empty/omitted means regenerate every inventory in the QR gallery. */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  inventoryIds?: number[];
}
