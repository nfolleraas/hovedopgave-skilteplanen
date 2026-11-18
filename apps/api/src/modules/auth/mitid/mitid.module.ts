import { Module } from '@nestjs/common';
import {
  createSignicatConfig,
  SIGNICAT_CONFIG,
} from '../../../config/signicat.config.js';
import { AuthTransactionRepository } from './auth-transaction.repository.js';
import { AuthTransactionService } from './auth-transaction.service.js';
import { MitidController } from './mitid.controller.js';
import { MitidService } from './mitid.service.js';
import { SignicatProvider } from './signicat.provider.js';

@Module({
  controllers: [MitidController],
  providers: [
    MitidService,
    AuthTransactionService,
    AuthTransactionRepository,
    SignicatProvider,
    { provide: SIGNICAT_CONFIG, useFactory: createSignicatConfig },
  ],
  exports: [SIGNICAT_CONFIG],
})
export class MitidModule {}
