import { Module } from '@nestjs/common';
import {
  createSignicatConfig,
  SIGNICAT_CONFIG,
} from '../../../config/signicat.config.js';
import { SessionModule } from '../session.module.js';
import { AuthTransactionRepository } from './auth-transaction.repository.js';
import { AuthTransactionService } from './auth-transaction.service.js';
import { MitidController } from './mitid.controller.js';
import { MitidService } from './mitid.service.js';
import { MitidApplicantRepository } from './mitid-applicant.repository.js';
import { MitidAuditRepository } from './mitid-audit.repository.js';
import { SignicatProvider } from './signicat.provider.js';

@Module({
  imports: [SessionModule],
  controllers: [MitidController],
  providers: [
    MitidService,
    AuthTransactionService,
    AuthTransactionRepository,
    MitidApplicantRepository,
    MitidAuditRepository,
    SignicatProvider,
    { provide: SIGNICAT_CONFIG, useFactory: createSignicatConfig },
  ],
  exports: [SIGNICAT_CONFIG],
})
export class MitidModule {}
