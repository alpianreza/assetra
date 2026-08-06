import { IsEnum, IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';

export enum WorkingDayType {
  WORKING = 'WORKING',
  OFF = 'OFF',
}

export class UpdateWorkingDayDto {
  @IsEnum(WorkingDayType)
  status!: WorkingDayType;
}

export class CreateHolidayOverrideDto {
  @IsString()
  @IsNotEmpty()
  date!: string; // YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(WorkingDayType)
  status!: WorkingDayType;
}

export class UpdateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  shortName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @IsOptional()
  @IsString()
  reportFooter?: string;
}

