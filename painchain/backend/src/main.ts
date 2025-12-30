import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable CORS
  app.enableCors();

  // Serve static frontend files
  const frontendPath = join(__dirname, '..', '..', 'frontend', 'dist');
  app.useStaticAssets(frontendPath);

  // Fallback to index.html for client-side routing (SPA)
  app.use((req, res, next) => {
    // If request is for API, continue to next handler
    if (req.path.startsWith('/api')) {
      return next();
    }
    // Otherwise, serve index.html for SPA routing
    if (!req.path.includes('.')) {
      res.sendFile(join(frontendPath, 'index.html'));
    } else {
      next();
    }
  });

  const port = process.env.PORT || 8000;
  await app.listen(port);

  console.log(`🚀 PainChain running on http://localhost:${port}`);
  console.log(`📡 API: http://localhost:${port}/api`);
  console.log(`🎨 Frontend: http://localhost:${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
