import { Module } from '@nestjs/common';
import { CaseWorkersController } from './case-workers.controller.js';
import { CaseWorkersRepository } from './case-workers.repository.js';
import { CaseWorkersService } from './case-workers.service.js';

@Module({
  controllers: [CaseWorkersController],
  providers: [CaseWorkersRepository, CaseWorkersService],
  exports: [CaseWorkersService],
})
export class CaseWorkersModule {}
