import { IsInt, IsOptional, IsString, IsArray, IsIn, ArrayMinSize, ValidateNested, MaxLength } from 'class-validator';
import { Transform, Type, plainToInstance } from 'class-transformer';
import { ChecklistLogStatus } from '@prisma/client';

export class SubmitAnswerDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  questionId!: number;

  @IsIn(['ok', 'not_ok', 'na'])
  status!: ChecklistLogStatus;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  remark?: string;
}

function parseAnswers(value: unknown): unknown {
  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return parsed;
    }
  }
  if (!Array.isArray(parsed)) return parsed;

  // Multipart fields arrive as strings. Instantiate every nested answer here;
  // otherwise ValidateNested receives plain objects after JSON.parse and Nest's
  // whitelist validation rejects their questionId/status properties with 400.
  return plainToInstance(SubmitAnswerDto, parsed);
}

export class SubmitChecklistDto {
  @IsString()
  periodKey!: string;

  @IsOptional()
  @Transform(({ value }) => value === '' || value == null ? undefined : Number(value))
  @IsInt()
  sessionId?: number | null;

  @Transform(({ value }) => parseAnswers(value))
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
