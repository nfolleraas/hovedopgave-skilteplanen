import { Controller, Post } from '@nestjs/common';
import { CaseWorkerService } from './case-worker.service.js';

@Controller('auth/case-worker')
export class CaseWorkerController {
  constructor(private readonly caseWorkerService: CaseWorkerService) {}

  @Post('fallback')
  fallback(): void {
    this.caseWorkerService.fallback();
  }
}
