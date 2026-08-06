import { IsInt, IsOptional, IsString, IsArray, IsIn, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ChecklistLogStatus } from '@prisma/client';

export class SubmitAnswerDto {
  @IsInt()
  questionId!: number;

  @IsIn(['ok', 'not_ok', 'na'])
  status!: ChecklistLogStatus;
}

export class SubmitChecklistDto {
  @IsString()
  periodKey!: string;

  @IsOptional()
  @IsInt()
  sessionId?: number | null;

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
