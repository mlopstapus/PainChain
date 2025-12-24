import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { json } from 'express'
import { join } from 'path'
import * as express from 'express'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body for webhook signature verification
  })

  // Raw body preservation for webhooks (must come before global prefix)
  app.use(
    json({
      verify: (req: any, res, buf) => {
        req.rawBody = buf
      },
    })
  )

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  )

  // All API routes prefixed with /api
  app.setGlobalPrefix('api')

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('PainChain API')
    .setDescription('Unified Change Management & Incident Investigation API')
    .setVersion('2.0')
    .addTag('changes', 'Change events timeline')
    .addTag('connections', 'Connector connections management')
    .addTag('connectors', 'Connector metadata and types')
    .addTag('teams', 'Team management')
    .addTag('webhooks', 'Webhook receivers')
    .addTag('events', 'Event ingestion')
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  // Serve frontend static files (if build exists)
  const frontendPath = process.env.NODE_ENV === 'production'
    ? join(__dirname, '../../../frontend/dist')  // In Docker: /app/apps/backend/dist -> /app/frontend/dist
    : join(__dirname, '../../frontend/dist')     // In dev: apps/backend/dist -> frontend/dist
  try {
    app.use(express.static(frontendPath))

    // SPA fallback for non-API routes
    app.use('*', (req: any, res: any, next: any) => {
      if (req.originalUrl.startsWith('/api')) {
        next()
      } else {
        res.sendFile(join(frontendPath, 'index.html'))
      }
    })
  } catch (error) {
    console.log('⚠️  Frontend build not found at', frontendPath)
    console.log('   Run: cd frontend && pnpm build')
  }

  const port = process.env.PORT || 8000
  await app.listen(port)

  console.log('🚀 PainChain running on http://localhost:' + port)
  console.log(`   ├─ API: http://localhost:${port}/api`)
  console.log(`   ├─ Docs: http://localhost:${port}/api/docs`)
  console.log(`   ├─ Frontend: http://localhost:${port}`)
  console.log(`   ├─ GitHub Webhooks: http://localhost:${port}/api/webhooks/github/:connectionId`)
  console.log(`   └─ GitLab Webhooks: http://localhost:${port}/api/webhooks/gitlab/:connectionId`)
}

bootstrap()
