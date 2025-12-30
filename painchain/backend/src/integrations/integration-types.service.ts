import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class IntegrationTypesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Register or update a connector type
   */
  async register(data: Prisma.ConnectorTypeCreateInput) {
    return this.prisma.connectorType.upsert({
      where: { id: data.id },
      update: {
        displayName: data.displayName,
        color: data.color,
        logo: data.logo,
        description: data.description,
        configSchema: data.configSchema,
      },
      create: data,
    });
  }

  /**
   * Get all registered connector types
   */
  async findAll() {
    return this.prisma.connectorType.findMany({
      select: {
        id: true,
        displayName: true,
        color: true,
        logo: true,
        description: true,
      },
      orderBy: {
        displayName: 'asc',
      },
    });
  }

  /**
   * Get connector type by ID with full schema
   */
  async findOne(id: string) {
    const connectorType = await this.prisma.connectorType.findUnique({
      where: { id },
    });

    if (!connectorType) {
      throw new NotFoundException(`Connector type '${id}' not found`);
    }

    return connectorType;
  }

  /**
   * Get only the config schema for a connector type
   */
  async getSchema(id: string) {
    const connectorType = await this.findOne(id);
    return {
      id: connectorType.id,
      displayName: connectorType.displayName,
      configSchema: connectorType.configSchema,
    };
  }
}
