import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { EventsService, ProcessorEvent, ProcessResult } from './events.service'

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async createEvent(@Body() event: ProcessorEvent): Promise<ProcessResult> {
    return this.eventsService.processEvent(event)
  }
}
