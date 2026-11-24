import { Module } from '@nestjs/common';
import {
  createKeycloakConfig,
  KEYCLOAK_CONFIG,
} from '../../../config/keycloak.config.js';
import { SessionModule } from '../session.module.js';
import { KeycloakProvider } from './keycloak.provider.js';
import { MunicipalityController } from './municipality.controller.js';
import { MunicipalityService } from './municipality.service.js';
import { MunicipalityAuditRepository } from './municipality-audit.repository.js';
import { MunicipalityAuthTransactionRepository } from './municipality-auth-transaction.repository.js';
import { MunicipalityAuthTransactionService } from './municipality-auth-transaction.service.js';
import { MunicipalityCaseWorkerRepository } from './municipality-case-worker.repository.js';

@Module({
  imports: [SessionModule],
  controllers: [MunicipalityController],
  providers: [
    MunicipalityService,
    MunicipalityAuthTransactionService,
    MunicipalityAuthTransactionRepository,
    MunicipalityCaseWorkerRepository,
    MunicipalityAuditRepository,
    KeycloakProvider,
    { provide: KEYCLOAK_CONFIG, useFactory: createKeycloakConfig },
  ],
  exports: [KEYCLOAK_CONFIG],
})
export class MunicipalityModule {}
