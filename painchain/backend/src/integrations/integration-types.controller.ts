import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IntegrationTypesService } from './integration-types.service';
import { Prisma } from '@prisma/client';

@Controller('integrations/types')
export class IntegrationTypesController {
  constructor(
    private readonly integrationTypesService: IntegrationTypesService,
  ) {}

  /**
   * Register a new connector type (called by connectors on startup)
   * POST /api/integrations/types/register
   */
  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(@Body() registerDto: Prisma.ConnectorTypeCreateInput) {
    const connectorType =
      await this.integrationTypesService.register(registerDto);
    return {
      id: connectorType.id,
      displayName: connectorType.displayName,
      registered: true,
    };
  }

  /**
   * Get all registered connector types
   * GET /api/integrations/types
   */
  @Get()
  async findAll() {
    return this.integrationTypesService.findAll();
  }

  /**
   * Get configuration schema for a specific connector type
   * GET /api/integrations/types/:type/schema
   */
  @Get(':type/schema')
  async getSchema(@Param('type') type: string) {
    return this.integrationTypesService.getSchema(type);
  }

  /**
   * Get full details for a specific connector type
   * GET /api/integrations/types/:type
   */
  @Get(':type')
  async findOne(@Param('type') type: string) {
    return this.integrationTypesService.findOne(type);
  }
}
