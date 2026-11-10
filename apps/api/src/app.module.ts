import { Module } from '@nestjs/common';
import { DocumentsModule } from './modules/documents/documents.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { R2Module } from './modules/s3/r2.module.js';
import { SignPlansModule } from './modules/sign-plans/sign-plans.module.js';

@Module({
  imports: [PrismaModule, R2Module, DocumentsModule, HealthModule, SignPlansModule],
})
export class AppModule {}
