import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as crypto from 'crypto';
import { mkdirSync } from 'fs';
import { ComplianceService } from './compliance.service';
import { ChecklistExecutionService } from './checklist-execution.service';
import { ComplianceResultsService } from './compliance-results.service';
import { SubmitChecklistDto } from './compliance.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequireAnyPermissions, RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SanitizedUserDto } from '../auth/dto/user-response.dto';

const CHECKLIST_PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

@Controller('compliance')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ComplianceController {
  constructor(
    private readonly complianceService: ComplianceService,
    private readonly executionService: ChecklistExecutionService,
    private readonly resultsService: ComplianceResultsService,
  ) {}

  @Get()
  @RequireAnyPermissions('compliance.view', 'compliance.execute')
  async overview() {
    return { success: true, data: await this.complianceService.overview() };
  }

  @Get('inventory/:inventoryId/periods')
  @RequireAnyPermissions('compliance.view', 'compliance.execute')
  async periods(@Param('inventoryId', ParseIntPipe) inventoryId: number, @Query('ym') ym?: string) {
    return { success: true, data: await this.complianceService.inventoryPeriods(inventoryId, ym) };
  }

  @Get('inventory/:inventoryId/checklist')
  @RequirePermissions('compliance.execute')
  async buildExecution(
    @Param('inventoryId', ParseIntPipe) inventoryId: number,
    @Query('templateId', ParseIntPipe) templateId: number,
    @Query('periodKey') periodKey: string,
    @Query('sessionId') sessionId?: string,
  ) {
    const data = await this.executionService.buildExecution(inventoryId, templateId, periodKey, sessionId ? Number(sessionId) : null);
    return { success: true, data };
  }

  @Post('inventory/:inventoryId/checklist')
  @RequirePermissions('compliance.execute')
  @UseInterceptors(AnyFilesInterceptor({
    storage: diskStorage({
      destination: (_request, _file, callback) => {
        const directory = path.join(process.cwd(), 'storage', 'checklist');
        mkdirSync(directory, { recursive: true });
        callback(null, directory);
      },
      filename: (_request, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase() || '.jpg';
        callback(null, `${crypto.randomBytes(16).toString('hex')}${extension}`);
      },
    }),
    fileFilter: (_request, file, callback) => {
      if (!CHECKLIST_PHOTO_MIMES.includes(file.mimetype)) return callback(new Error('Foto checklist harus JPEG, PNG, atau WebP'), false);
      callback(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024, files: 100 },
  }))
  async submit(
    @Param('inventoryId', ParseIntPipe) inventoryId: number,
    @Query('templateId', ParseIntPipe) templateId: number,
    @Body() dto: SubmitChecklistDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: SanitizedUserDto,
  ) {
    const photoByQuestion = new Map<number, string>();
    for (const file of files ?? []) {
      const matched = /^photo_(\d+)$/.exec(file.fieldname);
      if (matched) photoByQuestion.set(Number(matched[1]), file.filename);
    }
    const answers = dto.answers.map(answer => ({ ...answer, photo: photoByQuestion.get(answer.questionId) }));
    const data = await this.executionService.submit(inventoryId, templateId, dto.periodKey, dto.sessionId ?? null, answers, user.id);
    return { success: true, data };
  }

  @Get('inventory/:inventoryId/history/:occurrenceId')
  @RequirePermissions('compliance.view')
  async result(@Param('inventoryId', ParseIntPipe) inventoryId: number, @Param('occurrenceId', ParseIntPipe) occurrenceId: number) {
    return { success: true, data: await this.resultsService.getResult(inventoryId, occurrenceId) };
  }

  @Get('inventory/:inventoryId/history')
  @RequirePermissions('compliance.view')
  async history(@Param('inventoryId', ParseIntPipe) inventoryId: number) {
    return { success: true, data: await this.complianceService.history(inventoryId) };
  }
}
