import { IsString, IsNotEmpty, IsBoolean, IsInt, MaxLength, IsEnum, IsOptional } from 'class-validator';

export enum ChecklistFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export class CreateAssetItemTypeDto {
  @IsInt()
  categoryId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code!: string;

  @IsEnum(ChecklistFrequency)
  checklistFrequency!: ChecklistFrequency;

  @IsBoolean()
  @IsOptional()
  allowNA?: boolean = false;
}

export class UpdateAssetItemTypeDto {
  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @IsOptional()
  @IsEnum(ChecklistFrequency)
  checklistFrequency?: ChecklistFrequency;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  allowNA?: boolean;
}
