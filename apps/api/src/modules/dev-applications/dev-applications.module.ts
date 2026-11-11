import { Module } from '@nestjs/common';
import { DevApplicationsController } from './dev-applications.controller.js';
import { DevApplicationsRepository } from './dev-applications.repository.js';
import { DevApplicationsService } from './dev-applications.service.js';

@Module({
  controllers: [DevApplicationsController],
  providers: [DevApplicationsRepository, DevApplicationsService],
})
export class DevApplicationsModule {}
