import { IsArray, IsInt, ArrayNotEmpty } from 'class-validator';

export class BatchQrDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  inventoryIds!: number[];
}
