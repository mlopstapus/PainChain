import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
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
   * Get logo for a specific connector type
   * GET /api/integrations/types/:type/logo
   */
  @Get(':type/logo')
  async getLogo(@Param('type') type: string, @Res() res: Response) {
    const connectorType = await this.integrationTypesService.findOne(type);

    if (!connectorType || !connectorType.logo) {
      throw new NotFoundException('Logo not found');
    }

    // Parse base64 data (format: "data:image/png;base64,...")
    const matches = connectorType.logo.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new NotFoundException('Invalid logo format');
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.send(buffer);
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
