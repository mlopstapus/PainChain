import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'

export interface ProcessorEvent {
  // REQUIRED
  connectionId: number
  source: string // 'github', 'gitlab', 'kubernetes'
  eventType: string // 'PR', 'Commit', 'K8sDeployment'
  title: string
  timestamp: Date | string

  // OPTIONAL
  externalId?: string // For deduplication
  description?: string
  url?: string
  status?: string
  metadata?: Record<string, any>
  eventMetadata?: Record<string, any>
}

export interface ProcessResult {
  success: boolean
  eventId?: number
  duplicate?: boolean
  error?: string
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name)

  constructor(private prisma: PrismaService) {}

  async processEvent(event: ProcessorEvent): Promise<ProcessResult> {
    try {
      // 1. Validate required fields
      this.validateEvent(event)

      // 2. Check for duplicate (if externalId provided)
      if (event.externalId) {
        const existing = await this.prisma.changeEvent.findUnique({
          where: {
            connection_id_external_id: {
              connectionId: event.connectionId,
              externalId: event.externalId,
            },
          },
        })

        if (existing) {
          this.logger.debug(
            `Duplicate event detected: connectionId=${event.connectionId}, externalId=${event.externalId}`
          )
          return {
            success: true,
            duplicate: true,
            eventId: existing.id,
          }
        }
      }

      // 3. Write to database
      const timestamp =
        typeof event.timestamp === 'string'
          ? new Date(event.timestamp)
          : event.timestamp

      const changeEvent = await this.prisma.changeEvent.create({
        data: {
          connectionId: event.connectionId,
          externalId: event.externalId || null,
          source: event.source,
          eventType: event.eventType,
          title: event.title,
          description: event.description || null,
          timestamp,
          url: event.url || null,
          status: event.status || null,
          metadata: event.metadata || {},
          eventMetadata: event.eventMetadata || {},
        },
      })

      this.logger.log(
        `Event stored: id=${changeEvent.id}, type=${event.eventType}, source=${event.source}`
      )

      return {
        success: true,
        eventId: changeEvent.id,
        duplicate: false,
      }
    } catch (error) {
      this.logger.error('Failed to process event', error.stack)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  private validateEvent(event: ProcessorEvent): void {
    const requiredFields = ['connectionId', 'source', 'eventType', 'title', 'timestamp']
    const missing = requiredFields.filter((field) => !event[field])

    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing required fields: ${missing.join(', ')}`
      )
    }

    if (typeof event.connectionId !== 'number') {
      throw new BadRequestException('connectionId must be a number')
    }

    if (!event.timestamp) {
      throw new BadRequestException('timestamp is required')
    }
  }
}
