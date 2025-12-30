import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { IntegrationTypesController } from './integration-types.controller';
import { IntegrationTypesService } from './integration-types.service';

@Module({
  controllers: [IntegrationTypesController, IntegrationsController],
  providers: [IntegrationsService, IntegrationTypesService],
  exports: [IntegrationsService, IntegrationTypesService],
})
export class IntegrationsModule {}
