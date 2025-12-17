import { Global, Module } from '@nestjs/common';
import { HttpClientService } from './http-client.service';
import { ResilienceModule } from '../../resilience/resilience.module';
import { LoggerModule } from '../../../common/logger/logger.module';

/**
 * HTTP Client Module
 * 
 * Provides HTTP client với resilience features
 */
@Global()
@Module({
  imports: [ResilienceModule, LoggerModule],
  providers: [HttpClientService],
  exports: [HttpClientService],
})
export class HttpClientModule {}
