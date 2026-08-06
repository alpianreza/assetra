import { IsString, IsNotEmpty, IsInt, IsOptional, IsBoolean, IsArray, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  questionText!: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  answerType?: string = 'radio';

  @IsOptional()
  optionsJson?: any;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean = true;

  /** Mirrors EAMS `checklist_master.require_photo`. */
  @IsBoolean()
  @IsOptional()
  requirePhoto?: boolean = false;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  placeholder?: string;

  @IsString()
  @IsOptional()
  helpText?: string;
}

export class UpdateQuestionDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  questionText?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  answerType?: string;

  @IsOptional()
  optionsJson?: any;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  requirePhoto?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  placeholder?: string;

  @IsString()
  @IsOptional()
  helpText?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class ReorderQuestionsDto {
  @IsArray()
  @IsInt({ each: true })
  questionIds!: number[];
}

export class CreateChecklistTemplateDto {
  @IsInt()
  itemTypeId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[] = [];

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  sessionIds?: number[];
}

export class UpdateChecklistTemplateDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateTemplateQuestionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[] = [];
}

export class AssignTemplateSessionDto {
  @IsArray()
  @IsInt({ each: true })
  sessionIds!: number[];
}

export class AssignInventoryTemplateDto {
  @IsInt()
  templateId!: number;

  @IsArray()
  @IsInt({ each: true })
  inventoryIds!: number[];
}
