import { Module } from '@nestjs/common';
import { DevApplicationsController } from './dev-applications.controller.js';
import { DevApplicationsService } from './dev-applications.service.js';

@Module({
  controllers: [DevApplicationsController],
  providers: [DevApplicationsService],
})
export class DevApplicationsModule {}
