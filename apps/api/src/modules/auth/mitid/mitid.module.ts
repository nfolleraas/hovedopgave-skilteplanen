import { Module } from '@nestjs/common';
import { MitidController } from './mitid.controller.js';
import { MitidService } from './mitid.service.js';

@Module({
  controllers: [MitidController],
  providers: [MitidService],
})
export class MitidModule {}
