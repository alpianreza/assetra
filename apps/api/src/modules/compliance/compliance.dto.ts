import { IsInt, IsOptional, IsString, IsArray, IsIn, ArrayMinSize, ValidateNested, MaxLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ChecklistLogStatus } from '@prisma/client';

export class SubmitAnswerDto {
  @IsInt()
  questionId!: number;

  @IsIn(['ok', 'not_ok', 'na'])
  status!: ChecklistLogStatus;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  remark?: string;
}

export class SubmitChecklistDto {
  @IsString()
  periodKey!: string;

  @IsOptional()
  @Transform(({ value }) => value === '' || value == null ? undefined : Number(value))
  @IsInt()
  sessionId?: number | null;

  @Transform(({ value }) => typeof value === 'string' ? JSON.parse(value) : value)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers!: SubmitAnswerDto[];
}

export class QueryComplianceDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  inventoryId?: number;
}
