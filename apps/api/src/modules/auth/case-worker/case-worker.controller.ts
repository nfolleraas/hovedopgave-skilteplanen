import { Controller, Post } from '@nestjs/common';
import { Public } from '../decorators/public.decorator.js';
import { CaseWorkerService } from './case-worker.service.js';

@Controller('auth/case-worker')
export class CaseWorkerController {
  constructor(private readonly caseWorkerService: CaseWorkerService) {}

  @Public()
  @Post('fallback')
  fallback(): void {
    this.caseWorkerService.fallback();
  }
}
