import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DatabaseModule } from './database/database.module'
import { ApiModule } from './api/api.module'
import { ConnectorsModule } from './connectors/connectors.module'
import { EventsModule } from './events/events.module'
import { WebhooksModule } from './webhooks/webhooks.module'

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database (Prisma)
    DatabaseModule,

    // Events (unified event ingestion)
    EventsModule,

    // Webhooks (GitHub/GitLab)
    WebhooksModule,

    // Connectors (auto-discovery)
    ConnectorsModule,

    // API Controllers
    ApiModule,
  ],
})
export class AppModule {}
