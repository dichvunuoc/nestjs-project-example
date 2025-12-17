import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HttpClientService } from './http-client.service';
import { ResilienceModule } from '../resilience/resilience.module';
import { LoggerModule } from '../../common/logger/logger.module';

/**
 * HTTP Client Module
 * 
 * Provides HTTP client với retry và circuit breaker
 * 
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [HttpClientModule],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    ResilienceModule, // For retry and circuit breaker
    LoggerModule, // For request logging
  ],
  providers: [HttpClientService],
  exports: [HttpClientService],
})
export class HttpClientModule {}
