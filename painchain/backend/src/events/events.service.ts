import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Event, Prisma } from '@prisma/client';

interface EventFilters {
  tenantId?: string;
  connector?: string;
  project?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.EventCreateInput): Promise<Event> {
    try {
      return await this.prisma.event.create({ data });
    } catch (error) {
      console.error('=== Caught error in create ===', {
        code: error.code,
        externalId: data.externalId,
        integrationId: data.integration?.connect?.id,
        meta: error.meta
      });

      // Check if this is a unique constraint violation on externalId
      // P2002 is Prisma's unique constraint violation error
      if (error.code === 'P2002') {
        console.error('=== P2002 error detected ===');
        console.error('=== Full meta ===', JSON.stringify(error.meta, null, 2));
        const target = error.meta?.target;
        console.error('=== Target ===', { target, isArray: Array.isArray(target), type: typeof target });

        // With PostgreSQL adapter, the constraint info is in driverAdapterError
        const driverError = error.meta?.driverAdapterError;
        const constraintFields = driverError?.cause?.constraint?.fields || target;
        console.error('=== Constraint fields ===', constraintFields);

        // Check if this is the integration_external_id constraint
        // Note: fields from driverAdapterError have quotes like '"externalId"'
        const isExternalIdConstraint =
          (Array.isArray(constraintFields) &&
           (constraintFields.includes('externalId') || constraintFields.includes('"externalId"'))) ||
          (typeof constraintFields === 'string' && constraintFields.includes('externalId'));
        console.error('=== isExternalIdConstraint ===', isExternalIdConstraint);

        if (isExternalIdConstraint && data.externalId) {
          this.logger.log(
            `Duplicate event detected: integrationId=${data.integration?.connect?.id}, externalId=${data.externalId}`
          );

          // Find and return existing event
          const existingEvent = await this.prisma.event.findFirst({
            where: {
              integrationId: data.integration?.connect?.id as string,
              externalId: data.externalId as string,
            },
          });

          if (existingEvent) {
            this.logger.log(`Found existing event, returning it: ${existingEvent.id}`);
            return existingEvent;
          } else {
            this.logger.warn(`Could not find existing event for integrationId=${data.integration?.connect?.id}, externalId=${data.externalId}`);
          }
        }
      }

      // Re-throw other errors
      throw error;
    }
  }

  async findAll(filters: EventFilters): Promise<Event[]> {
    const where: Prisma.EventWhereInput = {};

    if (filters.tenantId !== undefined) {
      where.tenantId = filters.tenantId;
    }

    if (filters.connector) {
      where.connector = filters.connector;
    }

    if (filters.project) {
      where.project = filters.project;
    }

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }

    return this.prisma.event.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    });
  }

  async findOne(id: string, tenantId?: string): Promise<Event | null> {
    return this.prisma.event.findFirst({
      where: {
        id,
        ...(tenantId !== undefined ? { tenantId } : {}),
      },
    });
  }
}
