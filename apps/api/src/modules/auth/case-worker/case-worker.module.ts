import { Module } from '@nestjs/common';
import { CaseWorkerController } from './case-worker.controller.js';
import { CaseWorkerService } from './case-worker.service.js';

@Module({
  controllers: [CaseWorkerController],
  providers: [CaseWorkerService],
})
export class CaseWorkerModule {}
