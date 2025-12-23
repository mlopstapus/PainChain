import { Module } from '@nestjs/common'
import { WebhooksController } from './webhooks.controller'
import { WebhookVerificationService } from './webhook-verification.service'
import { GitHubWebhookTransformer } from './transformers/github.transformer'
import { GitLabWebhookTransformer } from './transformers/gitlab.transformer'
import { EventsModule } from '../events/events.module'
import { DatabaseModule } from '../database/database.module'

@Module({
  imports: [EventsModule, DatabaseModule],
  controllers: [WebhooksController],
  providers: [
    WebhookVerificationService,
    GitHubWebhookTransformer,
    GitLabWebhookTransformer,
  ],
})
export class WebhooksModule {}
