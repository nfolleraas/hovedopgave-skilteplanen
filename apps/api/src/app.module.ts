import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AreasModule } from './modules/areas/areas.module.js';
import { DevApplicationsModule } from './modules/dev-applications/dev-applications.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    PrismaModule,
    AreasModule,
    // Test-only endpoints for listing and creating applications.
    ...(process.env.NODE_ENV === 'production' ? [] : [DevApplicationsModule]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
