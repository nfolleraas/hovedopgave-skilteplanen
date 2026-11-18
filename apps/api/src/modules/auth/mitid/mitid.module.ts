import { Module } from '@nestjs/common';
import {
  createSignicatConfig,
  SIGNICAT_CONFIG,
} from '../../../config/signicat.config.js';
import { MitidController } from './mitid.controller.js';
import { MitidService } from './mitid.service.js';

@Module({
  controllers: [MitidController],
  providers: [
    MitidService,
    { provide: SIGNICAT_CONFIG, useFactory: createSignicatConfig },
  ],
  exports: [SIGNICAT_CONFIG],
})
export class MitidModule {}
