import { IsString, IsOptional, IsInt, IsArray, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class ReportPreviewDto {
  @IsInt()
  @Type(() => Number)
  inventoryId!: number;

  @IsInt()
  @Type(() => Number)
  templateId!: number;

  @IsString()
  periodKey!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sessionId?: number | null;
}

export class BatchReportPreviewDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Type(() => Number)
  inventoryIds!: number[];

  @IsString()
  periodKey!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sessionId?: number | null;
}