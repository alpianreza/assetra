import { Module } from '@nestjs/common';
import { ChecklistTemplatesController } from './templates.controller';
import { ChecklistTemplatesService } from './templates.service';
import { ChecklistSessionsController } from './sessions/sessions.controller';
import { ChecklistSessionsService } from './sessions/sessions.service';

@Module({
  controllers: [ChecklistTemplatesController, ChecklistSessionsController],
  providers: [ChecklistTemplatesService, ChecklistSessionsService],
  exports: [ChecklistTemplatesService, ChecklistSessionsService],
})
export class ChecklistModule {}
